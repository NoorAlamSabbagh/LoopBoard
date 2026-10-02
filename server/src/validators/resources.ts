import { z } from 'zod';
import { enums, objectId, paginationQuery, score, confidence } from './common.js';

export const companyQuery = paginationQuery.extend({
  targetStatus: enums.targetStatus.optional(),
  tier: enums.companyTier.optional(),
});

export const companyBody = z.object({
  name: z.string().trim().min(1).max(160),
  logoUrl: z.string().max(500).optional(),
  website: z.string().max(500).optional(),
  location: z.string().max(160).optional(),
  industry: z.string().max(120).optional(),
  size: enums.companySize.optional(),
  type: enums.companyType.optional(),
  description: z.string().max(8000).optional(),
  careerPage: z.string().max(500).optional(),
  linkedin: z.string().max(500).optional(),
  glassdoor: z.string().max(500).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  targetStatus: enums.targetStatus.optional(),
  tier: enums.companyTier.optional(),
  interestScore: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(8000).optional(),
  salaryNotes: z.object({ band: z.string().optional(), currency: z.string().optional(), source: z.string().optional() }).optional(),
  research: z.object({ culture: z.string().optional(), products: z.string().optional(), recentNews: z.string().optional() }).optional(),
});

export const companyUpdate = companyBody.partial();

export const compareQuery = z.object({
  ids: z.string().min(1),
});

export const jobQuery = paginationQuery.extend({ companyId: objectId.optional() });

export const jobBody = z.object({
  companyId: objectId,
  title: z.string().trim().min(1).max(200),
  jobIdExternal: z.string().max(120).optional(),
  url: z.string().max(1000).optional(),
  location: z.string().max(160).optional(),
  workMode: enums.workMode.optional(),
  employmentType: enums.employmentType.optional(),
  salaryRange: z.object({ min: z.number().optional(), max: z.number().optional(), currency: z.string().optional() }).optional(),
  requiredExperienceYears: z.number().min(0).max(50).optional(),
  requiredSkills: z.array(z.object({ name: z.string(), level: score.optional(), weight: z.number().min(0).max(1).optional() })).optional(),
  description: z.string().max(20000).optional(),
  source: z.string().max(120).optional(),
  postedAt: z.coerce.date().optional(),
  deadlineAt: z.coerce.date().optional(),
});

export const applicationQuery = paginationQuery.extend({
  companyId: objectId.optional(),
  status: enums.applicationStatus.optional(),
});

const applicationBase = z.object({
  companyId: objectId.optional(),
  companyName: z.string().trim().min(1).max(160).optional(),
  companyTier: enums.companyTier.optional(),
  jobId: objectId.optional(),
  jobTitle: z.string().trim().min(1).max(200).optional(),
  title: z.string().trim().min(1).max(200),
  status: enums.applicationStatus.optional(),
  appliedAt: z.coerce.date().optional(),
  recruiterCalledAt: z.coerce.date().optional(),
  interviewScheduledAt: z.coerce.date().optional(),
  selectedAt: z.coerce.date().optional(),
  rejectedAt: z.coerce.date().optional(),
  ignoredAt: z.coerce.date().optional(),
  location: z.string().max(160).optional(),
  workMode: enums.workMode.optional(),
  salary: z.string().max(100).optional(),
  source: z.string().max(120).optional(),
  recruiterId: objectId.optional(),
  recruiterEmail: z.string().email().optional().or(z.literal('')),
  resumeId: objectId.optional(),
  coverLetter: z.string().max(20000).optional(),
  nextAction: z.string().max(400).optional(),
  nextActionAt: z.coerce.date().optional(),
  notes: z.string().max(8000).optional(),
  scheduleInterview: z
    .object({
      type: enums.interviewType,
      roundName: z.string().min(1).max(120),
      scheduledAt: z.coerce.date(),
      status: enums.interviewStatus.optional(),
      result: enums.interviewResult.optional(),
      meetingLink: z.string().max(1000).optional(),
      interviewerName: z.string().max(160).optional(),
      difficulty: enums.difficulty.optional(),
      notes: z.string().max(8000).optional(),
    })
    .optional(),
});

export const applicationUpdate = applicationBase.partial();

export const applicationBody = applicationBase.refine((data) => Boolean(data.companyId || data.companyName), {
  message: 'Either companyId or companyName must be provided',
  path: ['companyId'],
});

export const statusBody = z.object({ status: enums.applicationStatus });

export const timelineEntryBody = z.object({
  stage: z.string().min(1).max(100),
  date: z.coerce.date().optional(),
  title: z.string().min(1).max(200),
  notes: z.string().max(4000).optional(),
});

export const interviewQuery = paginationQuery.extend({
  companyId: objectId.optional(),
  result: enums.interviewResult.optional(),
  type: enums.interviewType.optional(),
});

export const interviewBody = z.object({
  applicationId: objectId,
  companyId: objectId,
  jobId: objectId.optional(),
  scheduledAt: z.coerce.date(),
  timezone: z.string().max(64).optional(),
  type: enums.interviewType,
  roundNumber: z.number().int().min(1).max(20).optional(),
  roundName: z.string().min(1).max(120),
  interviewerName: z.string().max(160).optional(),
  interviewerId: objectId.optional(),
  meetingLink: z.string().max(1000).optional(),
  status: enums.interviewStatus.optional(),
  difficulty: enums.difficulty.optional(),
  result: enums.interviewResult.optional(),
  feedback: z.string().max(8000).optional(),
  notes: z.string().max(8000).optional(),
});

