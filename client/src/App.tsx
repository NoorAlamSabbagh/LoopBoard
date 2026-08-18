import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GuestLayout, ProtectedLayout } from '@/layouts/Guards';
import { ForgotPage, LoginPage, RegisterPage, ResetPage } from '@/pages/AuthPages';
import { DashboardPage } from '@/pages/DashboardPage';
import { ApplicationsPage, JobsPage } from '@/pages/ApplicationsJobs';
import { CompaniesPage, CompanyDetailPage, TargetsPage } from '@/pages/CompaniesPages';
import { InterviewDetailPage, InterviewsPage, QuestionsPage } from '@/pages/InterviewPages';
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

export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
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
  );
}
