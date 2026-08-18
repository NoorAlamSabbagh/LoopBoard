import type { FilterQuery } from 'mongoose';
import { jobRepository, applicationRepository, companyRepository } from '../repositories/index.js';
import { searchFilter } from '../utils/search.js';
import { requireOwned } from '../utils/requireOwned.js';
import { logActivity } from './activityService.js';
import { APPLICATION_STATUS_TO_KANBAN } from '../constants/enums.js';
import type { ApplicationStatus } from '../constants/enums.js';

type ListQuery = { page: number; limit: number; sort?: string; q?: string; companyId?: string; status?: string };

export const jobService = {
  async list(userId: string, query: ListQuery) {
    const filter: FilterQuery<unknown> = {
      ...searchFilter(query.q, ['title', 'location', 'description']),
      ...(query.companyId ? { companyId: query.companyId } : {}),
    };
    return jobRepository.list(userId, { page: query.page, limit: query.limit, sort: query.sort, filter });
  },
  async get(userId: string, id: string) {
    return requireOwned(jobRepository, userId, id, 'Job');
  },
  async create(userId: string, data: Record<string, unknown>) {
    await requireOwned(companyRepository, userId, String(data.companyId), 'Company');
    const job = await jobRepository.create({ ...data, userId });
    const id = String((job as { id?: string }).id);
    await logActivity(userId, 'created', 'job', id, `Added job ${(data.title as string) ?? ''}`);
    return job;
  },
  async update(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(jobRepository, userId, id, 'Job');
    return jobRepository.update(userId, id, data);
  },
  async remove(userId: string, id: string) {
    await requireOwned(jobRepository, userId, id, 'Job');
    await jobRepository.delete(userId, id);
  },
};

export const applicationService = {
  async list(userId: string, query: ListQuery & { location?: string }) {
    const filter: FilterQuery<unknown> = {
      ...searchFilter(query.q, ['title', 'source', 'notes']),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    return applicationRepository.list(userId, { page: query.page, limit: query.limit, sort: query.sort, filter });
  },
  async board(userId: string) {
    const { items } = await applicationRepository.list(userId, { page: 1, limit: 500, sort: '-updatedAt' });
    const columns: Record<string, unknown[]> = {
      saved: [],
      applied: [],
      screening: [],
      interview: [],
      offer: [],
      rejected: [],
    };
    for (const item of items) {
      const status = (item as { status: ApplicationStatus }).status;
      const col = APPLICATION_STATUS_TO_KANBAN[status];
      if (col) columns[col]?.push(item);
    }
    return columns;
  },
  async get(userId: string, id: string) {
    return requireOwned(applicationRepository, userId, id, 'Application');
  },
  async create(userId: string, data: Record<string, unknown>) {
    await requireOwned(companyRepository, userId, String(data.companyId), 'Company');
    if (data.jobId) await requireOwned(jobRepository, userId, String(data.jobId), 'Job');
    const app = await applicationRepository.create({ ...data, userId });
    const id = String((app as { id?: string }).id);
    await logActivity(userId, 'created', 'application', id, `Created application ${(data.title as string) ?? ''}`);
    return app;
  },
  async update(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(applicationRepository, userId, id, 'Application');
    const updated = await applicationRepository.update(userId, id, data);
    if (data.status) {
      await logActivity(userId, 'updated', 'application', id, `Application status → ${String(data.status)}`);
    }
    return updated;
  },
  async remove(userId: string, id: string) {
    await requireOwned(applicationRepository, userId, id, 'Application');
    await applicationRepository.delete(userId, id);
  },
};
