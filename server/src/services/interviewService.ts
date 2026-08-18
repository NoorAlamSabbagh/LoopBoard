import type { FilterQuery } from 'mongoose';
import { Interview } from '../models/Interview.js';
import { Question } from '../models/Question.js';
import {
  applicationRepository,
  companyRepository,
  interviewPerformanceRepository,
  interviewRepository,
} from '../repositories/index.js';
import { requireOwned } from '../utils/requireOwned.js';
import { searchFilter } from '../utils/search.js';
import { logActivity } from './activityService.js';
import { skillEngine } from './targetingService.js';

type ListQuery = {
  page: number;
  limit: number;
  sort?: string;
  q?: string;
  companyId?: string;
  result?: string;
  type?: string;
};

export const interviewService = {
  async list(userId: string, query: ListQuery) {
    const filter: FilterQuery<unknown> = {
      ...searchFilter(query.q, ['roundName', 'interviewerName', 'notes']),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.result ? { result: query.result } : {}),
      ...(query.type ? { type: query.type } : {}),
    };
    return interviewRepository.list(userId, { page: query.page, limit: query.limit, sort: query.sort ?? 'scheduledAt', filter });
  },
  async upcoming(userId: string) {
    return interviewRepository.list(userId, {
      page: 1,
      limit: 20,
      sort: 'scheduledAt',
      filter: { scheduledAt: { $gte: new Date() }, status: { $in: ['scheduled', 'rescheduled'] } },
    });
  },
  async get(userId: string, id: string) {
    const interview = await requireOwned(interviewRepository, userId, id, 'Interview');
    const performance = await interviewPerformanceRepository.list(userId, {
      page: 1,
      limit: 1,
      filter: { interviewId: id },
    });
    return { interview, performance: performance.items[0] ?? null };
  },
  async create(userId: string, data: Record<string, unknown>) {
    await requireOwned(companyRepository, userId, String(data.companyId), 'Company');
    await requireOwned(applicationRepository, userId, String(data.applicationId), 'Application');
    const interview = await interviewRepository.create({ ...data, userId });
    const id = String((interview as { id?: string }).id);
    await logActivity(userId, 'created', 'interview', id, `Scheduled ${String(data.roundName ?? 'interview')}`);
    return interview;
  },
  async update(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(interviewRepository, userId, id, 'Interview');
    return interviewRepository.update(userId, id, data);
  },
  async remove(userId: string, id: string) {
    await requireOwned(interviewRepository, userId, id, 'Interview');
    await interviewRepository.delete(userId, id);
  },
  async savePerformance(userId: string, interviewId: string, data: Record<string, unknown>) {
    await requireOwned(interviewRepository, userId, interviewId, 'Interview');
    const existing = await interviewPerformanceRepository.list(userId, {
      page: 1,
      limit: 1,
      filter: { interviewId },
    });
    let performance;
    if (existing.items[0]) {
      performance = await interviewPerformanceRepository.update(
        userId,
        String((existing.items[0] as unknown as { id?: string }).id ?? ''),
        data,
      );
    } else {
      performance = await interviewPerformanceRepository.create({ ...data, userId, interviewId });
    }
    await interviewRepository.update(userId, interviewId, { status: 'completed' });
    await skillEngine.deriveAll(userId);
    const next = await this.prepareNext(userId, interviewId, data);
    return { performance, next };
  },
  async prepareNext(userId: string, interviewId: string, data: Record<string, unknown>) {
    const weak = (data.weakTopics as string[] | undefined) ?? [];
    const strong = (data.strongTopics as string[] | undefined) ?? [];
    const questions = await Question.find({
      userId,
      deletedAt: null,
      $or: [
        { technology: { $in: weak.map((t) => t.toLowerCase().replace(/\s+/g, '_')) } },
        { status: { $in: ['weak', 'not_studied', 'studying'] } },
      ],
    })
      .sort({ confidence: 1, status: 1 })
      .limit(8)
      .lean();

    return {
      weak,
      medium: [],
      strong,
      recommended: questions.slice(0, 5).map((q) => ({
        id: String(q._id),
        prompt: q.prompt,
        technology: q.technology,
      })),
    };
  },
};

export { Interview };
