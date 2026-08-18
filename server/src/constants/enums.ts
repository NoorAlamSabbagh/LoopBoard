export const WORK_MODES = ['remote', 'hybrid', 'onsite'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const EMPLOYMENT_TYPES = ['full_time', 'contract', 'internship', 'part_time'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const COMPANY_TYPES = ['product', 'startup', 'service', 'consultancy', 'faang', 'other'] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

export const COMPANY_SIZES = ['1-50', '51-200', '201-1000', '1001-5000', '5000+'] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export const TARGET_STATUSES = [
  'target',
  'high_priority',
  'medium_priority',
  'low_priority',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'not_interested',
] as const;
export type TargetStatus = (typeof TARGET_STATUSES)[number];

export const COMPANY_TIERS = [1, 2, 3] as const;
export type CompanyTier = (typeof COMPANY_TIERS)[number];

export const APPLICATION_STATUSES = [
  'saved',
  'applied',
  'recruiter_contacted',
  'screening',
  'interview_scheduled',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
  'closed',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Kanban columns. Withdrawn/closed stay table-only. */
export const KANBAN_COLUMNS = [
  'saved',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
] as const;
export type KanbanColumn = (typeof KANBAN_COLUMNS)[number];

export const APPLICATION_STATUS_TO_KANBAN: Record<ApplicationStatus, KanbanColumn | null> = {
  saved: 'saved',
  applied: 'applied',
  recruiter_contacted: 'screening',
  screening: 'screening',
  interview_scheduled: 'interview',
  interviewing: 'interview',
  offer: 'offer',
  rejected: 'rejected',
  withdrawn: null,
  closed: null,
};

export const INTERVIEW_TYPES = [
  'hr',
  'recruiter',
  'technical',
  'coding',
  'system_design',
  'managerial',
  'behavioral',
  'final_round',
] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_STATUSES = ['scheduled', 'completed', 'cancelled', 'rescheduled'] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_RESULTS = ['pending', 'passed', 'failed', 'rescheduled', 'cancelled'] as const;
export type InterviewResult = (typeof INTERVIEW_RESULTS)[number];

export const QUESTION_CATEGORIES = [
  'javascript',
  'typescript',
  'react',
  'nodejs',
  'express',
  'mongodb',
  'sql',
  'system_design',
  'dsa',
  'aws',
  'docker',
  'redis',
  'git',
  'html',
  'css',
  'behavioral',
  'hr',
  'project_based',
  'other',
] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const QUESTION_STATUSES = ['not_studied', 'studying', 'weak', 'good', 'mastered'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const QUESTION_OUTCOMES = ['correct', 'partial', 'missed', 'unknown'] as const;
export type QuestionOutcome = (typeof QUESTION_OUTCOMES)[number];

export const PREP_PROGRESS = [0, 25, 50, 75, 100] as const;
export type PrepProgress = (typeof PREP_PROGRESS)[number];

export const STUDY_PLAN_STATUSES = ['active', 'completed', 'archived'] as const;
export type StudyPlanStatus = (typeof STUDY_PLAN_STATUSES)[number];

export const STUDY_PLAN_SOURCES = ['generated', 'manual'] as const;
export type StudyPlanSource = (typeof STUDY_PLAN_SOURCES)[number];

export const NOTE_ENTITY_TYPES = [
  'company',
  'application',
  'interview',
  'question',
  'preparation_topic',
  'recruiter',
] as const;
export type NoteEntityType = (typeof NOTE_ENTITY_TYPES)[number];

export const ACTIVITY_ENTITY_TYPES = [
  'company',
  'job',
  'application',
  'interview',
  'question',
  'preparation_topic',
  'skill',
  'resume',
  'recruiter',
  'note',
  'study_plan',
] as const;
export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

export const NOTIFICATION_TYPES = [
  'interview_tomorrow',
  'follow_up_due',
  'preparation_due',
  'application_follow_up',
  'application_deadline',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'push'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const COMMUNICATION_CHANNELS = ['email', 'linkedin', 'phone', 'other'] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export const RELATIONSHIPS = ['recruiter', 'hiring_manager', 'referral', 'employee', 'other'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];
