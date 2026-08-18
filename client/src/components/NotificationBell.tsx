import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { dataApi } from '@/services/dataApi';
import type { NotificationItem } from '@/types/api';
import { formatDate, cn } from '@/utils/format';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const unread = items.length;

  async function load() {
    const res = await dataApi.notifications({ limit: 20, unread: 'true' });
    setItems(res.data);
  }

  useEffect(() => {
    void load().catch(() => undefined);
    const t = window.setInterval(() => void load().catch(() => undefined), 60_000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={cn(
          'relative grid h-10 w-10 place-items-center rounded-full border transition',
          open || unread
            ? 'border-accent/35 bg-accent/12 text-accent shadow-[0_0_0_4px_rgba(79,70,229,0.12)]'
            : 'border-line bg-paper text-ink-soft hover:border-accent/30 hover:bg-accent/10 hover:text-accent',
        )}
      >
        <Bell className="h-[22px] w-[22px]" strokeWidth={2} fill={unread ? 'currentColor' : 'none'} />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger/50" />
            <span className="relative inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ring-2 ring-card">
              {unread > 9 ? '9+' : unread}
            </span>
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[22rem] overflow-hidden rounded-xl border border-line bg-card shadow-[0_16px_40px_-20px_rgba(16,24,40,0.45)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[13px] font-semibold">Notifications</p>
            {unread > 0 ? (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">{unread} new</span>
            ) : (
              <span className="text-[11px] text-ink-soft">All caught up</span>
            )}
          </div>
          {unread === 0 ? (
            <div className="px-4 py-8 text-center">
              <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-paper text-ink-soft">
                <Bell className="h-4 w-4" />
              </span>
              <p className="text-[13px] text-ink-soft">You are caught up.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-auto p-1.5">
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="flex w-full gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-paper"
                  onClick={async () => {
                    await dataApi.readNotification(n.id);
                    await load();
                  }}
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <span>
                    <p className="text-[13px] font-medium">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-4 text-ink-soft">
                      {n.body} · {formatDate(n.dueAt)}
                    </p>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