export const performanceBody = z.object({
  overall: confidence,
  technical: confidence,
  communication: confidence,
  confidence,
  questionsAnswered: z.number().int().min(0).optional(),
  questionsMissed: z.number().int().min(0).optional(),
  difficulty: enums.difficulty.optional(),
  whatWentWell: z.string().max(4000).optional(),
  whatWentWrong: z.string().max(4000).optional(),
  whatToImprove: z.string().max(4000).optional(),
  weakTopics: z.array(z.string()).optional(),
  strongTopics: z.array(z.string()).optional(),
});

const stackTech = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{1,80}$/, 'Use letters, numbers, and underscores');

export const stackBody = z.object({
  name: z.string().trim().min(1).max(80),
  blurb: z.string().trim().max(200).optional(),
});

export const questionQuery = paginationQuery.extend({
  companyId: objectId.optional(),
  technology: stackTech.optional(),
  category: stackTech.optional(),
  difficulty: enums.difficulty.optional(),
  status: enums.questionStatus.optional(),
  confidence: confidence.optional(),
});

export const questionBody = z.object({
  prompt: z.string().trim().min(1).max(4000),
  technology: stackTech,
  category: stackTech.optional(),
  difficulty: enums.difficulty.optional(),
  answer: z.string().max(20000).optional(),
  correctAnswer: z.string().max(20000).optional(),
  confidence: confidence.optional(),
  status: enums.questionStatus.optional(),
  notes: z.string().max(8000).optional(),
  companyId: objectId.optional(),
  jobId: objectId.optional(),
  interviewId: objectId.optional(),
  roundName: z.string().max(120).optional(),
  askedAt: z.coerce.date().optional(),
  myAnswer: z.string().max(20000).optional(),
  outcome: enums.questionOutcome.optional(),
});

export const topicBody = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  parentId: objectId.optional(),
  progress: z.union([z.literal(0), z.literal(25), z.literal(50), z.literal(75), z.literal(100)]).optional(),
  confidence: confidence.optional(),
  lastStudiedAt: z.coerce.date().optional(),
  nextReviewAt: z.coerce.date().optional(),
  resources: z.array(z.object({ title: z.string(), url: z.string().optional(), kind: z.string().optional() })).optional(),
  notes: z.string().max(8000).optional(),
});

export const studyPlanBody = z.object({
  title: z.string().min(1).max(200),
  status: enums.studyPlanStatus.optional(),
  source: enums.studyPlanSource.optional(),
  targetCompanyId: objectId.optional(),
  items: z
    .array(
      z.object({
        topicId: objectId.optional(),
        title: z.string(),
        priority: z.number().int().min(1).max(3),
        reason: z.string().optional(),
        dueAt: z.coerce.date().optional(),
        done: z.boolean().optional(),
      }),
    )
    .optional(),
});

export const generatePlanBody = z.object({
  targetCompanyId: objectId.optional(),
});

export const skillBody = z.object({
  name: z.string().min(1).max(80),
  selfScore: score,
});

export const recruiterBody = z.object({
  companyId: objectId.optional(),
  name: z.string().min(1).max(160),
  designation: z.string().max(160).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  linkedin: z.string().max(500).optional(),
  relationship: enums.relationship.optional(),
  lastContactedAt: z.coerce.date().optional(),
  nextFollowUpAt: z.coerce.date().optional(),
  notes: z.string().max(8000).optional(),
});

export const communicationBody = z.object({
  channel: enums.communicationChannel,
  happenedAt: z.coerce.date(),
  summary: z.string().min(1).max(4000),
});

export const noteQuery = paginationQuery.extend({
  entityType: enums.noteEntity.optional(),
  entityId: objectId.optional(),
  tag: z.string().optional(),
  folderPath: z.string().optional(),
});

export const noteBody = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1).max(500000),
  tags: z.array(z.string()).optional(),
  folderPath: z.string().max(500).optional(),
  entityType: enums.noteEntity,
  entityId: objectId,
});

export const importFolderNotesBody = z
  .object({
    stack: z.string().optional(),
  })
  .optional();

export const importStackFilesBody = z.object({
  stack: z.string().min(1).max(80),
  files: z
    .array(
      z.object({
        path: z.string().min(1).max(500),
        name: z.string().max(300).optional(),
        content: z.string().max(500000),
      }),
    )
    .min(1)
    .max(1000),
});

export const resumeBody = z.object({
  name: z.string().min(1).max(160),
  version: z.string().max(40).optional(),
  targetRole: z.string().max(160).optional(),
  skills: z.array(z.string()).optional(),
  projects: z.string().max(8000).optional(),
  experienceSummary: z.string().max(8000).optional(),
});

export const notificationQuery = paginationQuery.extend({
  unread: z.enum(['true', 'false']).optional(),
});

export const searchQuery = z.object({ q: z.string().trim().min(1).max(120) });

export const calendarQuery = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});
