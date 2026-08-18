import { Types } from 'mongoose';
import { cache } from '../config/redis.js';
import { Application } from '../models/Application.js';
import { Company } from '../models/Company.js';
import { Interview } from '../models/Interview.js';
import { Question } from '../models/Question.js';
import { Skill } from '../models/Skill.js';
import { PreparationTopic } from '../models/PreparationTopic.js';
import { Activity } from '../models/Activity.js';
import { Job } from '../models/Job.js';
import { Recruiter } from '../models/Recruiter.js';
import { Note } from '../models/Note.js';
import { targetingService } from './targetingService.js';
import { preparationService } from './prepSkillService.js';
import { questionService } from './questionService.js';
import { searchFilter } from '../utils/search.js';

function oid(userId: string) {
  return new Types.ObjectId(userId);
}

function userMatch(userId: string) {
  return { userId: oid(userId), deletedAt: null };
}

export const dashboardService = {
  async get(userId: string) {
    const cacheKey = `dashboard:${userId}`;
    try {
      const cached = await cache.get(cacheKey);
      if (cached) return JSON.parse(cached) as unknown;
    } catch {
      // cache miss if Redis is briefly unavailable
    }

    const now = new Date();
    const uid = oid(userId);

    const [
      totalCompanies,
      targeting,
      totalApplications,
      pending,
      offers,
      rejections,
      interviewsScheduled,
      interviewsCompleted,
      upcomingInterviews,
      topics,
      skills,
      mostAsked,
      activities,
      nextTarget,
      weakAreas,
    ] = await Promise.all([
      Company.countDocuments(userMatch(userId)),
      Company.countDocuments({
        ...userMatch(userId),
        targetStatus: { $in: ['target', 'high_priority', 'medium_priority'] },
      }),
      Application.countDocuments(userMatch(userId)),
      Application.countDocuments({
        ...userMatch(userId),
        status: { $in: ['saved', 'applied', 'screening', 'recruiter_contacted'] },
      }),
      Application.countDocuments({ ...userMatch(userId), status: 'offer' }),
      Application.countDocuments({ ...userMatch(userId), status: 'rejected' }),
      Interview.countDocuments({ userId: uid, deletedAt: null, status: { $in: ['scheduled', 'rescheduled'] } }),
      Interview.countDocuments({ userId: uid, deletedAt: null, status: 'completed' }),
      Interview.find({
        userId: uid,
        deletedAt: null,
        scheduledAt: { $gte: now },
        status: { $in: ['scheduled', 'rescheduled'] },
      })
        .sort({ scheduledAt: 1 })
        .limit(5)
        .lean(),
      PreparationTopic.find({ userId: uid }).lean(),
      Skill.find({ userId: uid }).sort({ blendedScore: -1 }).lean(),
      questionService.mostAsked(userId),
      Activity.find({ userId: uid }).sort({ createdAt: -1 }).limit(10).lean(),
      targetingService.recommendedNextTarget(userId),
      preparationService.weakAreas(userId),
    ]);

    const prepProgress =
      topics.length === 0 ? 0 : Math.round(topics.reduce((s, t) => s + t.progress, 0) / topics.length);

    const techShare = await Question.aggregate([
      { $match: { userId: uid, deletedAt: null } },
      { $group: { _id: '$technology', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const techTotal = techShare.reduce((s, t) => s + t.count, 0) || 1;

    const strongest = skills[0];
    const weakest = [...skills].sort((a, b) => (a.blendedScore ?? 0) - (b.blendedScore ?? 0))[0];
    const highestMatch = await Company.find({ userId: uid, deletedAt: null })
      .sort({ skillMatch: -1 })
      .limit(3)
      .lean();

    const data = {
      kpis: {
        totalCompanies,
        targeting,
        totalApplications,
        pending,
        offers,
        rejections,
        interviewsScheduled,
        interviewsCompleted,
        upcoming: upcomingInterviews.length,
        prepProgress,
      },
      insights: {
        interviewsCompleted,
        strongestArea: strongest?.name ?? null,
        weakestArea: weakest?.name ?? null,
        mostAskedTechnology: techShare[0]?._id ?? null,
        highestSkillMatch: highestMatch.map((c) => c.name),
        recommendedNextTarget: nextTarget?.name ?? null,
        recommendedPreparation: weakAreas.slice(0, 5).map((w) => w.technology),
      },
      upcomingInterviews,
      recentActivity: activities,
      mostAskedQuestions: mostAsked,
      technologies: techShare.map((t) => ({
        technology: t._id,
        percent: Math.round((t.count / techTotal) * 100),
        count: t.count,
      })),
      weakAreas,
    };

    try {
      await cache.set(cacheKey, JSON.stringify(data), 60);
    } catch {
      // ignore cache write failures
    }
    return data;
  },
};

export const analyticsService = {
  async overview(userId: string) {
    const uid = oid(userId);
    const [
      applicationsOverTime,
      interviewsOverTime,
      successRows,
      applicationsByStatus,
      interviewsByCompany,
      questionsByTechnology,
      offersVsRejections,
      mostAsked,
    ] = await Promise.all([
      Application.aggregate([
        { $match: userMatch(userId) },
        { $group: { _id: { $dateTrunc: { date: '$createdAt', unit: 'week' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Interview.aggregate([
        { $match: { userId: uid, deletedAt: null } },
        { $group: { _id: { $dateTrunc: { date: '$scheduledAt', unit: 'week' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Interview.aggregate([
        { $match: { userId: uid, deletedAt: null, result: { $in: ['passed', 'failed'] } } },
        { $group: { _id: '$result', count: { $sum: 1 } } },
      ]),
      Application.aggregate([
        { $match: userMatch(userId) },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Interview.aggregate([
        { $match: { userId: uid, deletedAt: null } },
        { $group: { _id: '$companyId', count: { $sum: 1 } } },
        { $lookup: { from: 'companies', localField: '_id', foreignField: '_id', as: 'company' } },
        { $unwind: '$company' },
        { $project: { name: '$company.name', count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]),
      Question.aggregate([
        { $match: userMatch(userId) },
        { $group: { _id: '$technology', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Application.aggregate([
        { $match: { ...userMatch(userId), status: { $in: ['offer', 'rejected'] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      questionService.mostAsked(userId),
    ]);

    const passed = successRows.find((r) => r._id === 'passed')?.count ?? 0;
    const failed = successRows.find((r) => r._id === 'failed')?.count ?? 0;
    const total = passed + failed;

    return {
      applicationsOverTime,
      interviewsOverTime,
      successRate: { passed, failed, rate: total ? Math.round((passed / total) * 100) : 0 },
      applicationsByStatus,
      interviewsByCompany,
      questionsByTechnology,
      offersVsRejections,
      mostAsked,
    };
  },
};

function withId<T extends { _id?: unknown }>(docs: T[]) {
  return docs.map((doc) => {
    const raw = JSON.parse(JSON.stringify(doc)) as T & { _id?: string; id?: string };
    return { ...raw, id: raw.id ?? (raw._id ? String(raw._id) : undefined) };
  });
}

export const searchService = {
  async search(userId: string, q: string) {
    const [companies, jobs, interviews, questions, recruiters, notes, topics] = await Promise.all([
      Company.find({ userId, deletedAt: null, ...searchFilter(q, ['name', 'industry', 'notes']) }).limit(5).lean(),
      Job.find({ userId, deletedAt: null, ...searchFilter(q, ['title', 'description']) }).limit(5).lean(),
      Interview.find({ userId, deletedAt: null, ...searchFilter(q, ['roundName', 'notes', 'type']) }).limit(5).lean(),
      Question.find({ userId, deletedAt: null, ...searchFilter(q, ['prompt', 'notes', 'technology']) })
        .limit(8)
        .lean(),
      Recruiter.find({ userId, ...searchFilter(q, ['name', 'email', 'notes']) }).limit(5).lean(),
      Note.find({ userId, ...searchFilter(q, ['title', 'content', 'tags']) }).limit(5).lean(),
      PreparationTopic.find({ userId, ...searchFilter(q, ['name', 'slug', 'notes']) }).limit(5).lean(),
    ]);
    return {
      companies: withId(companies),
      jobs: withId(jobs),
      interviews: withId(interviews),
      questions: withId(questions),
      recruiters: withId(recruiters),
      notes: withId(notes),
      topics: withId(topics),
    };
  },
};

export const calendarService = {
  async range(userId: string, from: Date, to: Date) {
    const uid = oid(userId);
    const [interviews, followUps, prep, deadlines] = await Promise.all([
      Interview.find({ userId: uid, deletedAt: null, scheduledAt: { $gte: from, $lte: to } }).lean(),
      Recruiter.find({ userId: uid, nextFollowUpAt: { $gte: from, $lte: to } }).lean(),
      PreparationTopic.find({ userId: uid, nextReviewAt: { $gte: from, $lte: to } }).lean(),
      Job.find({ userId: uid, deletedAt: null, deadlineAt: { $gte: from, $lte: to } }).lean(),
    ]);
    return { interviews, followUps, preparation: prep, deadlines };
  },
};
