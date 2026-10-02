import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/http.js';
import { companyService } from '../services/companyService.js';
import { applicationService, jobService } from '../services/jobApplicationService.js';
import { interviewService } from '../services/interviewService.js';
import { questionService } from '../services/questionService.js';
import { preparationService, skillService } from '../services/prepSkillService.js';
import {
  noteService,
  notificationService,
  recruiterService,
  resumeService,
} from '../services/peopleDocsService.js';
import { analyticsService, calendarService, dashboardService, searchService } from '../services/dashboardService.js';

const uid = (req: Request) => req.user!.id;

export const companyController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await companyService.list(uid(req), req.query as never);
    res.json(success('Companies fetched', result.items, result.meta));
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Company fetched', await companyService.get(uid(req), req.params.id as string)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Company created successfully', await companyService.create(uid(req), req.body)));
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Company updated', await companyService.update(uid(req), req.params.id as string, req.body)));
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await companyService.remove(uid(req), req.params.id as string);
    res.json(success('Company deleted', null));
  }),
  seedTargets: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Target companies loaded', await companyService.seedTargets(uid(req))));
  }),
  compare: asyncHandler(async (req: Request, res: Response) => {
    const ids = String(req.query.ids)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    res.json(success('Comparison ready', await companyService.compare(uid(req), ids)));
  }),
};

export const jobController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await jobService.list(uid(req), req.query as never);
    res.json(success('Jobs fetched', result.items, result.meta));
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Job fetched', await jobService.get(uid(req), req.params.id as string)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Job created successfully', await jobService.create(uid(req), req.body)));
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Job updated', await jobService.update(uid(req), req.params.id as string, req.body)));
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await jobService.remove(uid(req), req.params.id as string);
    res.json(success('Job deleted', null));
  }),
};

export const applicationController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await applicationService.list(uid(req), req.query as never);
    res.json(success('Applications fetched', result.items, result.meta));
  }),
  board: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Kanban fetched', await applicationService.board(uid(req))));
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Application fetched', await applicationService.get(uid(req), req.params.id as string)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Application created successfully', await applicationService.create(uid(req), req.body)));
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Application updated', await applicationService.update(uid(req), req.params.id as string, req.body)));
  }),
  status: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Status updated', await applicationService.update(uid(req), req.params.id as string, req.body)));
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await applicationService.remove(uid(req), req.params.id as string);
    res.json(success('Application deleted', null));
  }),
  addTimeline: asyncHandler(async (req: Request, res: Response) => {
    res.json(
      success(
        'Timeline event added',
        await applicationService.addTimelineEvent(uid(req), req.params.id as string, req.body),
      ),
    );
  }),
};

export const interviewController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await interviewService.list(uid(req), req.query as never);
    res.json(success('Interviews fetched', result.items, result.meta));
  }),
  upcoming: asyncHandler(async (req: Request, res: Response) => {
    const result = await interviewService.upcoming(uid(req));
    res.json(success('Upcoming interviews fetched', result.items, result.meta));
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Interview fetched', await interviewService.get(uid(req), req.params.id as string)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Interview created successfully', await interviewService.create(uid(req), req.body)));
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Interview updated', await interviewService.update(uid(req), req.params.id as string, req.body)));
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await interviewService.remove(uid(req), req.params.id as string);
    res.json(success('Interview deleted', null));
  }),
  performance: asyncHandler(async (req: Request, res: Response) => {
    res.json(
      success('Performance saved', await interviewService.savePerformance(uid(req), req.params.id as string, req.body)),
    );
  }),
};

export const questionController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await questionService.list(uid(req), req.query as never);
    res.json(success('Questions fetched', result.items, result.meta));
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Question fetched', await questionService.get(uid(req), req.params.id as string)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Question saved successfully', await questionService.create(uid(req), req.body)));
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Question updated', await questionService.update(uid(req), req.params.id as string, req.body)));
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await questionService.remove(uid(req), req.params.id as string);
    res.json(success('Question deleted', null));
  }),
  mostAsked: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Most asked questions', await questionService.mostAsked(uid(req))));
  }),
};

