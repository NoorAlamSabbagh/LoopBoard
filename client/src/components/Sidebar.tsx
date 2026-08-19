import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquare,
  NotebookPen,
  Settings,
  StickyNote,
  Target,
  Users,
  Waypoints,
} from 'lucide-react';
import { useState } from 'react';
import { LogoMark } from '@/components/Logo';
import { cn } from '@/utils/format';

type Item = { to: string; label: string; icon?: typeof LayoutDashboard };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/targets', label: 'Target companies', icon: Target },
      { to: '/companies', label: 'Companies', icon: Building2 },
    ],
  },
  {
    label: 'Job Search',
    items: [
      { to: '/applications', label: 'Applications', icon: ClipboardList },
      { to: '/jobs', label: 'Jobs', icon: Briefcase },
    ],
  },
  {
    label: 'Interviews',
    items: [
      { to: '/interviews', label: 'Upcoming', icon: Waypoints },
      { to: '/interviews/history', label: 'History', icon: BookOpen },
      { to: '/questions', label: 'Questions', icon: MessageSquare },
    ],
  },
  {
    label: 'Preparation',
    items: [
      { to: '/prep/topics', label: 'Topics', icon: BookOpen },
      { to: '/prep/notes', label: 'Notes & questions', icon: StickyNote },
      { to: '/prep/plan', label: 'Study plan', icon: NotebookPen },
      { to: '/prep/weak', label: 'Weak areas', icon: Target },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { to: '/questions', label: 'Question bank', icon: MessageSquare },
      { to: '/notes', label: 'Notes', icon: StickyNote },
      { to: '/skills', label: 'Skills', icon: Waypoints },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/recruiters', label: 'Recruiters', icon: Users },
      { to: '/contacts', label: 'Contacts', icon: Users },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/resumes', label: 'Resumes', icon: FileText },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  return (
    <div className="flex h-full flex-col bg-sidebar text-white">
      <div className="flex h-14 items-center gap-2.5 border-b border-white/8 px-4">
        <LogoMark className="h-7 w-7" />
        <div>
          <p className="text-[13px] font-semibold tracking-tight">Loopboard</p>
          <p className="text-[11px] text-white/40">Personal ATS</p>
        </div>
      </div>
      <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
        {groups.map((group) => (
          <NavGroup key={group.label} group={group} path={location.pathname} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="border-t border-white/8 p-3">
        <div className="rounded-lg bg-white/6 px-3 py-2.5">
          <p className="text-[11px] font-medium text-accent">Close the loop</p>
          <p className="mt-0.5 text-[11px] leading-4 text-white/45">Interview → questions → prep → next target</p>
        </div>
      </div>
    </div>
  );
}

function NavGroup({
  group,
  path,
  onNavigate,
}: {
  group: Group;
  path: string;
  onNavigate?: () => void;
}) {
  const active = group.items.some((i) => (i.to === '/' ? path === '/' : path.startsWith(i.to)));
  const [open, setOpen] = useState(active || group.label === 'Overview');

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-medium text-white/35"
        onClick={() => setOpen((v) => !v)}
      >
        {group.label}
        <ChevronDown className={cn('h-3 w-3 transition', open ? 'rotate-0' : '-rotate-90')} />
      </button>
      {open ? (
        <div className="mt-0.5 space-y-px">
          {group.items.map((item) => {
            const Icon = item.icon ?? LayoutDashboard;
            return (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-2 py-[7px] text-[13px] text-white/60 hover:bg-white/6 hover:text-white',
                    isActive && 'bg-accent/20 text-white',
                  )
                }
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
