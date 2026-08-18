import { DndContext, type DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge, Button, Drawer, EmptyState, ErrorBanner, Field, Input, ListSkeleton, PageHeader, Pagination, Select, TableShell } from '@/components/ui';
import { useDebouncedValue, usePagedList } from '@/hooks/usePagedList';
import { dataApi } from '@/services/dataApi';
import { useUi } from '@/store/ui';
import type { Application, Company, Job } from '@/types/api';
import { labelize } from '@/utils/format';
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
  const { register, handleSubmit, reset } = useForm<Record<string, string>>();
  const push = useUi((s) => s.push);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);

  async function load() {
    setBoardLoading(true);
    setBoardError(null);
    try {
      const [b, c, j] = await Promise.all([dataApi.board(), dataApi.companies({ limit: 100 }), dataApi.jobs({ limit: 100 })]);
      setBoard(b.data);
      setCompanies(c.data);
      setJobs(j.data);
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
    } catch (err) {
      push(err instanceof ApiClientError ? err.message : 'Could not move card', 'err');
    }
  }

  return (
    <div>
      <PageHeader
        title="Applications"
        subtitle="Kanban pipeline. Withdrawn and closed stay in the table filters later."
        actions={
          <div className="flex gap-2">
            <Button variant={view === 'board' ? 'primary' : 'secondary'} type="button" onClick={() => setView('board')}>
              Board
            </Button>
            <Button variant={view === 'table' ? 'primary' : 'secondary'} type="button" onClick={() => setView('table')}>
              Table
            </Button>
            <Button type="button" onClick={() => setOpen(true)}>
              New application
            </Button>
          </div>
        }
      />
      {view === 'table' ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <Input className="max-w-xs" placeholder="Search title or source" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select className="max-w-52" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {['saved', 'applied', 'recruiter_contacted', 'screening', 'interview_scheduled', 'interviewing', 'offer', 'rejected', 'withdrawn', 'closed'].map(
                (s) => (
                  <option key={s} value={s}>
                    {labelize(s)}
                  </option>
                ),
              )}
            </Select>
          </div>
          {table.error ? <ErrorBanner message={table.error} onRetry={table.reload} /> : null}
          {table.loading ? <ListSkeleton /> : null}
          {!table.loading && table.items.length === 0 ? <EmptyState title="No applications" hint="Adjust filters or add one." /> : null}
          <TableShell>
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {table.items.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.title}</td>
                    <td>
                      <Badge>{labelize(row.status)}</Badge>
                    </td>
                    <td className="text-ink-soft">{row.source ?? '—'}</td>
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
            <EmptyState title="No applications yet" hint="Create a company and job first, then add an application." />
          ) : null}
          <DndContext onDragEnd={(e) => void onDragEnd(e)}>
            <div className="mt-2 flex gap-3 overflow-x-auto pb-6">
              {COLUMNS.map((col) => (
                <Column key={col} id={col} title={labelize(col)} items={board[col] ?? []} />
              ))}
            </div>
          </DndContext>
        </>
      )}
      <Drawer open={open} title="New application" onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={handleSubmit(async (values) => {
            try {
              await dataApi.createApplication(values);
              push('Application created');
              reset();
              setOpen(false);
              await load();
              table.reload();
            } catch (err) {
              push(err instanceof ApiClientError ? err.message : 'Could not create', 'err');
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
          <Field label="Job">
            <Select {...register('jobId', { required: true })}>
              <option value="">Select</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input {...register('title', { required: true })} />
          </Field>
          <Button type="submit">Create</Button>
        </form>
      </Drawer>
    </div>
  );
}

function Column({ id, title, items }: { id: string; title: string; items: Application[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const dot = COLUMN_DOT[id as (typeof COLUMNS)[number]] ?? 'bg-accent';
  return (
    <div
      ref={setNodeRef}
      className={`w-[260px] shrink-0 rounded-xl border border-line bg-card p-2 ${isOver ? 'border-accent bg-accent/5' : ''}`}
    >
      <p className="mb-2 flex items-center gap-2 px-1.5 pt-1 text-[12px] font-medium text-ink-soft">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {title}
        <span className="ml-auto text-[11px]">{items.length}</span>
      </p>
      <div className="min-h-24 space-y-2">
        {items.map((item) => (
          <CardItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function CardItem({ item }: { item: Application }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`cursor-grab rounded-lg border border-line bg-paper p-3 ${isDragging ? 'opacity-60' : 'hover:border-ink/20'}`}
    >
      <p className="text-[13px] font-medium leading-5">{item.title}</p>
      <div className="mt-2">
        <Badge>{labelize(item.status)}</Badge>
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
        title="Jobs"
        subtitle="Roles you are tracking."
        actions={
          <Button type="button" onClick={() => setOpen(true)}>
            Add job
          </Button>
        }
      />
      <Input className="mb-4 max-w-xs" placeholder="Search jobs" value={q} onChange={(e) => setQ(e.target.value)} />
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
          <Field label="Title">
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
