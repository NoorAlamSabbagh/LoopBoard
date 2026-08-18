import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Badge, Button, Card, Drawer, EmptyState, ErrorBanner, Field, Input, ListSkeleton, PageHeader, Pagination, Select, Textarea } from '@/components/ui';
import { useDebouncedValue, usePagedList } from '@/hooks/usePagedList';
import { dataApi } from '@/services/dataApi';
import { ApiClientError } from '@/services/api';
import { useUi } from '@/store/ui';
import type { Application, Company, Interview } from '@/types/api';
import { formatDate, labelize } from '@/utils/format';

export function InterviewsPage({ mode }: { mode: 'upcoming' | 'history' }) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [q, setQ] = useState('');
  const [result, setResult] = useState('');
  const [type, setType] = useState('');
  const dq = useDebouncedValue(q);
  const history = usePagedList(dataApi.interviews, {
    q: dq,
    result: result || undefined,
    type: type || undefined,
    sort: '-scheduledAt',
  });
  const [upcomingRows, setUpcomingRows] = useState<Interview[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(mode === 'upcoming');
  const [upcomingError, setUpcomingError] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<Record<string, string>>();
  const push = useUi((s) => s.push);

  async function loadLookups() {
    const [c, a] = await Promise.all([dataApi.companies({ limit: 100 }), dataApi.applications({ limit: 100 })]);
    setCompanies(c.data);
    setApps(a.data);
  }

  async function loadUpcoming() {
    setUpcomingLoading(true);
    setUpcomingError(null);
    try {
      setUpcomingRows((await dataApi.upcoming()).data);
    } catch (err) {
      setUpcomingError(err instanceof ApiClientError ? err.message : 'Failed to load');
    } finally {
      setUpcomingLoading(false);
    }
  }

  useEffect(() => {
    void loadLookups();
    if (mode === 'upcoming') void loadUpcoming();
  }, [mode]);

  const rows = mode === 'upcoming' ? upcomingRows : history.items;
  const loading = mode === 'upcoming' ? upcomingLoading : history.loading;
  const error = mode === 'upcoming' ? upcomingError : history.error;

  return (
    <div>
      <PageHeader
        title={mode === 'upcoming' ? 'Upcoming interviews' : 'Interview history'}
        actions={
          <Button type="button" onClick={() => setOpen(true)}>
            Schedule
          </Button>
        }
      />
      {mode === 'history' ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="Search rounds" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select className="max-w-40" value={result} onChange={(e) => setResult(e.target.value)}>
            <option value="">All results</option>
            {['pending', 'passed', 'failed', 'rescheduled', 'cancelled'].map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </Select>
          <Select className="max-w-40" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {['hr', 'recruiter', 'technical', 'coding', 'system_design', 'managerial', 'behavioral', 'final_round'].map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      {error ? <ErrorBanner message={error} onRetry={mode === 'upcoming' ? () => void loadUpcoming() : history.reload} /> : null}
      {loading ? <ListSkeleton /> : null}
      {!loading && rows.length === 0 ? <EmptyState title="No interviews" hint="Schedule a round from an application." /> : null}
      <div className="space-y-2">
        {rows.map((row) => (
          <Link key={row.id} to={`/interviews/${row.id}`}>
            <Card className="flex flex-wrap items-center justify-between gap-3 hover:border-accent/30">
              <div>
                <p className="font-medium">{row.roundName}</p>
                <p className="text-sm text-ink-soft">
                  {labelize(row.type)} · {formatDate(row.scheduledAt)}
                </p>
              </div>
              <Badge tone={row.result === 'passed' ? 'ok' : row.result === 'failed' ? 'danger' : 'neutral'}>
                {labelize(row.result)}
              </Badge>
            </Card>
          </Link>
        ))}
      </div>
      {mode === 'history' ? (
        <Pagination page={history.meta.page} pages={history.meta.pages} total={history.meta.total} onPage={history.setPage} />
      ) : null}
      <Drawer open={open} title="Schedule interview" onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={handleSubmit(async (v) => {
            try {
              await dataApi.createInterview({ ...v, roundNumber: Number(v.roundNumber ?? 1) });
              push('Interview scheduled');
              reset();
              setOpen(false);
              if (mode === 'upcoming') await loadUpcoming();
              else history.reload();
            } catch (err) {
              push(err instanceof ApiClientError ? err.message : 'Failed', 'err');
            }
          })}
        >
          <Field label="Company">
            <Select {...register('companyId', { required: true })}>
              <option value="">Select</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Application">
            <Select {...register('applicationId', { required: true })}>
              <option value="">Select</option>
              {apps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Round name">
            <Input {...register('roundName', { required: true })} />
          </Field>
          <Field label="Type">
            <Select {...register('type', { required: true })}>
              {['hr', 'recruiter', 'technical', 'coding', 'system_design', 'managerial', 'behavioral', 'final_round'].map((t) => (
                <option key={t} value={t}>
                  {labelize(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="When">
            <Input type="datetime-local" {...register('scheduledAt', { required: true })} />
          </Field>
          <Button type="submit">Create</Button>
        </form>
      </Drawer>
    </div>
  );
}

export function InterviewDetailPage() {
  const { id } = useParams();
  const [payload, setPayload] = useState<{ interview: Interview; performance: Record<string, unknown> | null } | null>(null);
  const [next, setNext] = useState<Record<string, unknown> | null>(null);
  const { register, handleSubmit } = useForm<Record<string, string | number>>();
  const push = useUi((s) => s.push);

  useEffect(() => {
    if (id) void dataApi.interview(id).then((r) => setPayload(r.data));
  }, [id]);

  if (!payload) return <EmptyState title="Loading interview" hint="Fetching round details." />;
  const { interview } = payload;

  return (
    <div>
      <PageHeader title={interview.roundName} subtitle={`${labelize(interview.type)} · ${formatDate(interview.scheduledAt)}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 font-medium">Debrief</p>
          <form
            className="space-y-3"
            onSubmit={handleSubmit(async (v) => {
              if (!id) return;
              try {
                const res = await dataApi.savePerformance(id, {
                  overall: Number(v.overall),
                  technical: Number(v.technical),
                  communication: Number(v.communication),
                  confidence: Number(v.confidence),
                  questionsAnswered: Number(v.questionsAnswered ?? 0),
                  questionsMissed: Number(v.questionsMissed ?? 0),
                  whatWentWell: v.whatWentWell,
                  whatWentWrong: v.whatWentWrong,
                  whatToImprove: v.whatToImprove,
                  weakTopics: String(v.weakTopics ?? '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                  strongTopics: String(v.strongTopics ?? '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                });
                setNext((res.data as { next?: Record<string, unknown> }).next ?? null);
                push('Performance saved');
              } catch (err) {
                push(err instanceof ApiClientError ? err.message : 'Failed', 'err');
              }
            })}
          >
            {['overall', 'technical', 'communication', 'confidence'].map((f) => (
              <Field key={f} label={`${labelize(f)} (1-5)`}>
                <Input type="number" min={1} max={5} {...register(f, { required: true })} />
              </Field>
            ))}
            <Field label="Weak topics (comma separated)">
              <Input {...register('weakTopics')} placeholder="mongodb, system_design" />
            </Field>
            <Field label="What to improve">
              <Textarea {...register('whatToImprove')} />
            </Field>
            <Button type="submit">Save debrief</Button>
          </form>
        </Card>
        <Card>
          <p className="mb-3 font-medium">What should I prepare next?</p>
          {next ? (
            <pre className="overflow-auto text-sm whitespace-pre-wrap text-ink-soft">{JSON.stringify(next, null, 2)}</pre>
          ) : (
            <p className="text-sm text-ink-soft">Save a debrief to generate recommendations.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export function QuestionsPage() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [technology, setTechnology] = useState('');
  const [status, setStatus] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const dq = useDebouncedValue(q);
  const list = usePagedList(dataApi.questions, {
    q: dq,
    technology: technology || undefined,
    status: status || undefined,
    difficulty: difficulty || undefined,
  });
  const { register, handleSubmit, reset } = useForm<Record<string, string | number>>();
  const push = useUi((s) => s.push);

  return (
    <div>
      <PageHeader
        title="Question bank"
        subtitle="Canonical questions plus occurrences from interviews."
        actions={
          <Button type="button" onClick={() => setOpen(true)}>
            Add question
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search questions" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="max-w-40" value={technology} onChange={(e) => setTechnology(e.target.value)}>
          <option value="">All tech</option>
          {['javascript', 'typescript', 'react', 'nodejs', 'mongodb', 'system_design', 'dsa', 'other'].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select className="max-w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          {['not_studied', 'studying', 'weak', 'good', 'mastered'].map((s) => (
            <option key={s} value={s}>
              {labelize(s)}
            </option>
          ))}
        </Select>
        <Select className="max-w-36" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">Difficulty</option>
          {['easy', 'medium', 'hard'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      {list.error ? <ErrorBanner message={list.error} onRetry={list.reload} /> : null}
      {list.loading ? <ListSkeleton /> : null}
      <div className="space-y-2">
        {list.items.map((row) => (
          <Card key={row.id} className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium leading-6">{row.prompt}</p>
              <p className="text-sm text-ink-soft">
                {row.technology} · {labelize(row.status)} · confidence {row.confidence}
              </p>
            </div>
            <Badge>{row.difficulty ?? 'medium'}</Badge>
          </Card>
        ))}
      </div>
      {!list.loading && list.items.length === 0 ? <EmptyState title="No questions yet" hint="Save every question you are asked." /> : null}
      <Pagination page={list.meta.page} pages={list.meta.pages} total={list.meta.total} onPage={list.setPage} />
      <Drawer open={open} title="Save question" onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={handleSubmit(async (v) => {
            try {
              await dataApi.createQuestion({ ...v, confidence: Number(v.confidence ?? 1) });
              push('Question saved');
              reset();
              setOpen(false);
              list.reload();
            } catch (err) {
              push(err instanceof ApiClientError ? err.message : 'Failed', 'err');
            }
          })}
        >
          <Field label="Question">
            <Textarea {...register('prompt', { required: true })} />
          </Field>
          <Field label="Technology">
            <Select {...register('technology', { required: true })}>
              {['javascript', 'typescript', 'react', 'nodejs', 'mongodb', 'system_design', 'dsa', 'other'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Your answer">
            <Textarea {...register('answer')} />
          </Field>
          <Button type="submit">Save</Button>
        </form>
      </Drawer>
    </div>
  );
}
