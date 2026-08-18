import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Briefcase,
  Building2,
  CalendarClock,
  CircleCheck,
  CircleX,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react';
import { Badge, Card, EmptyState, Progress, Skeleton } from '@/components/ui';
import { dataApi } from '@/services/dataApi';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import type { DashboardData } from '@/types/api';
import { formatDate, labelize } from '@/utils/format';

const KPI_META = [
  { key: 'Companies', icon: Building2 },
  { key: 'Applications', icon: Briefcase },
  { key: 'Upcoming', icon: CalendarClock },
  { key: 'Offers', icon: CircleCheck },
  { key: 'Rejections', icon: CircleX },
  { key: 'Pending', icon: Timer },
  { key: 'Targeting', icon: Target },
  { key: 'Prep', icon: Sparkles },
] as const;

export function DashboardPage() {
  const user = useAuth((s) => s.user);
  const dark = useTheme((s) => s.mode) === 'dark';
  const chartTick = dark ? '#98a2b3' : '#667085';
  const chartGrid = dark ? '#1d2939' : '#eef0f4';
  const chartBorder = dark ? '#2d3648' : '#e4e7ec';
  const chartBg = dark ? '#161b2c' : '#ffffff';
  const first = user?.name?.split(' ')[0] ?? 'there';
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void dataApi
      .dashboard()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!data) return <EmptyState title="Dashboard unavailable" hint="Start the API, then refresh." />;

  const kpis = [
    ['Companies', data.kpis.totalCompanies],
    ['Applications', data.kpis.totalApplications],
    ['Upcoming', data.kpis.upcoming],
    ['Offers', data.kpis.offers],
    ['Rejections', data.kpis.rejections],
    ['Pending', data.kpis.pending],
    ['Targeting', data.kpis.targeting],
    ['Prep', `${data.kpis.prepProgress}%`],
  ] as const;

  return (
    <div>
      <Card className="mb-5 overflow-hidden border-accent/15 bg-accent/5 p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[13px] font-medium text-accent">Welcome back, {first}</p>
            <h1 className="mt-0.5 text-[22px] font-semibold tracking-tight">Your targeting loop</h1>
            <p className="mt-1 text-[13px] text-ink-soft">Pipeline, interviews, and what to study next.</p>
          </div>
          <div className="hidden rounded-xl bg-accent/10 px-4 py-3 text-right sm:block">
            <p className="text-[11px] text-ink-soft">Prep progress</p>
            <p className="text-xl font-semibold text-accent-dark">{data.kpis.prepProgress}%</p>
          </div>
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([label, value], i) => {
          const meta = KPI_META[i];
          const Icon = meta?.icon ?? Sparkles;
          return (
            <Card key={label} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-ink-soft">{label}</p>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
            </Card>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="mb-4 text-[15px] font-semibold">Intelligence</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Insight label="Strongest" value={data.insights.strongestArea ?? 'Add skills'} />
            <Insight label="Weakest" value={data.insights.weakestArea ?? 'Need more interviews'} />
            <Insight label="Most asked" value={data.insights.mostAskedTechnology ?? '—'} />
            <Insight label="Next target" value={data.insights.recommendedNextTarget ?? 'Add companies'} />
          </div>
          <p className="mt-4 text-[13px] text-ink-soft">
            Highest skill match: {data.insights.highestSkillMatch.join(', ') || '—'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.insights.recommendedPreparation.map((item) => (
              <Badge key={item} tone="accent">
                {item}
              </Badge>
            ))}
          </div>
        </Card>
        <Card>
          <p className="mb-4 text-[15px] font-semibold">Upcoming interviews</p>
          {data.upcomingInterviews.length === 0 ? (
            <p className="text-[13px] text-ink-soft">Nothing scheduled. Add a round from Applications.</p>
          ) : (
            <ul className="space-y-3">
              {data.upcomingInterviews.map((i) => (
                <li key={i.id} className="rounded-lg border border-line p-3">
                  <Link to={`/interviews/${i.id}`} className="text-[13px] font-medium hover:text-accent-dark">
                    {i.roundName}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {labelize(i.type)} · {formatDate(i.scheduledAt)}
                  </p>
                  <div className="mt-2">
                    <Progress value={data.kpis.prepProgress} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card className="h-80">
          <p className="mb-3 text-[15px] font-semibold">Questions by technology</p>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.technologies}>
              <CartesianGrid stroke={chartGrid} vertical={false} />
              <XAxis dataKey="technology" tick={{ fontSize: 11, fill: chartTick, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chartTick, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${chartBorder}`, background: chartBg, color: dark ? '#f2f4f7' : '#101828', boxShadow: 'none', fontSize: 12 }} />
              <Bar dataKey="percent" fill={dark ? '#818cf8' : '#4f46e5'} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <p className="mb-4 text-[15px] font-semibold">Recent activity</p>
          {data.recentActivity.length === 0 ? (
            <p className="text-[13px] text-ink-soft">Add a company or question to start the feed.</p>
          ) : (
            <ul className="space-y-3 text-[13px]">
              {data.recentActivity.map((a, i) => (
                <li key={a.id ?? i} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span className="leading-5 text-ink">{a.summary}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-3.5">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 text-[15px] font-semibold tracking-tight">{value}</p>
    </div>
  );
}
