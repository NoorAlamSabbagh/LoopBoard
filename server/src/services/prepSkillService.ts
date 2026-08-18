import type { FilterQuery } from 'mongoose';
import { Company } from '../models/Company.js';
import { Job } from '../models/Job.js';
import { Question } from '../models/Question.js';
import { Skill } from '../models/Skill.js';
import { WEAK_TOPIC_THRESHOLDS } from '../constants/scores.js';
import {
  preparationTopicRepository,
  skillRepository,
  studyPlanRepository,
} from '../repositories/index.js';
import { requireOwned } from '../utils/requireOwned.js';
import { searchFilter } from '../utils/search.js';
import { logActivity } from './activityService.js';
import { skillEngine, targetingService } from './targetingService.js';

type ListQuery = { page: number; limit: number; sort?: string; q?: string };

export const preparationService = {
  async listTopics(userId: string, query: ListQuery) {
    const filter: FilterQuery<unknown> = searchFilter(query.q, ['name', 'slug', 'notes']);
    return preparationTopicRepository.list(userId, { ...query, filter });
  },
  async getTopic(userId: string, id: string) {
    return requireOwned(preparationTopicRepository, userId, id, 'Topic');
  },
  async createTopic(userId: string, data: Record<string, unknown>) {
    const topic = await preparationTopicRepository.create({ ...data, userId });
    const id = String((topic as { id?: string }).id);
    await logActivity(userId, 'created', 'preparation_topic', id, `Added topic ${String(data.name)}`);
    return topic;
  },
  async updateTopic(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(preparationTopicRepository, userId, id, 'Topic');
    const updated = await preparationTopicRepository.update(userId, id, data);
    await targetingService.recomputeAll(userId);
    return updated;
  },
  async removeTopic(userId: string, id: string) {
    await requireOwned(preparationTopicRepository, userId, id, 'Topic');
    await preparationTopicRepository.delete(userId, id);
  },
  async weakAreas(userId: string) {
    const [questions, skills] = await Promise.all([
      Question.find({ userId, deletedAt: null }).lean(),
      Skill.find({ userId }).lean(),
    ]);
    const byTech = new Map<string, { asked: number; weak: number; confidence: number }>();
    for (const q of questions) {
      const key = q.technology;
      const current = byTech.get(key) ?? { asked: 0, weak: 0, confidence: 0 };
      current.asked += 1;
      current.confidence += q.confidence;
      if (q.status === 'weak' || q.status === 'not_studied') current.weak += 1;
      byTech.set(key, current);
    }
    return [...byTech.entries()]
      .map(([technology, stats]) => {
        const avgConfidence = stats.asked ? stats.confidence / stats.asked : 0;
        const skill = skills.find((s) => s.name.toLowerCase() === technology.replaceAll('_', ' '));
        const blended = skill?.blendedScore ?? 40;
        const needsPrep =
          stats.asked >= WEAK_TOPIC_THRESHOLDS.minOccurrences &&
          (blended < WEAK_TOPIC_THRESHOLDS.blendedScoreBelow ||
            avgConfidence <= WEAK_TOPIC_THRESHOLDS.lowConfidenceMax);
        return {
          technology,
          questionsAsked: stats.asked,
          weakOrUnstudied: stats.weak,
          avgConfidence: Number(avgConfidence.toFixed(2)),
          blendedScore: blended,
          needsPreparation: needsPrep,
        };
      })
      .filter((row) => row.needsPreparation)
      .sort((a, b) => (a.blendedScore ?? 0) - (b.blendedScore ?? 0));
  },
  async listPlans(userId: string, query: ListQuery) {
    return studyPlanRepository.list(userId, query);
  },
  async createPlan(userId: string, data: Record<string, unknown>) {
    const plan = await studyPlanRepository.create({ ...data, userId });
    const id = String((plan as { id?: string }).id);
    await logActivity(userId, 'created', 'study_plan', id, `Created study plan ${String(data.title)}`);
    return plan;
  },
  async updatePlan(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(studyPlanRepository, userId, id, 'Study plan');
    return studyPlanRepository.update(userId, id, data);
  },
  async generate(userId: string, targetCompanyId?: string) {
    const company = targetCompanyId
      ? await Company.findOne({ _id: targetCompanyId, userId, deletedAt: null }).lean()
      : await targetingService.recommendedNextTarget(userId);
    const jobs = company
      ? await Job.find({ userId, companyId: company._id, deletedAt: null }).lean()
      : [];
    const weak = await this.weakAreas(userId);
    const required = [...new Set(jobs.flatMap((j) => (j.requiredSkills ?? []).map((s) => s.name)))];
    const items = [
      ...required.slice(0, 3).map((name) => ({
        title: name,
        priority: 1 as const,
        reason: company ? `Required by ${company.name}` : 'Required by current targets',
        done: false,
      })),
      ...weak.slice(0, 4).map((w, i) => ({
        title: w.technology,
        priority: (i < 2 ? 2 : 3) as 2 | 3,
        reason: `Weak topic — ${w.questionsAsked} questions, confidence ${w.avgConfidence}`,
        done: false,
      })),
    ].slice(0, 8);

    return studyPlanRepository.create({
      userId,
      title: company ? `Plan for ${company.name}` : 'Recommended preparation plan',
      status: 'active',
      source: 'generated',
      targetCompanyId: company?._id ? String(company._id) : undefined,
      items,
    });
  },
};

export const skillService = {
  async list(userId: string) {
    await skillEngine.deriveAll(userId);
    return skillRepository.list(userId, { page: 1, limit: 100, sort: '-blendedScore' });
  },
  async upsert(userId: string, data: { name: string; selfScore: number }) {
    const existing = await Skill.findOne({ userId, name: data.name });
    if (existing) {
      existing.selfScore = data.selfScore;
      await existing.save();
      await skillEngine.deriveAll(userId);
      return existing.toJSON();
    }
    const skill = await skillRepository.create({
      ...data,
      userId,
      blendedScore: data.selfScore,
      derivedScore: data.selfScore,
    });
    await logActivity(userId, 'created', 'skill', String((skill as { id?: string }).id), `Added skill ${data.name}`);
    return skill;
  },
  async update(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(skillRepository, userId, id, 'Skill');
    const updated = await skillRepository.update(userId, id, data);
    await skillEngine.deriveAll(userId);
    await targetingService.recomputeAll(userId);
    return updated;
  },
  async remove(userId: string, id: string) {
    await requireOwned(skillRepository, userId, id, 'Skill');
    await skillRepository.delete(userId, id);
  },
};
