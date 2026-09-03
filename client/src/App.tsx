import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GuestLayout, ProtectedLayout } from '@/layouts/Guards';
import { ForgotPage, LoginPage, RegisterPage, ResetPage } from '@/pages/AuthPages';
import { DashboardPage } from '@/pages/DashboardPage';
import { ApplicationsPage, JobsPage } from '@/pages/ApplicationsJobs';
import { CompaniesPage, CompanyDetailPage, TargetsPage } from '@/pages/CompaniesPages';
import { InterviewDetailPage, InterviewsPage, QuestionsPage } from '@/pages/InterviewPages';
import { PrepStackDetailPage, PrepStackHubPage } from '@/pages/PrepStackPages';
import {
  AnalyticsPage,
  CalendarPage,
  NotesPage,
  RecruitersPage,
  ResumesPage,
  SettingsPage,
  SkillsPage,
  StudyPlanPage,
  TopicsPage,
  WeakAreasPage,
} from '@/pages/WorkspacePages';
import { useAuth } from '@/store/auth';
import { useUi } from '@/store/ui';
import { cn } from '@/utils/format';

function GlobalToasts() {
  const { toasts, dismiss } = useUi();
  return (
    <div className="pointer-events-none fixed top-6 right-6 z-50 flex flex-col items-end space-y-3">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn(
            'pointer-events-auto block w-max min-w-[280px] max-w-sm transform transition-all duration-300 ease-out hover:-translate-x-1 rounded-xl px-4 py-3 text-left text-[14px] font-medium shadow-lg',
            t.tone === 'err' 
              ? 'border border-danger/30 bg-card text-danger' 
              : 'border border-line bg-card text-ink',
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route element={<GuestLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPage />} />
            <Route path="/reset-password" element={<ResetPage />} />
          </Route>
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/targets" element={<TargetsPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/companies/:id" element={<CompanyDetailPage />} />
            <Route path="/interviews" element={<InterviewsPage mode="upcoming" />} />
            <Route path="/interviews/history" element={<InterviewsPage mode="history" />} />
            <Route path="/interviews/:id" element={<InterviewDetailPage />} />
            <Route path="/questions" element={<QuestionsPage />} />
            <Route path="/prep/topics" element={<TopicsPage />} />
            <Route path="/prep/notes" element={<PrepStackHubPage />} />
            <Route path="/prep/notes/:stack" element={<PrepStackDetailPage />} />
            <Route path="/prep/plan" element={<StudyPlanPage />} />
            <Route path="/prep/weak" element={<WeakAreasPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/recruiters" element={<RecruitersPage />} />
            <Route path="/contacts" element={<RecruitersPage asContacts />} />
            <Route path="/resumes" element={<ResumesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <GlobalToasts />
    </>
  );
}
