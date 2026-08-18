import type { FilterQuery } from 'mongoose';
import { Company } from '../models/Company.js';
import { Application } from '../models/Application.js';
import { Interview } from '../models/Interview.js';
import { Job } from '../models/Job.js';
import { companyRepository } from '../repositories/index.js';
import { ApiError } from '../utils/ApiError.js';
import { searchFilter } from '../utils/search.js';
import { slugify } from '../utils/crypto.js';
import { logActivity } from './activityService.js';
import { targetingService } from './targetingService.js';
import { requireOwned } from '../utils/requireOwned.js';

type ListQuery = {
  page: number;
  limit: number;
  sort?: string;
  q?: string;
  targetStatus?: string;
  tier?: number;
};

export const companyService = {
  async list(userId: string, query: ListQuery) {
    const filter: FilterQuery<unknown> = {
      ...searchFilter(query.q, ['name', 'industry', 'location']),
      ...(query.targetStatus ? { targetStatus: query.targetStatus } : {}),
      ...(query.tier ? { tier: query.tier } : {}),
    };
    return companyRepository.list(userId, {
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      filter,
    });
  },

  async get(userId: string, id: string) {
    const company = await requireOwned(companyRepository, userId, id, 'Company');
    await targetingService.recomputeCompany(userId, id);
    return companyRepository.findById(userId, id);
  },

  async create(userId: string, data: Record<string, unknown>) {
    const company = await companyRepository.create({
      ...data,
      userId,
      slug: slugify(String(data.name ?? '')),
    });
    const id = String((company as { id?: string }).id);
    await logActivity(userId, 'created', 'company', id, `Added ${(data.name as string) ?? 'company'}`);
    await targetingService.recomputeCompany(userId, id);
    return companyRepository.findById(userId, id);
  },

  async update(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(companyRepository, userId, id, 'Company');
    if (data.name) data.slug = slugify(String(data.name));
    const updated = await companyRepository.update(userId, id, data);
    await targetingService.recomputeCompany(userId, id);
    return updated;
  },

  async remove(userId: string, id: string) {
    await requireOwned(companyRepository, userId, id, 'Company');
    await companyRepository.delete(userId, id);
  },

  async compare(userId: string, ids: string[]) {
    if (ids.length < 2 || ids.length > 4) {
      throw ApiError.badRequest('Select 2 to 4 companies to compare');
    }
    const rows = [];
    for (const id of ids) {
      const company = await this.get(userId, id);
      if (!company) throw ApiError.notFound('Company not found');
      const [jobs, applications, interviews] = await Promise.all([
        Job.find({ userId, companyId: id, deletedAt: null }).lean(),
        Application.find({ userId, companyId: id, deletedAt: null }).lean(),
        Interview.find({ userId, companyId: id, deletedAt: null }).lean(),
      ]);
      rows.push({
        company,
        roles: jobs.map((j) => j.title),
        salary: jobs[0]?.salaryRange,
        location: (company as { location?: string }).location,
        requiredSkills: [...new Set(jobs.flatMap((j) => (j.requiredSkills ?? []).map((s) => s.name)))],
        skillMatch: (company as { skillMatch?: number }).skillMatch,
        interviewCount: interviews.length,
        roundCount: interviews.length,
        applicationStatus: applications[0]?.status,
        targetScore: (company as { targetScore?: number }).targetScore,
        preparationProgress: (company as { interviewReadiness?: number }).interviewReadiness,
      });
    }
    return rows;
  },

  async targets(userId: string, query: ListQuery) {
    return this.list(userId, { ...query, sort: query.sort ?? '-tier' });
  },
};

export { Company };
