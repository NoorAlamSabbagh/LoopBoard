import { DndContext, type DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  PhoneCall,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  ListSkeleton,
  PageHeader,
  Pagination,
  Select,
  TableShell,
  Textarea,
} from '@/components/ui';
import { useDebouncedValue, usePagedList } from '@/hooks/usePagedList';
import { dataApi } from '@/services/dataApi';
import { useUi } from '@/store/ui';
import type { Application, Company, Job } from '@/types/api';
import { formatDate, formatDay, labelize } from '@/utils/format';
import { ApiClientError } from '@/services/api';

const COLUMNS = ['saved', 'applied', 'screening', 'interview', 'offer', 'rejected'] as const;
const COLUMN_DOT: Record<(typeof COLUMNS)[number], string> = {
  saved: 'bg-ink-soft',
  applied: 'bg-[#3b6fd8]',
  screening: 'bg-[#d97706]',
  interview: 'bg-accent',
  offer: 'bg-ok',
  rejected: 'bg-danger',
};
const COLUMN_STATUS: Record<(typeof COLUMNS)[number], string> = {
  saved: 'saved',
  applied: 'applied',
  screening: 'screening',
  interview: 'interviewing',
  offer: 'offer',
  rejected: 'rejected',
};

const APPLICATION_STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'interviewing', label: 'Interviewing (In Progress)' },
  { value: 'screening', label: 'Screening Round' },
  { value: 'recruiter_contacted', label: 'Recruiter Contacted' },
  { value: 'saved', label: 'Saved' },
  { value: 'offer', label: 'Offer Received' },
  { value: 'rejected', label: 'Rejected' },
];

