import { Navigate, Outlet } from 'react-router-dom';
import { AppShell } from '@/layouts/AppShell';
import { useAuth } from '@/store/auth';
import { Skeleton } from '@/components/ui';
import { Logo } from '@/components/Logo';

export function ProtectedLayout() {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="grid min-h-svh place-items-center bg-paper">
        <div className="text-center">
          <Skeleton className="mx-auto h-10 w-10 rounded-lg" />
          <p className="mt-3 text-[13px] text-ink-soft">Loading workspace…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function GuestLayout() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="grid min-h-svh bg-[#0c111d] lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
      <section className="relative hidden overflow-hidden text-white lg:flex lg:flex-col">
        <img src="/login-hero.png" alt="" className="absolute inset-0 h-full w-full object-cover object-left" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(12,17,29,0.78) 0%, rgba(12,17,29,0.42) 55%, rgba(12,17,29,1) 100%)',
          }}
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <Logo inverted />
          <div>
            <p className="max-w-md text-4xl leading-tight font-semibold tracking-tight">
              Track every round. Close the prep loop.
            </p>
            <p className="mt-4 max-w-sm text-[15px] leading-7 text-white/70">
              Applications, interviews, questions, and skill gaps in one workspace for software engineers.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {['Companies', 'Pipeline', 'Prep loop'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[12px] text-white/80"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[12px] text-white/40">Personal ATS + interview knowledge base</p>
        </div>
      </section>

      <section className="relative z-10 grid place-items-center bg-[#0c111d] px-5 py-10">
        <div className="w-full max-w-[400px]">
          <Logo inverted className="mb-8 lg:hidden" />
          <div className="auth-panel rounded-2xl border border-white/10 bg-[#161b2c] p-8">
            <Outlet />
          </div>
        </div>
      </section>
    </div>
  );
}
