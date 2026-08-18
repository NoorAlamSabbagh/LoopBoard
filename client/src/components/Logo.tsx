import { cn } from '@/utils/format';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#4F46E5" />
      <path
        d="M11 16.5a5.5 5.5 0 1 1 5.5 5.5H12"
        fill="none"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M12 22h8.5" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="22.5" cy="22" r="1.6" fill="white" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  wordmark = true,
  inverted = false,
}: {
  className?: string;
  markClassName?: string;
  wordmark?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className={cn('h-8 w-8', markClassName)} />
      {wordmark ? (
        <span className={cn('text-[15px] font-semibold tracking-tight', inverted ? 'text-white' : 'text-ink')}>
          Loopboard
        </span>
      ) : null}
    </div>
  );
}
