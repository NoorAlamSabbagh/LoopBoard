import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  ListSkeleton,
  PageHeader,
  Pagination,
  Progress,
  Select,
  TableShell,
  Textarea,
} from '@/components/ui';
import { useDebouncedValue, usePagedList } from '@/hooks/usePagedList';
import { dataApi } from '@/services/dataApi';
import { ApiClientError } from '@/services/api';
import { useUi } from '@/store/ui';
import type { Company } from '@/types/api';
import { labelize } from '@/utils/format';

const STATUSES = [
  'target',
  'high_priority',
  'medium_priority',
  'low_priority',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'not_interested',
];

export function CompaniesPage() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const dq = useDebouncedValue(q);
  const list = usePagedList(dataApi.companies, { q: dq, targetStatus: status || undefined, sort: '-priority' }, 50);
  const { register, handleSubmit, reset } = useForm<Record<string, string | number>>();
  const push = useUi((s) => s.push);
  const [seeding, setSeeding] = useState(false);

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Research, status, and cached target scores."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              type="button"
              disabled={seeding}
              onClick={async () => {
                setSeeding(true);
                try {
                  const res = await dataApi.seedTargetCompanies();
                  const added = res.data?.added ?? 0;
                  const skipped = res.data?.skipped ?? 0;
                  push(
                    added
                      ? `Added ${added} target companies${skipped ? ` (${skipped} already there)` : ''}`
                      : 'All recommended companies are already on your list',
                  );
                  list.reload();
                } catch (err) {
                  push(err instanceof ApiClientError ? err.message : 'Could not load targets', 'err');
                } finally {
                  setSeeding(false);
                }
              }}
            >
              {seeding ? 'Loading…' : 'Load target companies'}
            </Button>
            <Button type="button" onClick={() => setOpen(true)}>
              Add company
            </Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search companies" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="max-w-52" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {labelize(s)}
            </option>
          ))}
        </Select>
      </div>
      {list.error ? <ErrorBanner message={list.error} onRetry={list.reload} /> : null}
      {list.loading ? <ListSkeleton /> : null}
      {!list.loading && list.items.length === 0 ? <EmptyState title="No companies" hint="Start your target list or clear filters." /> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.items.map((c) => (
          <Link key={c.id} to={`/companies/${c.id}`}>
            <Card className="h-full hover:border-accent/30 hover:shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[15px] font-semibold tracking-tight">{c.name}</p>
                <Badge tone="accent">{labelize(c.targetStatus)}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {c.industry ?? 'Industry n/a'} · {c.location ?? 'Location n/a'}
              </p>
              <p className="mt-3 text-xs text-ink-soft">Target score</p>
              <Progress value={c.targetScore ?? 0} />
              <p className="mt-1 text-sm">{c.targetScore ?? 0}%</p>
            </Card>
          </Link>
        ))}
      </div>
      <Pagination page={list.meta.page} pages={list.meta.pages} total={list.meta.total} onPage={list.setPage} />
      <Drawer open={open} title="New company" onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={handleSubmit(async (v) => {
            try {
              await dataApi.createCompany({ ...v, tier: v.tier ? Number(v.tier) : undefined, priority: v.priority ? Number(v.priority) : 3 });
              push('Company added');
              reset();
              setOpen(false);
              list.reload();
            } catch (err) {
              push(err instanceof ApiClientError ? err.message : 'Failed', 'err');
            }
          })}
        >
          <Field label="Name">
            <Input {...register('name', { required: true })} />
          </Field>
          <Field label="Location">
            <Input {...register('location')} />
          </Field>
          <Field label="Industry">
            <Input {...register('industry')} />
          </Field>
          <Field label="Website">
            <Input {...register('website')} />
          </Field>
          <Field label="Tier">
            <Select {...register('tier')}>
              <option value="">None</option>
              <option value="1">Tier 1</option>
              <option value="2">Tier 2</option>
              <option value="3">Tier 3</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select {...register('targetStatus')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">Create</Button>
        </form>
      </Drawer>
    </div>
  );
}