export function ApplicationsPage() {
  const [board, setBoard] = useState<Record<string, Application[]>>({});
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'board' | 'table'>('board');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const dq = useDebouncedValue(q);
  const table = usePagedList(dataApi.applications, { q: dq, status: status || undefined });
  const push = useUi((s) => s.push);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);

  // Company selection mode: existing vs new
  const [companyMode, setCompanyMode] = useState<'existing' | 'new'>('existing');

  // Inline interview scheduling inside New Application Drawer
  const [includeInterview, setIncludeInterview] = useState(false);
  const [interviewState, setInterviewState] = useState<'scheduled' | 'completed'>('scheduled');

  // Quick Schedule / Log Interview Modal for existing application
  const [quickInterviewApp, setQuickInterviewApp] = useState<Application | null>(null);
  const [quickInterviewStatus, setQuickInterviewStatus] = useState<'scheduled' | 'completed'>('scheduled');

  // Track Record & Timeline Modal
  const [timelineApp, setTimelineApp] = useState<Application | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<Record<string, unknown>>({
    defaultValues: {
      status: 'applied',
      appliedAt: new Date().toISOString().slice(0, 10),
      workMode: 'hybrid',
      companyTier: '2',
      source: 'LinkedIn',
      interviewType: 'technical',
      interviewRoundName: 'Round 1 - Technical Interview',
      interviewResult: 'pending',
    },
  });

  const {
    register: registerQuick,
    handleSubmit: handleSubmitQuick,
    reset: resetQuick,
  } = useForm<Record<string, unknown>>({
    defaultValues: {
      type: 'technical',
      roundName: 'Round 1 - Technical Interview',
      scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      result: 'pending',
      difficulty: 'medium',
    },
  });

  const {
    register: registerTimeline,
    handleSubmit: handleSubmitTimeline,
    reset: resetTimeline,
  } = useForm<Record<string, unknown>>({
    defaultValues: {
      stage: 'recruiter_call',
      date: new Date().toISOString().slice(0, 10),
      title: 'Received Recruiter Phone Call',
      notes: '',
    },
  });

  const watchCompanyId = String(watch('companyId') || '');
  const companyJobs = jobs.filter((j) => j.companyId === watchCompanyId);

  async function load() {
    setBoardLoading(true);
    setBoardError(null);
    try {
      const [b, c, j] = await Promise.all([
        dataApi.board(),
        dataApi.companies({ limit: 100 }),
        dataApi.jobs({ limit: 100 }),
      ]);
      setBoard(b.data);
      setCompanies(c.data);
      setJobs(j.data);
      if (c.data.length === 0) {
        setCompanyMode('new');
      }
    } catch (err) {
      setBoardError(err instanceof ApiClientError ? err.message : 'Failed to load board');
    } finally {
      setBoardLoading(false);
    }
  }

  useEffect(() => {
    void load().catch((err) => push(err instanceof ApiClientError ? err.message : 'Failed to load', 'err'));
  }, [push]);

  async function onDragEnd(event: DragEndEvent) {
    const over = event.over?.id ? String(event.over.id) : '';
    const id = String(event.active.id);
    if (!COLUMNS.includes(over as (typeof COLUMNS)[number])) return;
    try {
      await dataApi.setStatus(id, COLUMN_STATUS[over as (typeof COLUMNS)[number]]);
      await load();
      table.reload();
    } catch (err) {
      push(err instanceof ApiClientError ? err.message : 'Could not move card', 'err');
    }
  }

  async function handleDeleteApplication(id: string) {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    try {
      await dataApi.deleteApplication(id);
      push('Application removed');
      await load();
      table.reload();
    } catch (err) {
      push(err instanceof ApiClientError ? err.message : 'Could not delete', 'err');
    }
  }

  return (
    <div>
      <PageHeader
        title="Applications & ATS Pipeline"
        subtitle="Track your job applications, stages, and company interview records in one central board."
        actions={
          <div className="flex gap-2">
            <Button
              variant={view === 'board' ? 'primary' : 'secondary'}
              type="button"
              onClick={() => setView('board')}
            >
              Board
            </Button>
            <Button
              variant={view === 'table' ? 'primary' : 'secondary'}
              type="button"
              onClick={() => setView('table')}
            >
              Table
            </Button>
            <Button
              type="button"
              onClick={() => {
                reset({
                  status: 'applied',
                  appliedAt: new Date().toISOString().slice(0, 10),
                  workMode: 'hybrid',
                  companyTier: '2',
                  source: 'LinkedIn',
                  interviewType: 'technical',
                  interviewRoundName: 'Round 1 - Technical Interview',
                  interviewResult: 'pending',
                });
                setCompanyMode(companies.length === 0 ? 'new' : 'existing');
                setIncludeInterview(false);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New Application
            </Button>
          </div>
        }
      />

      {view === 'table' ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="Search company, title, or notes..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select className="max-w-52" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {APPLICATION_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          {table.error ? <ErrorBanner message={table.error} onRetry={table.reload} /> : null}
          {table.loading ? <ListSkeleton /> : null}
          {!table.loading && table.items.length === 0 ? (
            <EmptyState
              title="No applications found"
              hint="Click 'New Application' above to add a company you applied to (e.g. LTM, Amazon, Google)."
            />
          ) : null}
          <TableShell>
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Company & Role</th>
                  <th>Status</th>
                  <th>Track Record / Dates</th>
                  <th>Interview Status</th>
                  <th>Work Mode & Location</th>
                  <th>Source</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {table.items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="font-semibold text-ink flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span>{row.company?.name || row.companyName || '—'}</span>
                        {row.company?.tier ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-paper-2 text-ink-soft">
                            Tier {row.company.tier}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[12px] text-ink-soft mt-0.5">{row.title}</div>
                    </td>
                    <td>
                      <Badge
                        tone={
                          row.status === 'offer'
                            ? 'ok'
                            : row.status === 'rejected'
                              ? 'danger'
                              : row.status.includes('interview')
                                ? 'accent'
                                : 'neutral'
                        }
                      >
                        {labelize(row.status)}
                      </Badge>
                    </td>
                    <td>
                      <div className="space-y-1 text-[11px]">
                        <div className="text-ink">
                          <span className="text-ink-soft">Applied: </span>
                          <span className="font-medium">{formatDay(row.appliedAt)}</span>
                        </div>
                        {row.recruiterCalledAt ? (
                          <div className="text-ink flex items-center gap-1">
                            <PhoneCall className="h-2.5 w-2.5 text-accent" />
                            <span>Call: {formatDay(row.recruiterCalledAt)}</span>
                          </div>
                        ) : null}
                        {row.selectedAt ? (
                          <div className="text-ok font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span>Selected: {formatDay(row.selectedAt)}</span>
                          </div>
                        ) : row.rejectedAt ? (
                          <div className="text-danger flex items-center gap-1">
                            <XCircle className="h-2.5 w-2.5" />
                            <span>Rejected: {formatDay(row.rejectedAt)}</span>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setTimelineApp(row)}
                          className="text-[11px] text-accent hover:underline flex items-center gap-0.5 font-medium pt-0.5"
                        >
                          <History className="h-3 w-3" /> Full Timeline ({row.timeline?.length || 1})
                        </button>
                      </div>
                    </td>
                    <td>
                      {row.upcomingInterview ? (
                        <div className="inline-flex items-center gap-1 text-[12px] font-medium text-accent">
                          <Calendar className="h-3 w-3" />
                          <span>{row.upcomingInterview.roundName}</span>
                          <span className="text-ink-soft">({formatDate(row.upcomingInterview.scheduledAt)})</span>
                        </div>
                      ) : row.latestInterview ? (
                        <div className="inline-flex items-center gap-1 text-[12px] text-ink-soft">
                          <CheckCircle2 className="h-3 w-3 text-ok" />
                          <span>{row.latestInterview.roundName}</span>
                          <Badge tone={row.latestInterview.result === 'passed' ? 'ok' : 'neutral'}>
                            {labelize(row.latestInterview.result)}
                          </Badge>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setQuickInterviewApp(row);
                            resetQuick({
                              type: 'technical',
                              roundName: 'Round 1 - Technical Interview',
                              scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                              result: 'pending',
                              difficulty: 'medium',
                            });
                          }}
                          className="text-[12px] text-accent hover:underline flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Schedule Round
                        </button>
                      )}
                    </td>
                    <td className="text-ink-soft text-[12px]">
                      {row.location || row.workMode
                        ? `${labelize(row.workMode || '—')} ${row.location ? `· ${row.location}` : ''}`
                        : '—'}
                    </td>
                    <td className="text-ink-soft text-[12px]">{row.source ?? '—'}</td>
                    <td className="text-right space-x-1">
                      <Button
                        variant="secondary"
                        className="h-7 text-xs px-2"
                        type="button"
                        onClick={() => setTimelineApp(row)}
                      >
                        Timeline
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-7 text-xs px-2"
                        type="button"
                        onClick={() => {
                          setQuickInterviewApp(row);
                          resetQuick({
                            type: 'technical',
                            roundName: 'Round 1 - Technical Interview',
                            scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                            result: 'pending',
                            difficulty: 'medium',
                          });
                        }}
                      >
                        + Interview
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-7 text-xs px-2 text-danger hover:bg-danger/10"
                        type="button"
                        onClick={() => void handleDeleteApplication(row.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
          <Pagination page={table.meta.page} pages={table.meta.pages} total={table.meta.total} onPage={table.setPage} />
        </>
      ) : (
        <>
          {boardError ? <ErrorBanner message={boardError} onRetry={() => void load()} /> : null}
          {boardLoading ? <ListSkeleton /> : null}
          {!boardLoading && Object.values(board).every((col) => !col?.length) ? (
            <EmptyState
              title="No applications yet"
              hint="Click 'New Application' to record your application for LTM (LTIMindtree) or any company."
            />
          ) : null}
          <DndContext onDragEnd={(e) => void onDragEnd(e)}>
            <div className="mt-2 flex gap-3 overflow-x-auto pb-6">
              {COLUMNS.map((col) => (
                <Column
                  key={col}
                  id={col}
                  title={labelize(col)}
                  items={board[col] ?? []}
                  onAddInterview={(app) => {
                    setQuickInterviewApp(app);
                    resetQuick({
                      type: 'technical',
                      roundName: 'Round 1 - Technical Interview',
                      scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                      result: 'pending',
                      difficulty: 'medium',
                    });
                  }}
                  onViewTimeline={(app) => setTimelineApp(app)}
                  onDeleteApplication={(id) => void handleDeleteApplication(id)}
                />
              ))}
            </div>
          </DndContext>
        </>
      )}

      {/* NEW APPLICATION DRAWER */}
      <Drawer
        open={open}
        title="Add Application & Track Company"
        onClose={() => setOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            try {
              const payload: Record<string, unknown> = {
                title: values.title,
                status: values.status || 'applied',
                appliedAt: values.appliedAt,
                recruiterCalledAt: values.recruiterCalledAt || undefined,
                interviewScheduledAt: values.interviewScheduledAt || undefined,
                location: values.location,
                workMode: values.workMode,
                salary: values.salary,
                source: values.source,
                notes: values.notes,
              };

              if (companyMode === 'existing') {
                if (!values.companyId) {
                  push('Please select a company or enter a new one', 'err');
                  return;
                }
                payload.companyId = values.companyId;
                if (values.jobId) payload.jobId = values.jobId;
              } else {
                if (!values.companyName) {
                  push('Please enter the company name', 'err');
                  return;
                }
                payload.companyName = values.companyName;
                payload.companyTier = Number(values.companyTier) || 2;
              }

              // If interview scheduling is included
              if (includeInterview && values.interviewRoundName && values.interviewDate) {
                payload.scheduleInterview = {
                  roundName: values.interviewRoundName,
                  type: values.interviewType || 'technical',
                  scheduledAt: new Date(String(values.interviewDate)),
                  status: interviewState,
                  result: interviewState === 'completed' ? (values.interviewResult || 'pending') : 'pending',
                  meetingLink: values.interviewMeetingLink || '',
                  interviewerName: values.interviewInterviewerName || '',
                  difficulty: values.interviewDifficulty,
                  notes: values.interviewNotes || '',
                };
              }

              await dataApi.createApplication(payload);
              push('Application successfully recorded!');
              reset();
              setOpen(false);
              await load();
              table.reload();
            } catch (err) {
              push(err instanceof ApiClientError ? err.message : 'Could not create application', 'err');
            }
          })}
        >
          {/* Company Selection Mode */}
          <div className="rounded-xl border border-line bg-paper/50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-accent" />
                Target Company
              </span>
              <div className="flex rounded-lg border border-line p-0.5 text-xs bg-card">
                <button
                  type="button"
                  onClick={() => setCompanyMode('existing')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    companyMode === 'existing' ? 'bg-accent text-white font-medium' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  Existing
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyMode('new')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    companyMode === 'new' ? 'bg-accent text-white font-medium' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  + New Company
                </button>
              </div>
            </div>

            {companyMode === 'existing' ? (
              <div className="space-y-3">
                <Field label="Select Company *">
                  <Select {...register('companyId')}>
                    <option value="">Select a company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.tier ? `(Tier ${c.tier})` : ''}
                      </option>
                    ))}
                  </Select>
                  {companies.length === 0 ? (
                    <p className="text-xs text-ink-soft mt-1">
                      No companies yet.{' '}
                      <button
                        type="button"
                        onClick={() => setCompanyMode('new')}
                        className="text-accent underline font-medium"
                      >
                        Click here to add one.
                      </button>
                    </p>
                  ) : null}
                </Field>

                {companyJobs.length > 0 ? (
                  <Field label="Link to Existing Job (Optional)">
                    <Select
                      {...register('jobId')}
                      onChange={(e) => {
                        setValue('jobId', e.target.value);
                        const selected = companyJobs.find((j) => j.id === e.target.value);
                        if (selected) setValue('title', selected.title);
                      }}
                    >
                      <option value="">None / Custom Role</option>
                      {companyJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <Field label="Company Name *">
                  <Input
                    placeholder="e.g. LTM (LTIMindtree), Google, Microsoft..."
                    {...register('companyName')}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tier">
                    <Select {...register('companyTier')}>
                      <option value="1">Tier 1 (Dream/FAANG)</option>
                      <option value="2">Tier 2 (Product / Top IT)</option>
                      <option value="3">Tier 3 (General)</option>
                    </Select>
                  </Field>
                  <Field label="Target Status">
                    <Select {...register('companyTargetStatus')}>
                      <option value="applied">Applied</option>
                      <option value="interviewing">Interviewing</option>
                      <option value="target">Target</option>
                    </Select>
                  </Field>
                </div>
              </div>
            )}
          </div>

          {/* Job / Role Title */}
          <Field label="Job / Role Title *">
            <Input
              placeholder="e.g. Software Engineer, Full Stack Developer, React Lead"
              {...register('title', { required: true })}
            />
          </Field>

          {/* Status & Applied Date */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Application Status *">
              <Select
                {...register('status')}
                onChange={(e) => {
                  setValue('status', e.target.value);
                  if (['interview_scheduled', 'interviewing'].includes(e.target.value)) {
                    setIncludeInterview(true);
                  }
                }}
              >
                {APPLICATION_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Applied Date">
              <Input type="date" {...register('appliedAt')} />
            </Field>
          </div>

          {/* Additional Dates if known */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Recruiter Call Date (if any)">
              <Input type="date" {...register('recruiterCalledAt')} />
            </Field>
            <Field label="Interview Scheduled Date">
              <Input type="date" {...register('interviewScheduledAt')} />
            </Field>
          </div>

          {/* Location & Work Mode */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Work Mode">
              <Select {...register('workMode')}>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
                <option value="onsite">On-site</option>
              </Select>
            </Field>
            <Field label="Location">
              <Input placeholder="e.g. Bangalore, Mumbai, Remote" {...register('location')} />
            </Field>
          </div>

          {/* Salary & Source */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Salary / CTC">
              <Input placeholder="e.g. 15-20 LPA, $120k" {...register('salary')} />
            </Field>
            <Field label="Source">
              <Select {...register('source')}>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Company Careers">Company Careers</option>
                <option value="Naukri">Naukri</option>
                <option value="Referral">Referral</option>
                <option value="Indeed">Indeed</option>
                <option value="Recruiter">Recruiter Outreach</option>
                <option value="Other">Other</option>
              </Select>
            </Field>
          </div>

          {/* Notes */}
          <Field label="Notes / Job URL / Recruiter Contact">
            <Textarea
              className="min-h-20"
              placeholder="Application links, referral person name, recruiter emails, or job requirements..."
              {...register('notes')}
            />
          </Field>

          {/* INTERVIEW RECORD / SCHEDULE TOGGLE */}
          <div className="rounded-xl border border-line bg-paper/40 p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeInterview}
                onChange={(e) => setIncludeInterview(e.target.checked)}
                className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
              />
              <span className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-accent" />
                Record or schedule an interview round for this company
              </span>
            </label>

            {includeInterview ? (
              <div className="space-y-3 pt-2 border-t border-line/60">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInterviewState('scheduled')}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                      interviewState === 'scheduled'
                        ? 'bg-accent text-white border-accent'
                        : 'border-line bg-card text-ink-soft hover:text-ink'
                    }`}
                  >
                    🗓️ Interview is Scheduled
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewState('completed')}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                      interviewState === 'completed'
                        ? 'bg-accent text-white border-accent'
                        : 'border-line bg-card text-ink-soft hover:text-ink'
                    }`}
                  >
                    ✓ Already Gave Interview
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Round Name *">
                    <Input
                      placeholder="e.g. Round 1 - Technical, HR Screening"
                      {...register('interviewRoundName')}
                    />
                  </Field>
                  <Field label="Round Type">
                    <Select {...register('interviewType')}>
                      <option value="technical">Technical</option>
                      <option value="coding">Coding Assessment</option>
                      <option value="system_design">System Design</option>
                      <option value="hr">HR Round</option>
                      <option value="recruiter">Recruiter Screen</option>
                      <option value="behavioral">Behavioral</option>
                      <option value="managerial">Managerial</option>
                      <option value="final_round">Final Round</option>
                    </Select>
                  </Field>
                </div>

                <Field label={interviewState === 'scheduled' ? 'Scheduled Date & Time *' : 'Interview Date *'}>
                  <Input type="datetime-local" {...register('interviewDate')} />
                </Field>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Interviewer Name">
                    <Input placeholder="e.g. John Doe (Tech Lead)" {...register('interviewInterviewerName')} />
                  </Field>
                  <Field label="Meeting Link / Venue">
                    <Input placeholder="Google Meet, Teams link" {...register('interviewMeetingLink')} />
                  </Field>
                </div>

                {interviewState === 'completed' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Outcome / Result">
                      <Select {...register('interviewResult')}>
                        <option value="pending">Pending Result</option>
                        <option value="passed">Passed</option>
                        <option value="failed">Failed / Rejected</option>
                      </Select>
                    </Field>
                    <Field label="Difficulty">
                      <Select {...register('interviewDifficulty')}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </Select>
                    </Field>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Application</Button>
          </div>
        </form>
      </Drawer>

      {/* QUICK SCHEDULE / LOG INTERVIEW MODAL */}
      <Drawer
        open={Boolean(quickInterviewApp)}
        title={`Log Interview — ${quickInterviewApp?.company?.name || quickInterviewApp?.companyName || 'Application'}`}
        onClose={() => setQuickInterviewApp(null)}
      >
        {quickInterviewApp ? (
          <form
            className="space-y-4"
            onSubmit={handleSubmitQuick(async (v) => {
              try {
                await dataApi.createInterview({
                  companyId: quickInterviewApp.companyId,
                  applicationId: quickInterviewApp.id,
                  roundName: v.roundName,
                  type: v.type,
                  scheduledAt: v.scheduledAt,
                  status: quickInterviewStatus,
                  result: quickInterviewStatus === 'completed' ? v.result : 'pending',
                  meetingLink: v.meetingLink || '',
                  interviewerName: v.interviewerName || '',
                  difficulty: v.difficulty,
                  feedback: v.feedback || '',
                });

                // Update application status if currently applied
                if (quickInterviewApp.status === 'applied' || quickInterviewApp.status === 'saved') {
                  await dataApi.setStatus(
                    quickInterviewApp.id,
                    quickInterviewStatus === 'completed' ? 'interviewing' : 'interview_scheduled',
                  );
                }

                push('Interview successfully recorded!');
                setQuickInterviewApp(null);
                await load();
                table.reload();
              } catch (err) {
                push(err instanceof ApiClientError ? err.message : 'Could not save interview', 'err');
              }
            })}
          >
            <div className="rounded-lg bg-paper-2 p-3 text-[13px] text-ink-soft space-y-1">
              <p className="font-semibold text-ink">{quickInterviewApp.title}</p>
              <p>Company: {quickInterviewApp.company?.name || quickInterviewApp.companyName}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQuickInterviewStatus('scheduled')}
                className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                  quickInterviewStatus === 'scheduled'
                    ? 'bg-accent text-white border-accent'
                    : 'border-line bg-card text-ink-soft hover:text-ink'
                }`}
              >
                🗓️ Interview Scheduled
              </button>
              <button
                type="button"
                onClick={() => setQuickInterviewStatus('completed')}
                className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                  quickInterviewStatus === 'completed'
                    ? 'bg-accent text-white border-accent'
                    : 'border-line bg-card text-ink-soft hover:text-ink'
                }`}
              >
                ✓ Already Gave Interview
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Round Name *">
                <Input placeholder="e.g. Round 1 - Technical" {...registerQuick('roundName', { required: true })} />
              </Field>
              <Field label="Round Type">
                <Select {...registerQuick('type')}>
                  <option value="technical">Technical</option>
                  <option value="coding">Coding Assessment</option>
                  <option value="system_design">System Design</option>
                  <option value="hr">HR Round</option>
                  <option value="recruiter">Recruiter Screen</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="managerial">Managerial</option>
                  <option value="final_round">Final Round</option>
                </Select>
              </Field>
            </div>

            <Field label={quickInterviewStatus === 'scheduled' ? 'Scheduled Date & Time *' : 'Interview Date *'}>
              <Input type="datetime-local" {...registerQuick('scheduledAt', { required: true })} />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Interviewer Name">
                <Input placeholder="e.g. Lead Engineer" {...registerQuick('interviewerName')} />
              </Field>
              <Field label="Meeting Link">
                <Input placeholder="Teams / Meet URL" {...registerQuick('meetingLink')} />
              </Field>
            </div>

            {quickInterviewStatus === 'completed' ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Result">
                    <Select {...registerQuick('result')}>
                      <option value="pending">Pending Result</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed / Rejected</option>
                    </Select>
                  </Field>
                  <Field label="Difficulty">
                    <Select {...registerQuick('difficulty')}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Feedback / Interview Reflection">
                  <Textarea
                    placeholder="Questions asked, topics that went well, or areas to improve..."
                    {...registerQuick('feedback')}
                  />
                </Field>
              </>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setQuickInterviewApp(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Interview</Button>
            </div>
          </form>
        ) : null}
      </Drawer>

      {/* TRACK RECORD & TIMELINE DRAWER */}
      <Drawer
        open={Boolean(timelineApp)}
        title={`Track Record — ${timelineApp?.company?.name || timelineApp?.companyName || 'Application'}`}
        onClose={() => setTimelineApp(null)}
      >
        {timelineApp ? (
          <div className="space-y-5">
            {/* Header info */}
            <div className="rounded-xl border border-line bg-paper p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink text-[14px]">{timelineApp.title}</p>
                <Badge>{labelize(timelineApp.status)}</Badge>
              </div>
              <p className="text-[12px] text-ink-soft">
                {timelineApp.company?.name || timelineApp.companyName}
                {timelineApp.location ? ` · ${timelineApp.location}` : ''}
              </p>
            </div>

            {/* Key Milestone Dates Overview */}
            <div>
              <p className="text-[12px] font-semibold text-ink-soft uppercase tracking-wider mb-2">
                Application Milestones
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line bg-card p-2.5">
                  <p className="text-[11px] text-ink-soft">Applied Date</p>
                  <p className="font-medium text-[13px] text-ink mt-0.5">
                    {timelineApp.appliedAt ? formatDay(timelineApp.appliedAt) : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-card p-2.5">
                  <p className="text-[11px] text-ink-soft">Recruiter Call</p>
                  <p className="font-medium text-[13px] text-ink mt-0.5">
                    {timelineApp.recruiterCalledAt ? formatDay(timelineApp.recruiterCalledAt) : 'Pending'}
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-card p-2.5">
                  <p className="text-[11px] text-ink-soft">Interview Scheduled</p>
                  <p className="font-medium text-[13px] text-ink mt-0.5">
                    {timelineApp.interviewScheduledAt
                      ? formatDay(timelineApp.interviewScheduledAt)
                      : timelineApp.upcomingInterview
                        ? formatDay(timelineApp.upcomingInterview.scheduledAt)
                        : 'None'}
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-card p-2.5">
                  <p className="text-[11px] text-ink-soft">Selected for Next Round</p>
                  <p className="font-medium text-[13px] text-ok mt-0.5">
                    {timelineApp.selectedAt ? formatDay(timelineApp.selectedAt) : 'Pending'}
                  </p>
                </div>
                {timelineApp.rejectedAt ? (
                  <div className="rounded-lg border border-danger/20 bg-danger/5 p-2.5">
                    <p className="text-[11px] text-danger">Rejected Date</p>
                    <p className="font-medium text-[13px] text-danger mt-0.5">
                      {formatDay(timelineApp.rejectedAt)}
                    </p>
                  </div>
                ) : null}
                {timelineApp.ignoredAt ? (
                  <div className="rounded-lg border border-line bg-card p-2.5">
                    <p className="text-[11px] text-ink-soft">Ignored / Withdrawn</p>
                    <p className="font-medium text-[13px] text-ink-soft mt-0.5">
                      {formatDay(timelineApp.ignoredAt)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Chronological Timeline History */}
            <div>
              <p className="text-[12px] font-semibold text-ink-soft uppercase tracking-wider mb-2">
                Chronological Track Record
              </p>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
                {timelineApp.timeline && timelineApp.timeline.length > 0 ? (
                  timelineApp.timeline.map((event, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-card bg-accent ring-2 ring-accent/20" />
                      <div className="rounded-lg border border-line bg-card p-2.5 text-[12px]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-ink">{event.title}</p>
                          <span className="text-[11px] text-ink-soft">{formatDay(event.date)}</span>
                        </div>
                        {event.notes ? <p className="mt-1 text-ink-soft">{event.notes}</p> : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[12px] text-ink-soft">
                    Applied on {formatDay(timelineApp.appliedAt)}
                  </div>
                )}
              </div>
            </div>

            {/* Add Milestone Event Form */}
            <div className="rounded-xl border border-line bg-paper/60 p-3.5 space-y-3">
              <p className="font-semibold text-[13px] text-ink flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-accent" />
                Record New Stage / Date
              </p>
              <form
                className="space-y-3"
                onSubmit={handleSubmitTimeline(async (v) => {
                  try {
                    const res = await dataApi.addApplicationTimeline(timelineApp.id, {
                      stage: String(v.stage),
                      date: String(v.date),
                      title: String(v.title),
                      notes: String(v.notes || ''),
                    });
                    push('Track record updated!');
                    resetTimeline({
                      stage: 'recruiter_call',
                      date: new Date().toISOString().slice(0, 10),
                      title: 'Received Recruiter Phone Call',
                      notes: '',
                    });
                    setTimelineApp(res.data);
                    await load();
                    table.reload();
                  } catch (err) {
                    push(err instanceof ApiClientError ? err.message : 'Could not add event', 'err');
                  }
                })}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Event / Stage *">
                    <Select
                      {...registerTimeline('stage')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'recruiter_call') setValue('title', 'Received Recruiter Phone Call');
                        else if (val === 'interview_scheduled') setValue('title', 'Interview Round Scheduled');
                        else if (val === 'selected_further_round') setValue('title', 'Selected for Next Round / Advanced');
                        else if (val === 'rejected') setValue('title', 'Application Rejected / Feedback Received');
                        else if (val === 'ignored') setValue('title', 'No Response / Marked as Ignored');
                        else if (val === 'offer') setValue('title', 'Job Offer Received');
                      }}
                    >
                      <option value="recruiter_call">📞 Recruiter Call</option>
                      <option value="interview_scheduled">🗓️ Interview Scheduled</option>
                      <option value="selected_further_round">🌟 Selected for Further Round</option>
                      <option value="rejected">❌ Rejected</option>
                      <option value="ignored">🚫 Ignored / No Response</option>
                      <option value="offer">🎉 Job Offer</option>
                    </Select>
                  </Field>
                  <Field label="Date *">
                    <Input type="date" {...registerTimeline('date', { required: true })} />
                  </Field>
                </div>

                <Field label="Event Summary *">
                  <Input {...registerTimeline('title', { required: true })} />
                </Field>

                <Field label="Notes / Outcome Details">
                  <Textarea
                    className="min-h-16"
                    placeholder="Details about what recruiter said, next interview date, etc."
                    {...registerTimeline('notes')}
                  />
                </Field>

                <Button type="submit" className="w-full">
                  Add to Track Record
                </Button>
              </form>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

function Column({
  id,
  title,
  items,
  onAddInterview,
  onViewTimeline,
  onDeleteApplication,
}: {
  id: string;
  title: string;
  items: Application[];
  onAddInterview: (app: Application) => void;
  onViewTimeline: (app: Application) => void;
  onDeleteApplication: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const dot = COLUMN_DOT[id as (typeof COLUMNS)[number]] ?? 'bg-accent';
  return (
    <div
      ref={setNodeRef}
      className={`w-[290px] shrink-0 rounded-xl border border-line bg-card p-2.5 transition-colors ${
        isOver ? 'border-accent bg-accent/5' : ''
      }`}
    >
      <p className="mb-2.5 flex items-center gap-2 px-1 text-[13px] font-semibold text-ink">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {title}
        <span className="ml-auto rounded-full bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink-soft">
          {items.length}
        </span>
      </p>
      <div className="min-h-32 space-y-2.5">
        {items.map((item) => (
          <CardItem
            key={item.id}
            item={item}
            onAddInterview={onAddInterview}
            onViewTimeline={onViewTimeline}
            onDeleteApplication={onDeleteApplication}
          />
        ))}
      </div>
    </div>
  );
}

function CardItem({
  item,
  onAddInterview,
  onViewTimeline,
  onDeleteApplication,
}: {
  item: Application;
  onAddInterview: (app: Application) => void;
  onViewTimeline: (app: Application) => void;
  onDeleteApplication: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const companyName = item.company?.name || item.companyName || 'Company';

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`rounded-xl border border-line bg-paper p-3.5 transition-all shadow-[0_1px_2px_rgba(16,24,40,0.03)] ${
        isDragging ? 'opacity-60 ring-2 ring-accent' : 'hover:border-accent/40 hover:shadow-md'
      }`}
    >
      {/* Drag handle header */}
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1.5 font-semibold text-[13px] text-ink leading-tight">
            <Building2 className="h-3.5 w-3.5 text-accent shrink-0" />
            <span className="line-clamp-1">{companyName}</span>
          </div>
          {item.company?.tier ? (
            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-card border border-line text-ink-soft shrink-0">
              T{item.company.tier}
            </span>
          ) : null}
        </div>

        <p className="mt-1 text-[13px] font-medium text-ink-soft line-clamp-1">{item.title}</p>
      </div>

      {/* Applied date & Milestones Track Record */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-soft">
        <span>{item.appliedAt ? `Applied ${formatDay(item.appliedAt)}` : 'Recently added'}</span>
        {item.workMode ? <span className="capitalize">{item.workMode}</span> : null}
      </div>

      {/* Milestone Track Record Callouts */}
      {item.recruiterCalledAt || item.selectedAt || item.rejectedAt ? (
        <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
          {item.recruiterCalledAt ? (
            <span className="inline-flex items-center gap-1 rounded bg-card px-1.5 py-0.5 border border-line text-ink">
              <PhoneCall className="h-2.5 w-2.5 text-accent" /> Call {formatDay(item.recruiterCalledAt)}
            </span>
          ) : null}
          {item.selectedAt ? (
            <span className="inline-flex items-center gap-1 rounded bg-ok/10 px-1.5 py-0.5 text-ok font-medium">
              <CheckCircle2 className="h-2.5 w-2.5" /> Selected
            </span>
          ) : null}
          {item.rejectedAt ? (
            <span className="inline-flex items-center gap-1 rounded bg-danger/10 px-1.5 py-0.5 text-danger font-medium">
              <XCircle className="h-2.5 w-2.5" /> Rejected
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Interview status indicator */}
      <div className="mt-2.5 pt-2 border-t border-line/60">
        {item.upcomingInterview ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {item.upcomingInterview.roundName} · {formatDate(item.upcomingInterview.scheduledAt)}
            </span>
          </div>
        ) : item.latestInterview ? (
          <div className="flex items-center justify-between rounded-lg bg-card px-2 py-1 text-[11px] text-ink-soft border border-line">
            <span className="truncate">{item.latestInterview.roundName}</span>
            <Badge tone={item.latestInterview.result === 'passed' ? 'ok' : 'neutral'}>
              {labelize(item.latestInterview.result)}
            </Badge>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-soft">No interview yet</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddInterview(item);
              }}
              className="text-[11px] font-medium text-accent hover:underline flex items-center gap-0.5"
            >
              <Plus className="h-3 w-3" /> Log Round
            </button>
          </div>
        )}
      </div>

      {/* Quick action bar */}
      <div className="mt-2.5 flex items-center justify-between pt-1 text-[11px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewTimeline(item);
            }}
            className="text-ink-soft hover:text-ink flex items-center gap-1 font-medium"
            title="View Application Track Record & Timeline"
          >
            <History className="h-3 w-3 text-accent" /> Timeline
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddInterview(item);
            }}
            className="text-accent hover:underline font-medium"
          >
            + Interview
          </button>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteApplication(item.id);
          }}
          className="text-danger/70 hover:text-danger p-0.5"
          title="Delete application"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function JobsPage() {
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q);
  const list = usePagedList(dataApi.jobs, { q: dq });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<Record<string, string>>();
  const push = useUi((s) => s.push);

  useEffect(() => {
    void dataApi.companies({ limit: 100 }).then((c) => setCompanies(c.data));
  }, []);

  return (
    <div>
      <PageHeader
        title="Jobs & Roles"
        subtitle="Track open job opportunities and required skills."
        actions={
          <Button type="button" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Job
          </Button>
        }
      />
      <Input
        className="mb-4 max-w-xs"
        placeholder="Search jobs..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {list.error ? <ErrorBanner message={list.error} onRetry={list.reload} /> : null}
      {list.loading ? <ListSkeleton /> : null}
      <TableShell>
        <table className="lb-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Location</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((job) => (
              <tr key={job.id}>
                <td className="font-medium">{job.title}</td>
                <td className="text-ink-soft">{job.location ?? '—'}</td>
                <td className="text-ink-soft">{job.workMode ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.loading && list.items.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No jobs" hint="Add a company, then a role." />
          </div>
        ) : null}
      </TableShell>
      <Pagination page={list.meta.page} pages={list.meta.pages} total={list.meta.total} onPage={list.setPage} />
      <Drawer open={open} title="New job" onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={handleSubmit(async (v) => {
            try {
              await dataApi.createJob(v);
              push('Job added');
              reset();
              setOpen(false);
              list.reload();
            } catch (err) {
              push(err instanceof ApiClientError ? err.message : 'Failed', 'err');
            }
          })}
        >
          <Field label="Company *">
            <Select {...register('companyId', { required: true })}>
              <option value="">Select a company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title *">
            <Input {...register('title', { required: true })} />
          </Field>
          <Field label="Location">
            <Input {...register('location')} />
          </Field>
          <Button type="submit">Create</Button>
        </form>
      </Drawer>
    </div>
  );
}