export const preparationController = {
  topics: asyncHandler(async (req: Request, res: Response) => {
    const result = await preparationService.listTopics(uid(req), req.query as never);
    res.json(success('Topics fetched', result.items, result.meta));
  }),
  getTopic: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Topic fetched', await preparationService.getTopic(uid(req), req.params.id as string)));
  }),
  createTopic: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Topic created', await preparationService.createTopic(uid(req), req.body)));
  }),
  listStacks: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Stacks fetched', await preparationService.listStacks(uid(req))));
  }),
  createStack: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Stack created', await preparationService.createStack(uid(req), req.body)));
  }),
  updateTopic: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Topic updated', await preparationService.updateTopic(uid(req), req.params.id as string, req.body)));
  }),
  removeTopic: asyncHandler(async (req: Request, res: Response) => {
    await preparationService.removeTopic(uid(req), req.params.id as string);
    res.json(success('Topic deleted', null));
  }),
  weak: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Weak areas fetched', await preparationService.weakAreas(uid(req))));
  }),
  plans: asyncHandler(async (req: Request, res: Response) => {
    const result = await preparationService.listPlans(uid(req), req.query as never);
    res.json(success('Study plans fetched', result.items, result.meta));
  }),
  createPlan: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Study plan created', await preparationService.createPlan(uid(req), req.body)));
  }),
  updatePlan: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Study plan updated', await preparationService.updatePlan(uid(req), req.params.id as string, req.body)));
  }),
  generate: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Study plan generated', await preparationService.generate(uid(req), req.body.targetCompanyId)));
  }),
  seedStackNotes: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Stack notes loaded', await preparationService.seedStackNotes(uid(req))));
  }),
  importFolderNotes: asyncHandler(async (req: Request, res: Response) => {
    const stack = (req.body as { stack?: string } | undefined)?.stack;
    res.json(success('Folder notes imported', await preparationService.importFolderNotes(uid(req), stack)));
  }),
  importStackFiles: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Files imported into stack', await preparationService.importStackFiles(uid(req), req.body)));
  }),
};

export const skillController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await skillService.list(uid(req));
    res.json(success('Skills fetched', result.items, result.meta));
  }),
  upsert: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Skill saved', await skillService.upsert(uid(req), req.body)));
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Skill updated', await skillService.update(uid(req), req.params.id as string, req.body)));
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await skillService.remove(uid(req), req.params.id as string);
    res.json(success('Skill deleted', null));
  }),
};

export const recruiterController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await recruiterService.list(uid(req), req.query as never);
    res.json(success('Recruiters fetched', result.items, result.meta));
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Recruiter fetched', await recruiterService.get(uid(req), req.params.id as string)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Recruiter created', await recruiterService.create(uid(req), req.body)));
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Recruiter updated', await recruiterService.update(uid(req), req.params.id as string, req.body)));
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await recruiterService.remove(uid(req), req.params.id as string);
    res.json(success('Recruiter deleted', null));
  }),
  communication: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(
      success('Communication logged', await recruiterService.addCommunication(uid(req), req.params.id as string, req.body)),
    );
  }),
};

export const noteController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await noteService.list(uid(req), req.query as never);
    res.json(success('Notes fetched', result.items, result.meta));
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Note fetched', await noteService.get(uid(req), req.params.id as string)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Note created successfully', await noteService.create(uid(req), req.body)));
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Note updated', await noteService.update(uid(req), req.params.id as string, req.body)));
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await noteService.remove(uid(req), req.params.id as string);
    res.json(success('Note deleted', null));
  }),
};

export const resumeController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await resumeService.list(uid(req), req.query as never);
    res.json(success('Resumes fetched', result.items, result.meta));
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Resume fetched', await resumeService.get(uid(req), req.params.id as string)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(success('Resume created', await resumeService.create(uid(req), req.body, req.file)));
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Resume updated', await resumeService.update(uid(req), req.params.id as string, req.body)));
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await resumeService.remove(uid(req), req.params.id as string);
    res.json(success('Resume deleted', null));
  }),
};

export const notificationController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await notificationService.list(uid(req), req.query as never);
    res.json(success('Notifications fetched', result.items, result.meta));
  }),
  read: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Notification read', await notificationService.markRead(uid(req), req.params.id as string)));
  }),
};

export const metaController = {
  dashboard: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Dashboard fetched', await dashboardService.get(uid(req))));
  }),
  analytics: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Analytics fetched', await analyticsService.overview(uid(req))));
  }),
  search: asyncHandler(async (req: Request, res: Response) => {
    res.json(success('Search results', await searchService.search(uid(req), String(req.query.q))));
  }),
  calendar: asyncHandler(async (req: Request, res: Response) => {
    res.json(
      success(
        'Calendar fetched',
        await calendarService.range(uid(req), new Date(String(req.query.from)), new Date(String(req.query.to))),
      ),
    );
  }),
};