export function TargetsPage() {
  const [rows, setRows] = useState<Company[]>([]);
  const [seeding, setSeeding] = useState(false);
  const push = useUi((s) => s.push);

  async function loadRows() {
    const r = await dataApi.companies({ limit: 100 });
    setRows(r.data.filter((c) => !['rejected', 'not_interested', 'offer'].includes(c.targetStatus)));
  }

  useEffect(() => {
    void loadRows();
  }, []);

  const tiers = [1, 2, 3] as const;
  return (
    <div>
      <PageHeader
        title="Target companies"
        subtitle="Grouped by the tier you assigned. Load the starter list if this page is empty."
        actions={
          <Button
            type="button"
            disabled={seeding}
            onClick={async () => {
              setSeeding(true);
              try {
                const res = await dataApi.seedTargetCompanies();
                const added = res.data?.added ?? 0;
                push(added ? `Added ${added} target companies` : 'All recommended companies are already on your list');
                await loadRows();
              } catch (err) {
                push(err instanceof ApiClientError ? err.message : 'Could not load targets', 'err');
              } finally {
                setSeeding(false);
              }
            }}
          >
            {seeding ? 'Loading…' : 'Load target companies'}
          </Button>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title="No target companies yet" hint="Click Load target companies in the top right, or add one from Companies." />
      ) : null}
      <div className="space-y-6">
        {tiers.map((tier) => (
          <section key={tier}>
            <h2 className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-ink-soft uppercase">Tier {tier}</h2>
            <TableShell>
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Skill match</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((c) => c.tier === tier)
                    .map((c) => (
                      <tr key={c.id}>
                        <td>
                          <Link className="font-medium hover:text-accent-dark" to={`/companies/${c.id}`}>
                            {c.name}
                          </Link>
                        </td>
                        <td>
                          <Badge>{labelize(c.targetStatus)}</Badge>
                        </td>
                        <td>{c.skillMatch ?? '—'}%</td>
                        <td className="font-semibold">{c.targetScore ?? '—'}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </TableShell>
          </section>
        ))}
      </div>
    </div>
  );
}

export function CompanyDetailPage() {
  const { id } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const { register, handleSubmit } = useForm<Record<string, string>>();
  const push = useUi((s) => s.push);

  useEffect(() => {
    if (id) void dataApi.company(id).then((r) => setCompany(r.data));
  }, [id]);

  if (!company) return <EmptyState title="Loading company" hint="Fetching research and scores." />;

  return (
    <div>
      <PageHeader title={company.name} subtitle={`${company.industry ?? ''} ${company.location ?? ''}`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-xs text-ink-soft">Target score</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{company.targetScore ?? 0}%</p>
          <div className="mt-3">
            <Progress value={company.targetScore ?? 0} />
          </div>
        </Card>
        <Card>
          <p className="text-xs text-ink-soft">Skill match</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{company.skillMatch ?? 0}%</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-soft">Readiness</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{company.interviewReadiness ?? 0}%</p>
        </Card>
      </div>
      <Card className="mt-4">
        <p className="mb-3 font-medium">Update</p>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={handleSubmit(async (v) => {
            if (!id) return;
            try {
              const res = await dataApi.updateCompany(id, v);
              setCompany(res.data);
              push('Company updated');
            } catch (err) {
              push(err instanceof ApiClientError ? err.message : 'Failed', 'err');
            }
          })}
        >
          <Field label="Status">
            <Select defaultValue={company.targetStatus} {...register('targetStatus')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Website">
            <Input defaultValue={company.website} {...register('website')} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Notes">
              <Textarea defaultValue={company.notes} {...register('notes')} />
            </Field>
          </div>
          <Button type="submit">Save</Button>
        </form>
      </Card>
    </div>
  );
}
