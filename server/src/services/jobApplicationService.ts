import type { FilterQuery } from 'mongoose';
import { Company } from '../models/Company.js';
import { Job } from '../models/Job.js';
import { Interview } from '../models/Interview.js';
import {
  jobRepository,
  applicationRepository,
  companyRepository,
  interviewRepository,
} from '../repositories/index.js';
import { searchFilter } from '../utils/search.js';
import { requireOwned } from '../utils/requireOwned.js';
import { logActivity } from './activityService.js';
import { targetingService } from './targetingService.js';
import { APPLICATION_STATUS_TO_KANBAN } from '../constants/enums.js';
import type { ApplicationStatus } from '../constants/enums.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify } from '../utils/crypto.js';

type ListQuery = { page: number; limit: number; sort?: string; q?: string; companyId?: string; status?: string };

async function enrichApplications(userId: string, items: Record<string, unknown>[]) {
  if (!items.length) return [];
  const companyIds = [...new Set(items.map((i) => String(i.companyId || '')).filter(Boolean))];
  const jobIds = [...new Set(items.map((i) => String(i.jobId || '')).filter(Boolean))];
  const appIds = items.map((i) => String(i.id || (i as { _id?: string })._id || ''));

  const [companies, jobs, interviews] = await Promise.all([
    Company.find({ _id: { $in: companyIds }, userId, deletedAt: null })
      .select('name logoUrl tier targetStatus industry location')
      .lean(),
    Job.find({ _id: { $in: jobIds }, userId, deletedAt: null })
      .select('title location workMode employmentType')
      .lean(),
    Interview.find({ applicationId: { $in: appIds }, userId, deletedAt: null })
      .sort({ scheduledAt: 1 })
      .lean(),
  ]);

  const companyMap = new Map(companies.map((c) => [String(c._id), c]));
  const jobMap = new Map(jobs.map((j) => [String(j._id), j]));
  const interviewMap = new Map<string, typeof interviews>();
  for (const inv of interviews) {
    const aid = String(inv.applicationId);
    if (!interviewMap.has(aid)) interviewMap.set(aid, []);
    interviewMap.get(aid)!.push(inv);
  }

  const now = new Date();
  return items.map((app) => {
    const cid = String(app.companyId || '');
    const jid = String(app.jobId || '');
    const aid = String(app.id || (app as { _id?: string })._id || '');
    const company = companyMap.get(cid);
    const job = jobMap.get(jid);
    const appInterviews = interviewMap.get(aid) ?? [];

    const upcoming = appInterviews.find(
      (inv) => new Date(inv.scheduledAt) >= now && ['scheduled', 'rescheduled'].includes(inv.status),
    );
    const latest = appInterviews.length > 0 ? appInterviews[appInterviews.length - 1] : null;

    return {
      ...app,
      company: company
        ? {
            id: String(company._id),
            name: company.name,
            logoUrl: company.logoUrl,
            tier: company.tier,
            targetStatus: company.targetStatus,
          }
        : undefined,
      companyName: company?.name || '',
      job: job
        ? {
            id: String(job._id),
            title: job.title,
            location: job.location,
            workMode: job.workMode,
          }
        : undefined,
      interviewsCount: appInterviews.length,
      upcomingInterview: upcoming
        ? {
            id: String(upcoming._id),
            roundName: upcoming.roundName,
            type: upcoming.type,
            scheduledAt: upcoming.scheduledAt,
            status: upcoming.status,
            meetingLink: upcoming.meetingLink,
          }
        : null,
      latestInterview: latest
        ? {
            id: String(latest._id),
            roundName: latest.roundName,
            type: latest.type,
            scheduledAt: latest.scheduledAt,
            status: latest.status,
            result: latest.result,
          }
        : null,
    };
  });
}

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
    let matchingCompanyIds: string[] = [];
    if (query.q) {
      const matched = await Company.find({
        userId,
        deletedAt: null,
        name: { $regex: query.q, $options: 'i' },
      })
        .select('_id')
        .lean();
      matchingCompanyIds = matched.map((c) => String(c._id));
    }

    const baseSearch = searchFilter(query.q, ['title', 'source', 'notes', 'location']);
    const filter: FilterQuery<unknown> = {
      ...(matchingCompanyIds.length > 0
        ? {
            $or: [...(baseSearch.$or || []), { companyId: { $in: matchingCompanyIds } }],
          }
        : baseSearch),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const result = await applicationRepository.list(userId, {
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      filter,
    });
    const enriched = await enrichApplications(userId, result.items as unknown as Record<string, unknown>[]);
    return { items: enriched, meta: result.meta };
  },

  async board(userId: string) {
    const { items } = await applicationRepository.list(userId, { page: 1, limit: 500, sort: '-updatedAt' });
    const enriched = await enrichApplications(userId, items as unknown as Record<string, unknown>[]);
    const columns: Record<string, unknown[]> = {
      saved: [],
      applied: [],
      screening: [],
      interview: [],
      offer: [],
      rejected: [],
    };
    for (const item of enriched) {
      const status = (item as unknown as { status: ApplicationStatus }).status;
      const col = APPLICATION_STATUS_TO_KANBAN[status];
      if (col) columns[col]?.push(item);
    }
    return columns;
  },

  async get(userId: string, id: string) {
    const app = await requireOwned(applicationRepository, userId, id, 'Application');
    const [enriched] = await enrichApplications(userId, [app as unknown as Record<string, unknown>]);
    return enriched ?? app;
  },

  async create(userId: string, data: Record<string, unknown>) {
    let companyId = data.companyId ? String(data.companyId).trim() : '';
    const companyName = typeof data.companyName === 'string' ? data.companyName.trim() : '';

    if (!companyId && companyName) {
      const escaped = companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let company = await Company.findOne({
        userId,
        deletedAt: null,
        name: { $regex: new RegExp(`^${escaped}$`, 'i') },
      });

      if (!company) {
        const tier = Number(data.companyTier) || 2;
        const targetStatus = (data.status as string) === 'saved' ? 'target' : 'applied';
        company = await Company.create({
          userId,
          name: companyName,
          slug: slugify(companyName),
          targetStatus,
          tier,
          priority: 3,
        });
        await logActivity(userId, 'created', 'company', String(company._id), `Added company ${companyName}`);
      }
      companyId = String(company._id);
    }

    if (!companyId) {
      throw ApiError.badRequest('Company is required');
    }

    await requireOwned(companyRepository, userId, companyId, 'Company');

    // Handle Job
    let jobId = data.jobId ? String(data.jobId).trim() : '';
    const title = String(data.title ?? '').trim();
    if (!jobId && title) {
      const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let job = await Job.findOne({
        userId,
        companyId,
        deletedAt: null,
        title: { $regex: new RegExp(`^${escapedTitle}$`, 'i') },
      });
      if (!job) {
        job = await Job.create({
          userId,
          companyId,
          title,
          location: (data.location as string) || '',
          workMode: (data.workMode as string) || 'hybrid',
        });
      }
      jobId = String(job._id);
    } else if (jobId) {
      await requireOwned(jobRepository, userId, jobId, 'Job');
    }

    const appStatus = (data.status as string) || 'applied';
    const appliedDate = data.appliedAt ? new Date(String(data.appliedAt)) : new Date();

    const timelineEntries: Array<{ stage: string; date: Date; title: string; notes?: string }> = [
      {
        stage: 'applied',
        date: appliedDate,
        title: 'Application Submitted',
        notes: (data.source as string) ? `Applied via ${String(data.source)}` : '',
      },
    ];

    if (data.recruiterCalledAt) {
      timelineEntries.push({
        stage: 'recruiter_call',
        date: new Date(String(data.recruiterCalledAt)),
        title: 'Recruiter Contact / Screening Call',
      });
    }

    if (data.interviewScheduledAt || data.scheduleInterview) {
      const interviewDate = data.interviewScheduledAt
        ? new Date(String(data.interviewScheduledAt))
        : new Date(String((data.scheduleInterview as Record<string, unknown>).scheduledAt));
      timelineEntries.push({
        stage: 'interview_scheduled',
        date: interviewDate,
        title: `Interview Scheduled (${String((data.scheduleInterview as Record<string, unknown>)?.roundName || 'Round 1')})`,
      });
    }

    if (data.selectedAt) {
      timelineEntries.push({
        stage: 'selected_further_round',
        date: new Date(String(data.selectedAt)),
        title: 'Selected for Next Round',
      });
    }

    if (data.rejectedAt) {
      timelineEntries.push({
        stage: 'rejected',
        date: new Date(String(data.rejectedAt)),
        title: 'Application Rejected',
      });
    }

    if (data.ignoredAt) {
      timelineEntries.push({
        stage: 'ignored',
        date: new Date(String(data.ignoredAt)),
        title: 'Marked as Ignored / No Response',
      });
    }

    const appData: Record<string, unknown> = {
      ...data,
      userId,
      companyId,
      jobId: jobId || null,
      status: appStatus,
      appliedAt: appliedDate,
      recruiterCalledAt: data.recruiterCalledAt ? new Date(String(data.recruiterCalledAt)) : null,
      interviewScheduledAt: data.interviewScheduledAt
        ? new Date(String(data.interviewScheduledAt))
        : data.scheduleInterview
          ? new Date(String((data.scheduleInterview as Record<string, unknown>).scheduledAt))
          : null,
      selectedAt: data.selectedAt ? new Date(String(data.selectedAt)) : null,
      rejectedAt: data.rejectedAt ? new Date(String(data.rejectedAt)) : null,
      ignoredAt: data.ignoredAt ? new Date(String(data.ignoredAt)) : null,
      timeline: timelineEntries,
    };
    delete appData.companyName;
    delete appData.companyTier;
    delete appData.scheduleInterview;

    const app = await applicationRepository.create(appData);
    const id = String((app as { id?: string }).id);
    await logActivity(userId, 'created', 'application', id, `Created application ${title}`);

    // If an interview was submitted along with application
    if (data.scheduleInterview && typeof data.scheduleInterview === 'object') {
      const interviewInput = data.scheduleInterview as Record<string, unknown>;
      if (interviewInput.roundName && interviewInput.scheduledAt) {
        await interviewRepository.create({
          userId,
          applicationId: id,
          companyId,
          jobId: jobId || undefined,
          roundName: interviewInput.roundName,
          type: interviewInput.type || 'technical',
          scheduledAt: new Date(String(interviewInput.scheduledAt)),
          status: interviewInput.status || 'scheduled',
          result: interviewInput.result || 'pending',
          meetingLink: interviewInput.meetingLink || '',
          interviewerName: interviewInput.interviewerName || '',
          difficulty: interviewInput.difficulty,
          notes: interviewInput.notes || '',
        });
        await logActivity(
          userId,
          'created',
          'interview',
          id,
          `Scheduled ${String(interviewInput.roundName)} for ${title}`,
        );
      }
    }

    // Auto update company target status if needed
    if (['interviewing', 'interview_scheduled'].includes(appStatus)) {
      await Company.updateOne({ _id: companyId, userId }, { targetStatus: 'interviewing' });
    } else if (appStatus === 'applied') {
      await Company.updateOne(
        {
          _id: companyId,
          userId,
          targetStatus: { $in: ['target', 'high_priority', 'medium_priority', 'low_priority'] },
        },
        { targetStatus: 'applied' },
      );
    }

    // Recalculate target score for the company
    await targetingService.recomputeCompany(userId, companyId).catch(() => {});

    const [enriched] = await enrichApplications(userId, [app as unknown as Record<string, unknown>]);
    return enriched ?? app;
  },

  async update(userId: string, id: string, data: Record<string, unknown>) {
    const existing = (await requireOwned(applicationRepository, userId, id, 'Application')) as Record<string, unknown>;
    const updates: Record<string, unknown> = { ...data };

    if (data.status) {
      await logActivity(userId, 'updated', 'application', id, `Application status → ${String(data.status)}`);
      const statusStr = String(data.status);
      const companyId = String(existing.companyId);
      const now = new Date();
      let stageTitle = '';
      let stageKey = '';

      if (['recruiter_contacted', 'screening'].includes(statusStr)) {
        stageKey = 'recruiter_call';
        stageTitle = 'Recruiter Call / Screening';
        if (!existing.recruiterCalledAt) updates.recruiterCalledAt = now;
      } else if (['interview_scheduled', 'interviewing'].includes(statusStr)) {
        stageKey = 'interview_scheduled';
        stageTitle = 'Interview Scheduled / Interviewing';
        if (!existing.interviewScheduledAt) updates.interviewScheduledAt = now;
      } else if (statusStr === 'offer') {
        stageKey = 'selected_further_round';
        stageTitle = 'Selected for Offer / Final Round';
        if (!existing.selectedAt) updates.selectedAt = now;
      } else if (statusStr === 'rejected') {
        stageKey = 'rejected';
        stageTitle = 'Application Rejected';
        if (!existing.rejectedAt) updates.rejectedAt = now;
      } else if (['withdrawn', 'closed'].includes(statusStr)) {
        stageKey = 'ignored';
        stageTitle = 'Application Withdrawn / Closed / Ignored';
        if (!existing.ignoredAt) updates.ignoredAt = now;
      }

      if (stageKey) {
        const existingTimeline = (existing.timeline as Array<{ stage: string; date: Date; title: string; notes?: string }>) || [];
        updates.timeline = [
          ...existingTimeline,
          {
            stage: stageKey,
            date: now,
            title: stageTitle,
            notes: (data.notes as string) || '',
          },
        ];
      }

      if (['interviewing', 'interview_scheduled'].includes(statusStr)) {
        await Company.updateOne({ _id: companyId, userId }, { targetStatus: 'interviewing' });
      } else if (statusStr === 'offer') {
        await Company.updateOne({ _id: companyId, userId }, { targetStatus: 'offer' });
      }
      await targetingService.recomputeCompany(userId, companyId).catch(() => {});
    }

    const updated = await applicationRepository.update(userId, id, updates);
    const [enriched] = await enrichApplications(userId, [updated as unknown as Record<string, unknown>]);
    return enriched ?? updated;
  },

  async addTimelineEvent(
    userId: string,
    id: string,
    event: { stage: string; date?: Date; title: string; notes?: string },
  ) {
    const existing = (await requireOwned(applicationRepository, userId, id, 'Application')) as Record<string, unknown>;
    const existingTimeline = (existing.timeline as Array<{ stage: string; date: Date; title: string; notes?: string }>) || [];
    const eventDate = event.date ? new Date(event.date) : new Date();

    const updates: Record<string, unknown> = {
      timeline: [
        ...existingTimeline,
        {
          stage: event.stage,
          date: eventDate,
          title: event.title,
          notes: event.notes || '',
        },
      ],
    };

    if (event.stage === 'applied') updates.appliedAt = eventDate;
    if (event.stage === 'recruiter_call') updates.recruiterCalledAt = eventDate;
    if (event.stage === 'interview_scheduled') updates.interviewScheduledAt = eventDate;
    if (event.stage === 'selected_further_round') updates.selectedAt = eventDate;
    if (event.stage === 'rejected') updates.rejectedAt = eventDate;
    if (event.stage === 'ignored') updates.ignoredAt = eventDate;

    const updated = await applicationRepository.update(userId, id, updates);
    const [enriched] = await enrichApplications(userId, [updated as unknown as Record<string, unknown>]);
    return enriched ?? updated;
  },

  async remove(userId: string, id: string) {
    await requireOwned(applicationRepository, userId, id, 'Application');
    await applicationRepository.delete(userId, id);
  },
};
