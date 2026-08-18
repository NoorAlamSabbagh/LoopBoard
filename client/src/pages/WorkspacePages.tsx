import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorBanner, Field, Input, ListSkeleton, PageHeader, Pagination, Progress, Select, Textarea } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useDebouncedValue, usePagedList } from '@/hooks/usePagedList';
import { dataApi } from '@/services/dataApi';
import { ApiClientError } from '@/services/api';
import { useUi } from '@/store/ui';
import { authApi } from '@/services/dataApi';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import type { Skill, Topic } from '@/types/api';
import { formatDay, labelize } from '@/utils/format';

export function TopicsPage() {
  const [rows, setRows] = useState<Topic[]>([]);
  const push = useUi((s) => s.push);
  async function load() {
    setRows((await dataApi.topics()).data);
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div>
      <PageHeader title="Preparation topics" subtitle="Progress updates feed company readiness scores." />
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((t) => (
          <Card key={t.id}>
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold tracking-tight">{t.name}</p>
              <span className="text-sm font-semibold text-accent-dark">{t.progress}%</span>
            </div>
            <div className="mt-3">
              <Progress value={t.progress} />
            </div>
            <div className="mt-3 flex gap-2">
              {[0, 25, 50, 75, 100].map((p) => (
                <Button
                  key={p}
                  variant="secondary"
                  type="button"
                  onClick={async () => {
                    await dataApi.updateTopic(t.id, { progress: p, lastStudiedAt: new Date().toISOString() });
                    push('Progress saved');
                    await load();
                  }}
                >
                  {p}%
                </Button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function StudyPlanPage() {
  const [plans, setPlans] = useState<{ id: string; title: string; items: { title: string; priority: number; reason?: string }[] }[]>([]);
  const push = useUi((s) => s.push);
  async function load() {
    setPlans((await dataApi.plans()).data);
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div>
      <PageHeader
        title="Study plan"
        subtitle="Generated from targets and weak topics."
        actions={
          <Button
            type="button"
            onClick={async () => {
              try {
                await dataApi.generatePlan();
                push('Plan generated');
                await load();
              } catch (err) {
                push(err instanceof ApiClientError ? err.message : 'Failed', 'err');
              }
            }}
          >
            Generate plan
          </Button>
        }
      />
      {plans.length === 0 ? <EmptyState title="No plans yet" hint="Generate one from your current targets." /> : null}
      {plans.map((plan) => (
        <Card key={plan.id} className="mb-3">
          <p className="mb-2 font-medium">{plan.title}</p>
          <ol className="space-y-2 text-sm">
            {(plan.items ?? []).map((item, i) => (
              <li key={i}>
                <Badge tone={item.priority === 1 ? 'danger' : item.priority === 2 ? 'warn' : 'accent'}>P{item.priority}</Badge>{' '}
                <span className="font-medium">{item.title}</span>
                {item.reason ? <span className="text-ink-soft"> — {item.reason}</span> : null}
              </li>
            ))}
          </ol>
        </Card>
      ))}
    </div>
  );
}

export function WeakAreasPage() {
  const [rows, setRows] = useState<{ technology: string; questionsAsked: number; avgConfidence: number }[]>([]);
  useEffect(() => {
    void dataApi.weak().then((r) => setRows(r.data));
  }, []);
  return (
    <div>
      <PageHeader title="Weak areas" subtitle="Needs preparation when volume is high and confidence is low." />
      {rows.length === 0 ? <EmptyState title="No weak areas flagged" hint="Need at least 3 questions in a topic." /> : null}
      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.technology} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{labelize(r.technology)}</p>
              <p className="text-sm text-ink-soft">
                {r.questionsAsked} questions · confidence {r.avgConfidence}
              </p>
            </div>
            <Badge tone="warn">Needs preparation</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SkillsPage() {
  const [rows, setRows] = useState<Skill[]>([]);
  const { register, handleSubmit, reset } = useForm<{ name: string; selfScore: number }>();
  const push = useUi((s) => s.push);
  async function load() {
    setRows((await dataApi.skills()).data);
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div>
      <PageHeader title="Skills" subtitle="Self rating blended with interview and question performance." />
      <form
        className="mb-6 flex flex-wrap gap-2"
        onSubmit={handleSubmit(async (v) => {
          await dataApi.upsertSkill({ name: v.name, selfScore: Number(v.selfScore) });
          reset();
          push('Skill saved');
          await load();
        })}
      >
        <Input className="max-w-xs" placeholder="Skill name" {...register('name', { required: true })} />
        <Input className="w-28" type="number" min={0} max={100} placeholder="%" {...register('selfScore', { required: true })} />
        <Button type="submit">Save</Button>
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((s) => (
          <Card key={s.id}>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium">{s.name}</span>
              <span className="font-semibold text-accent-dark">{s.blendedScore ?? s.selfScore}%</span>
            </div>
            <Progress value={s.blendedScore ?? s.selfScore} />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function NotesPage() {
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q);
  const list = usePagedList(dataApi.notes, { q: dq });
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const { register, handleSubmit, reset } = useForm<Record<string, string>>({
    defaultValues: { entityType: 'company' },
  });
  const push = useUi((s) => s.push);
  useEffect(() => {
    void dataApi.companies({ limit: 100 }).then((c) => setCompanies(c.data));
  }, []);
  return (
    <div>
      <PageHeader title="Notes" />
      <Input className="mb-4 max-w-xs" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card className="mb-4">
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={handleSubmit(async (v) => {
            try {
              await dataApi.createNote({ ...v, tags: v.tags ? v.tags.split(',').map((t) => t.trim()) : [] });
              reset();
              push('Note saved');
              list.reload();
            } catch (err) {
              push(err instanceof ApiClientError ? err.message : 'Need a linked entity', 'err');
            }
          })}
        >
          <Field label="Title">
            <Input {...register('title', { required: true })} />
          </Field>
          <Field label="Company">
            <Select {...register('entityId', { required: true })}>
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <input type="hidden" {...register('entityType')} />
          <div className="md:col-span-2">
            <Field label="Content">
              <Textarea {...register('content', { required: true })} />
            </Field>
          </div>
          <Button type="submit">Add note</Button>
        </form>
      </Card>
      {list.error ? <ErrorBanner message={list.error} onRetry={list.reload} /> : null}
      {list.loading ? <ListSkeleton /> : null}
      {list.items.map((n) => (
        <Card key={n.id} className="mb-2">
          <p className="font-medium">{n.title}</p>
          <p className="text-sm text-ink-soft">{n.content}</p>
        </Card>
      ))}
      <Pagination page={list.meta.page} pages={list.meta.pages} total={list.meta.total} onPage={list.setPage} />
    </div>
  );
}

export function RecruitersPage({ asContacts = false }: { asContacts?: boolean }) {
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q);
  const list = usePagedList(dataApi.recruiters, { q: dq });
  const { register, handleSubmit, reset } = useForm<Record<string, string>>();
  const push = useUi((s) => s.push);
  return (
    <div>
      <PageHeader title={asContacts ? 'Contacts' : 'Recruiters'} subtitle="Follow-ups appear on the calendar." />
      <Input className="mb-4 max-w-xs" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card className="mb-4">
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={handleSubmit(async (v) => {
            await dataApi.createRecruiter({
              ...v,
              email: v.email || undefined,
            });
            reset();
            push('Saved');
            list.reload();
          })}
        >
          <Field label="Name">
            <Input {...register('name', { required: true })} />
          </Field>
          <Field label="Email">
            <Input type="email" {...register('email')} />
          </Field>
          <Field label="Relationship">
            <Select {...register('relationship')}>
              <option value="recruiter">Recruiter</option>
              <option value="hiring_manager">Hiring manager</option>
              <option value="referral">Referral</option>
              <option value="employee">Employee</option>
            </Select>
          </Field>
          <Button type="submit">Add</Button>
        </form>
      </Card>
      {list.error ? <ErrorBanner message={list.error} onRetry={list.reload} /> : null}
      {list.loading ? <ListSkeleton /> : null}
      <div className="space-y-2">
        {list.items.map((r) => (
          <Card key={r.id} className="flex justify-between">
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-sm text-ink-soft">
                {r.email} · {labelize(r.relationship ?? 'recruiter')}
              </p>
            </div>
          </Card>
        ))}
      </div>
      <Pagination page={list.meta.page} pages={list.meta.pages} total={list.meta.total} onPage={list.setPage} />
    </div>
  );
}

export function ResumesPage() {
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q);
  const list = usePagedList(dataApi.resumes, { q: dq });
  const { register, handleSubmit, reset } = useForm<Record<string, string>>();
  const [file, setFile] = useState<File | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const push = useUi((s) => s.push);
  return (
    <div>
      <PageHeader title="Resumes" subtitle="PDF or Word file, attached to applications later." />
      <Input className="mb-4 max-w-xs" placeholder="Search resumes" value={q} onChange={(e) => setQ(e.target.value)} />
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={handleSubmit(async (v) => {
          try {
            const fd = new FormData();
            fd.append('name', v.name);
            if (v.targetRole) fd.append('targetRole', v.targetRole);
            if (v.version) fd.append('version', v.version);
            if (file) fd.append('file', file);
            await dataApi.createResume(fd);
            reset();
            setFile(null);
            push('Resume saved');
            list.reload();
          } catch (err) {
            push(err instanceof ApiClientError ? err.message : 'Could not save resume', 'err');
          }
        })}
      >
        <Input placeholder="Name" {...register('name', { required: true })} />
        <Input placeholder="Target role" {...register('targetRole')} />
        <Input type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button type="submit">Add</Button>
      </form>
      {list.error ? <ErrorBanner message={list.error} onRetry={list.reload} /> : null}
      {list.loading ? <ListSkeleton /> : null}
      {list.items.map((r) => (
        <Card key={r.id} className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-sm text-ink-soft">
              {r.targetRole} · v{r.version}
            </p>
          </div>
          <Button variant="ghost" type="button" onClick={() => setPendingDelete(r.id)}>
            Delete
          </Button>
        </Card>
      ))}
      <Pagination page={list.meta.page} pages={list.meta.pages} total={list.meta.total} onPage={list.setPage} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete resume?"
        body="This removes the version and stored file."
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await dataApi.deleteResume(pendingDelete);
          setPendingDelete(null);
          list.reload();
        }}
      />
    </div>
  );
}

export function AnalyticsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const dark = useTheme((s) => s.mode) === 'dark';
  const chartTick = dark ? '#98a2b3' : '#667085';
  const chartGrid = dark ? '#1d2939' : '#eef0f4';
  const chartBorder = dark ? '#2d3648' : '#e4e7ec';
  const chartBg = dark ? '#161b2c' : '#ffffff';
  const chartAccent = dark ? '#818cf8' : '#4f46e5';
  useEffect(() => {
    void dataApi.analytics().then((r) => setData(r.data));
  }, []);
  if (!data) return <EmptyState title="Loading analytics" hint="Aggregating applications and interviews." />;
  const apps = (data.applicationsOverTime as { _id: string; count: number }[]) ?? [];
  const byStatus = (data.applicationsByStatus as { _id: string; count: number }[]) ?? [];
  const success = data.successRate as { rate?: number; passed?: number; failed?: number } | undefined;
  return (
    <div>
      <PageHeader title="Analytics" subtitle={`Interview success rate ${success?.rate ?? 0}%`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-72">
          <p className="mb-2 font-medium">Applications over time</p>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={apps.map((a) => ({ week: formatDay(a._id), count: a.count }))}>
              <CartesianGrid stroke={chartGrid} vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: chartTick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chartTick }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${chartBorder}`, background: chartBg, color: dark ? '#f2f4f7' : '#101828', fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke={chartAccent} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="h-72">
          <p className="mb-2 font-medium">Applications by status</p>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={byStatus.map((s) => ({ status: labelize(s._id), count: s.count }))}>
              <CartesianGrid stroke={chartGrid} vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 11, fill: chartTick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chartTick }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${chartBorder}`, background: chartBg, color: dark ? '#f2f4f7' : '#101828', fontSize: 12 }} />
              <Bar dataKey="count" fill={chartAccent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

export function CalendarPage() {
  const [events, setEvents] = useState<Record<string, unknown[]>>({});
  useEffect(() => {
    const from = new Date();
    from.setDate(1);
    const to = new Date(from);
    to.setMonth(to.getMonth() + 1);
    void dataApi.calendar(from.toISOString(), to.toISOString()).then((r) => setEvents(r.data));
  }, []);
  return (
    <div>
      <PageHeader title="Calendar" subtitle="This month’s interviews, follow-ups, and deadlines." />
      {Object.entries(events).map(([key, items]) => (
        <Card key={key} className="mb-3">
          <p className="mb-2 font-medium">{labelize(key)}</p>
          {(items ?? []).length === 0 ? <p className="text-sm text-ink-soft">None</p> : null}
          <ul className="space-y-1 text-sm">
            {(items ?? []).map((item, i) => {
              const rec = item as { roundName?: string; name?: string; title?: string; scheduledAt?: string; nextFollowUpAt?: string; deadlineAt?: string };
              return (
                <li key={i}>
                  {rec.roundName ?? rec.name ?? rec.title} · {formatDay(rec.scheduledAt ?? rec.nextFollowUpAt ?? rec.deadlineAt)}
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}

export function SettingsPage() {
  const user = useAuth((s) => s.user);
  const setSession = useAuth((s) => s.setSession);
  const token = '';
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: user?.name ?? '',
      currentRole: user?.currentRole ?? '',
      targetRole: user?.targetRole ?? '',
      location: user?.location ?? '',
      github: user?.github ?? '',
      linkedin: user?.linkedin ?? '',
    },
  });
  const pwd = useForm<{ currentPassword: string; newPassword: string }>();
  const push = useUi((s) => s.push);
  return (
    <div>
      <PageHeader title="Settings" subtitle="Profile and password." />
      <Card className="mb-4 flex max-w-xl items-center justify-between">
        <div>
          <p className="text-[13px] font-medium">Appearance</p>
          <p className="text-[13px] text-ink-soft">Light or dark workspace.</p>
        </div>
        <ThemeToggle />
      </Card>
      <Card className="mb-4 max-w-xl">
        <form
          className="space-y-3"
          onSubmit={handleSubmit(async (v) => {
            const res = await authApi.updateProfile(v);
            setSession(res.data, (await import('@/services/api')).getAccessToken() || token);
            push('Profile saved');
          })}
        >
          <Field label="Name">
            <Input {...register('name')} />
          </Field>
          <Field label="Current role">
            <Input {...register('currentRole')} />
          </Field>
          <Field label="Target role">
            <Input {...register('targetRole')} />
          </Field>
          <Field label="Location">
            <Input {...register('location')} />
          </Field>
          <Field label="GitHub">
            <Input {...register('github')} />
          </Field>
          <Field label="LinkedIn">
            <Input {...register('linkedin')} />
          </Field>
          <Button type="submit">Save profile</Button>
        </form>
      </Card>
      <Card className="max-w-xl">
        <form
          className="space-y-3"
          onSubmit={pwd.handleSubmit(async (v) => {
            try {
              await authApi.changePassword(v);
              push('Password changed');
            } catch (err) {
              push(err instanceof ApiClientError ? err.message : 'Failed', 'err');
            }
          })}
        >
          <Field label="Current password">
            <Input type="password" {...pwd.register('currentPassword', { required: true })} />
          </Field>
          <Field label="New password">
            <Input type="password" {...pwd.register('newPassword', { required: true, minLength: 8 })} />
          </Field>
          <Button type="submit">Change password</Button>
        </form>
      </Card>
    </div>
  );
}
