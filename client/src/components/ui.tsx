import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Eye, EyeOff, Inbox } from 'lucide-react';
import { cn } from '@/utils/format';

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-accent text-white hover:bg-accent-dark dark:text-sidebar',
    secondary: 'bg-card text-ink border border-line hover:bg-paper',
    ghost: 'text-ink-soft hover:bg-paper-2 hover:text-ink',
    danger: 'bg-danger text-white hover:bg-[#b42318]',
  };
  return (
    <button
      className={cn(
        'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-[13px] font-medium transition-colors disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-line bg-card px-3 text-[13px] text-ink outline-none placeholder:text-ink-soft focus:border-accent focus:ring-2 focus:ring-accent/20',
        className,
      )}
      {...props}
    />
  );
}

export function PasswordInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn('pr-10', className)}
      />
      <button
        type="button"
        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-current opacity-70 hover:opacity-100"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full min-h-28 rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-lg border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'ok' | 'warn' | 'danger';
}) {
  const map = {
    neutral: 'bg-paper-2 text-ink-soft',
    accent: 'bg-accent/10 text-accent-dark',
    ok: 'bg-ok/10 text-ok',
    warn: 'bg-warn/10 text-warn',
    danger: 'bg-danger/10 text-danger',
  };
  return (
    <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium', map[tone])}>
      {children}
    </span>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-2">
      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] leading-7 font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-[13px] leading-5 text-ink-soft">{subtitle}</p> : null}
        <span className="mt-3 block h-0.5 w-8 rounded-full bg-accent" />
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-card px-6 py-14 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
        <Inbox className="h-5 w-5" />
      </span>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-ink-soft">{hint}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-paper-2', className)} />;
}

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-ink/40" aria-label="Close drawer" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-line bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button variant="ghost" onClick={onClose} type="button">
            Close
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <button className="absolute inset-0 bg-ink/40" aria-label="Cancel" onClick={onCancel} />
      <div className="relative z-10 w-[min(92vw,400px)] rounded-xl border border-line bg-card p-5 shadow-xl">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-[13px] leading-6 text-ink-soft">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} type="button">
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
      <p>{message}</p>
      {onRetry ? (
        <Button variant="secondary" type="button" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-soft">
      <p>
        {total} result{total === 1 ? '' : 's'} · page {page} of {pages}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">{children}</div>;
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14" />
      ))}
    </div>
  );
}
