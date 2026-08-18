import { z } from 'zod';
import {
  APPLICATION_STATUSES,
  COMMUNICATION_CHANNELS,
  COMPANY_SIZES,
  COMPANY_TIERS,
  COMPANY_TYPES,
  DIFFICULTIES,
  EMPLOYMENT_TYPES,
  INTERVIEW_RESULTS,
  INTERVIEW_STATUSES,
  INTERVIEW_TYPES,
  NOTE_ENTITY_TYPES,
  PREP_PROGRESS,
  QUESTION_CATEGORIES,
  QUESTION_OUTCOMES,
  QUESTION_STATUSES,
  RELATIONSHIPS,
  STUDY_PLAN_SOURCES,
  STUDY_PLAN_STATUSES,
  TARGET_STATUSES,
  WORK_MODES,
} from '../constants/enums.js';

export const objectId = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id');

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  q: z.string().trim().optional(),
});

export const idParams = z.object({ id: objectId });

export const score = z.number().min(0).max(100);
export const confidence = z.number().int().min(1).max(5);

export const enums = {
  workMode: z.enum(WORK_MODES),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  companyType: z.enum(COMPANY_TYPES),
  companySize: z.enum(COMPANY_SIZES),
  targetStatus: z.enum(TARGET_STATUSES),
  companyTier: z.coerce.number().pipe(z.union([z.literal(1), z.literal(2), z.literal(3)])),
  applicationStatus: z.enum(APPLICATION_STATUSES),
  interviewType: z.enum(INTERVIEW_TYPES),
  interviewStatus: z.enum(INTERVIEW_STATUSES),
  interviewResult: z.enum(INTERVIEW_RESULTS),
  questionCategory: z.enum(QUESTION_CATEGORIES),
  difficulty: z.enum(DIFFICULTIES),
  questionStatus: z.enum(QUESTION_STATUSES),
  questionOutcome: z.enum(QUESTION_OUTCOMES),
  prepProgress: z.coerce.number().pipe(z.custom<number>((v) => PREP_PROGRESS.includes(v as never))),
  studyPlanStatus: z.enum(STUDY_PLAN_STATUSES),
  studyPlanSource: z.enum(STUDY_PLAN_SOURCES),
  noteEntity: z.enum(NOTE_ENTITY_TYPES),
  relationship: z.enum(RELATIONSHIPS),
  communicationChannel: z.enum(COMMUNICATION_CHANNELS),
};
