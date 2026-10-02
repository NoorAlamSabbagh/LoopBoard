export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  meta?: { page: number; limit: number; total: number; pages: number };
};

export type ApiErrorBody = {
  success: false;
  message: string;
  error?: { code: string; details?: unknown };
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  yearsOfExperience?: number;
  currentRole?: string;
  targetRole?: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
  timezone?: string;
};

export type Company = {
  id: string;
  name: string;
  location?: string;
  industry?: string;
  targetStatus: string;
  tier?: number;
  priority?: number;
  website?: string;
  targetScore?: number;
  skillMatch?: number;
  experienceMatch?: number;
  interviewReadiness?: number;
  notes?: string;
};

export type Job = {
  id: string;
  companyId: string;
  title: string;
  location?: string;
  workMode?: string;
  employmentType?: string;
  deadlineAt?: string;
  requiredSkills?: { name: string; level?: number }[];
};

export type Application = {
  id: string;
  companyId: string;
  jobId?: string;
  title: string;
  status: string;
  appliedAt?: string;
  recruiterCalledAt?: string;
  interviewScheduledAt?: string;
  selectedAt?: string;
  rejectedAt?: string;
  ignoredAt?: string;
  timeline?: {
    stage: string;
    date: string;
    title: string;
    notes?: string;
  }[];
  location?: string;
  workMode?: string;
  salary?: string;
  source?: string;
  notes?: string;
  companyName?: string;
  company?: {
    id: string;
    name: string;
    logoUrl?: string;
    tier?: number;
    targetStatus?: string;
  };
  job?: {
    id: string;
    title: string;
    location?: string;
    workMode?: string;
  };
  interviewsCount?: number;
  upcomingInterview?: {
    id: string;
    roundName: string;
    type: string;
    scheduledAt: string;
    status: string;
    meetingLink?: string;
  } | null;
  latestInterview?: {
    id: string;
    roundName: string;
    type: string;
    scheduledAt: string;
    status: string;
    result: string;
  } | null;
};

export type Interview = {
  id: string;
  companyId: string;
  applicationId: string;
  scheduledAt: string;
  type: string;
  roundNumber: number;
  roundName: string;
  status: string;
  result: string;
  meetingLink?: string;
  interviewerName?: string;
};

export type Question = {
  id: string;
  prompt: string;
  technology: string;
  category: string;
  difficulty?: string;
  status: string;
  confidence: number;
  answer?: string;
  notes?: string;
};

export type PrepStack = {
  id: string;
  name: string;
  blurb: string;
  custom?: boolean;
  topicId?: string;
  questions: number;
  notes: number;
  folders?: number;
};

export type ImportFolderNotesResult = {
  dir: string;
  scanned: number;
  notesAdded: number;
  notesUpdated: number;
  questionsAdded: number;
  stack?: string;
};

export type ImportStackFilesResult = {
  stack: string;
  scanned: number;
  notesAdded: number;
  notesUpdated: number;
  questionsAdded: number;
  folders: string[];
};

export type Topic = {
  id: string;
  slug: string;
  name: string;
  progress: number;
  confidence: number;
  lastStudiedAt?: string;
};

export type Skill = {
  id: string;
  name: string;
  selfScore: number;
  derivedScore?: number;
  blendedScore?: number;
};

export type Recruiter = {
  id: string;
  name: string;
  companyId?: string;
  designation?: string;
  email?: string;
  relationship?: string;
  nextFollowUpAt?: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  folderPath?: string;
  entityType: string;
  entityId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Resume = {
  id: string;
  name: string;
  version?: string;
  targetRole?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  dueAt: string;
  readAt?: string | null;
};

export type DashboardData = {
  kpis: {
    totalCompanies: number;
    targeting: number;
    totalApplications: number;
    pending: number;
    offers: number;
    rejections: number;
    interviewsScheduled: number;
    interviewsCompleted: number;
    upcoming: number;
    prepProgress: number;
  };
  insights: {
    interviewsCompleted: number;
    strongestArea: string | null;
    weakestArea: string | null;
    mostAskedTechnology: string | null;
    highestSkillMatch: string[];
    recommendedNextTarget: string | null;
    recommendedPreparation: string[];
  };
  upcomingInterviews: Interview[];
  recentActivity: { id?: string; summary: string; createdAt?: string; verb?: string }[];
  mostAskedQuestions: { prompt: string; technology: string; companyCount: number }[];
  technologies: { technology: string; percent: number; count: number }[];
  weakAreas: { technology: string; questionsAsked: number; needsPreparation: boolean }[];
};
