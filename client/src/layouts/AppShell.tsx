import { LogOut, Menu, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/NotificationBell';
import { Sidebar } from '@/components/Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button, Input } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/usePagedList';
import { dataApi } from '@/services/dataApi';
import { useAuth } from '@/store/auth';
import { useUi } from '@/store/ui';
import { cn } from '@/utils/format';

const SEARCH_ROUTES: Record<string, (id: string) => string> = {
  companies: (id) => `/companies/${id}`,
  interviews: (id) => `/interviews/${id}`,
  questions: () => '/questions',
  jobs: () => '/jobs',
  notes: () => '/notes',
  recruiters: () => '/recruiters',
  topics: () => '/prep/topics',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen, toasts, dismiss } = useUi();
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 280);
  const [results, setResults] = useState<Record<string, unknown[]> | null>(null);

  useEffect(() => {
    if (!dq.trim()) {
      setResults(null);
      return;
    }
    void dataApi
      .search(dq)
      .then((res) => setResults(res.data))
      .catch(() => setResults(null));
  }, [dq]);

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-svh bg-paper">
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-0 h-svh">
          <Sidebar />
        </div>
      </aside>
      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-ink/50" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />
          <div className="relative h-full w-60">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-card/90 px-4 backdrop-blur">
          <Button variant="ghost" className="lg:hidden" onClick={() => setSidebarOpen(true)} type="button">
            <Menu className="h-4 w-4" />
          </Button>
          <div className="relative min-w-0 max-w-xl flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-ink-soft" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search companies, interviews, questions…"
              className="border-line bg-paper pl-9"
              aria-label="Global search"
            />
            {results ? (
              <div className="absolute z-20 mt-1.5 max-h-80 w-full overflow-auto rounded-lg border border-line bg-card p-1.5 text-[13px] shadow-lg">
                {Object.entries(results).every(([, items]) => !items?.length) ? (
                  <p className="px-2 py-3 text-ink-soft">No matches for “{dq}”.</p>
                ) : null}
                {Object.entries(results).map(([key, items]) =>
                  items?.length ? (
                    <div key={key} className="mb-1">
                      <p className="px-2 py-1 text-[11px] font-medium text-ink-soft">{key}</p>
                      {items.slice(0, 5).map((item, i) => {
                        const rec = item as { id?: string; name?: string; prompt?: string; title?: string };
                        const href = rec.id && SEARCH_ROUTES[key] ? SEARCH_ROUTES[key](rec.id) : undefined;
                        return (
                          <button
                            key={rec.id ?? i}
                            type="button"
                            className="block w-full truncate rounded-md px-2 py-1.5 text-left hover:bg-paper"
                            onClick={() => {
                              if (href) navigate(href);
                              setQ('');
                              setResults(null);
                            }}
                          >
                            {rec.name ?? rec.prompt ?? rec.title ?? 'Result'}
                          </button>
                        );
                      })}
                    </div>
                  ) : null,
                )}
              </div>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white">
                {initials}
              </span>
              <span className="max-w-28 truncate text-[13px] font-medium">{user?.name}</span>
              <Button
                variant="ghost"
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-6 sm:px-8">{children}</main>
      </div>
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 space-y-2">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={cn(
              'pointer-events-auto block w-80 rounded-lg border px-3.5 py-2.5 text-left text-[13px] shadow-lg',
              t.tone === 'err' ? 'border-danger/20 bg-card text-danger' : 'border-line bg-card text-ink',
            )}
          >
            {t.message}
          </button>
        ))}
      </div>
    </div>
  );
}
