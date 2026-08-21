import { api, unwrap } from './api';
import type {
  Application,
  Company,
  DashboardData,
  Interview,
  Job,
  Note,
  NotificationItem,
  PrepStack,
  Question,
  Recruiter,
  Resume,
  Skill,
  Topic,
  User,
} from '@/types/api';

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    unwrap<{ user: User; accessToken: string }>(api.post('/auth/register', body)),
  login: (body: { email: string; password: string }) =>
    unwrap<{ user: User; accessToken: string }>(api.post('/auth/login', body)),
  logout: () => unwrap<null>(api.post('/auth/logout')),
  forgot: (email: string) => unwrap<null>(api.post('/auth/forgot-password', { email })),
  reset: (token: string, password: string) => unwrap<null>(api.post('/auth/reset-password', { token, password })),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    unwrap<null>(api.post('/auth/change-password', body)),
  profile: () => unwrap<User>(api.get('/profile')),
  updateProfile: (body: Partial<User>) => unwrap<User>(api.put('/profile', body)),
};

type ListQuery = Record<string, string | number | undefined>;

function qs(query?: ListQuery) {
  const params = new URLSearchParams();
  if (!query) return '';
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const dataApi = {
  dashboard: () => unwrap<DashboardData>(api.get('/dashboard')),
  analytics: () => unwrap<Record<string, unknown>>(api.get('/analytics')),
  search: (q: string) => unwrap<Record<string, unknown[]>>(api.get(`/search${qs({ q })}`)),
  calendar: (from: string, to: string) => unwrap<Record<string, unknown[]>>(api.get(`/calendar${qs({ from, to })}`)),

  companies: (query?: ListQuery) => unwrap<Company[]>(api.get(`/companies${qs(query)}`)),
  company: (id: string) => unwrap<Company>(api.get(`/companies/${id}`)),
  createCompany: (body: Record<string, unknown>) => unwrap<Company>(api.post('/companies', body)),
  seedTargetCompanies: () =>
    unwrap<{ added: number; skipped: number; total: number }>(api.post('/companies/seed-targets')),
  updateCompany: (id: string, body: Record<string, unknown>) => unwrap<Company>(api.put(`/companies/${id}`, body)),
  deleteCompany: (id: string) => unwrap<null>(api.delete(`/companies/${id}`)),
  compare: (ids: string[]) => unwrap<unknown[]>(api.get(`/companies/compare${qs({ ids: ids.join(',') })}`)),

  jobs: (query?: ListQuery) => unwrap<Job[]>(api.get(`/jobs${qs(query)}`)),
  createJob: (body: Record<string, unknown>) => unwrap<Job>(api.post('/jobs', body)),
  updateJob: (id: string, body: Record<string, unknown>) => unwrap<Job>(api.put(`/jobs/${id}`, body)),
  deleteJob: (id: string) => unwrap<null>(api.delete(`/jobs/${id}`)),

  applications: (query?: ListQuery) => unwrap<Application[]>(api.get(`/applications${qs(query)}`)),
  board: () => unwrap<Record<string, Application[]>>(api.get('/applications/board')),
  createApplication: (body: Record<string, unknown>) => unwrap<Application>(api.post('/applications', body)),
  updateApplication: (id: string, body: Record<string, unknown>) => unwrap<Application>(api.put(`/applications/${id}`, body)),
  setStatus: (id: string, status: string) => unwrap<Application>(api.patch(`/applications/${id}/status`, { status })),
  deleteApplication: (id: string) => unwrap<null>(api.delete(`/applications/${id}`)),

  interviews: (query?: ListQuery) => unwrap<Interview[]>(api.get(`/interviews${qs(query)}`)),
  upcoming: () => unwrap<Interview[]>(api.get('/interviews/upcoming')),
  interview: (id: string) => unwrap<{ interview: Interview; performance: Record<string, unknown> | null }>(api.get(`/interviews/${id}`)),
  createInterview: (body: Record<string, unknown>) => unwrap<Interview>(api.post('/interviews', body)),
  updateInterview: (id: string, body: Record<string, unknown>) => unwrap<Interview>(api.put(`/interviews/${id}`, body)),
  savePerformance: (id: string, body: Record<string, unknown>) => unwrap<unknown>(api.post(`/interviews/${id}/performance`, body)),
  deleteInterview: (id: string) => unwrap<null>(api.delete(`/interviews/${id}`)),

  questions: (query?: ListQuery) => unwrap<Question[]>(api.get(`/questions${qs(query)}`)),
  mostAsked: () => unwrap<{ prompt: string; technology: string; companyCount: number }[]>(api.get('/questions/most-asked')),
  createQuestion: (body: Record<string, unknown>) => unwrap<Question>(api.post('/questions', body)),
  updateQuestion: (id: string, body: Record<string, unknown>) => unwrap<Question>(api.put(`/questions/${id}`, body)),
  deleteQuestion: (id: string) => unwrap<null>(api.delete(`/questions/${id}`)),

  topics: (query?: ListQuery) => unwrap<Topic[]>(api.get(`/preparation/topics${qs(query)}`)),
  createTopic: (body: { slug: string; name: string; notes?: string }) =>
    unwrap<Topic>(api.post('/preparation/topics', body)),
  stacks: () => unwrap<PrepStack[]>(api.get('/preparation/stacks')),
  createStack: (body: { name: string; blurb?: string }) =>
    unwrap<PrepStack>(api.post('/preparation/stacks', body)),
  updateTopic: (id: string, body: Record<string, unknown>) => unwrap<Topic>(api.put(`/preparation/topics/${id}`, body)),
  weak: () => unwrap<{ technology: string; questionsAsked: number; avgConfidence: number; needsPreparation: boolean }[]>(api.get('/preparation/weak')),
  plans: () => unwrap<{ id: string; title: string; items: { title: string; priority: number; reason?: string; done?: boolean }[] }[]>(api.get('/preparation/plans')),
  generatePlan: (targetCompanyId?: string) => unwrap<unknown>(api.post('/preparation/plans/generate', { targetCompanyId })),
  seedStackNotes: () =>
    unwrap<{ questionsAdded: number; notesAdded: number; stacks: number }>(api.post('/preparation/seed-stack-notes')),
  importFolderNotes: (stack?: string) =>
    unwrap<{ dir: string; scanned: number; notesAdded: number; notesUpdated: number; questionsAdded: number; stack?: string }>(
      api.post('/preparation/import-folder-notes', { stack }),
    ),
  importStackFiles: (body: { stack: string; files: { path: string; name?: string; content: string }[] }) =>
    unwrap<{
      stack: string;
      scanned: number;
      notesAdded: number;
      notesUpdated: number;
      questionsAdded: number;
      folders: string[];
    }>(api.post('/preparation/import-stack-files', body)),

  skills: () => unwrap<Skill[]>(api.get('/skills')),
  upsertSkill: (body: { name: string; selfScore: number }) => unwrap<Skill>(api.post('/skills', body)),

  recruiters: (query?: ListQuery) => unwrap<Recruiter[]>(api.get(`/recruiters${qs(query)}`)),
  createRecruiter: (body: Record<string, unknown>) => unwrap<Recruiter>(api.post('/recruiters', body)),
  deleteRecruiter: (id: string) => unwrap<null>(api.delete(`/recruiters/${id}`)),

  notes: (query?: ListQuery) => unwrap<Note[]>(api.get(`/notes${qs(query)}`)),
  createNote: (body: Record<string, unknown>) => unwrap<Note>(api.post('/notes', body)),
  updateNote: (id: string, body: Record<string, unknown>) => unwrap<Note>(api.put(`/notes/${id}`, body)),
  deleteNote: (id: string) => unwrap<null>(api.delete(`/notes/${id}`)),

  resumes: (query?: ListQuery) => unwrap<Resume[]>(api.get(`/resumes${qs(query)}`)),
  createResume: (body: FormData) => unwrap<Resume>(api.post('/resumes', body)),
  deleteResume: (id: string) => unwrap<null>(api.delete(`/resumes/${id}`)),

  notifications: (query?: ListQuery) => unwrap<NotificationItem[]>(api.get(`/notifications${qs(query)}`)),
  readNotification: (id: string) => unwrap<NotificationItem>(api.post(`/notifications/${id}/read`)),
};
