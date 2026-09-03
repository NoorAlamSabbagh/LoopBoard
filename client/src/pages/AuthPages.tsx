import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Field, Input, PasswordInput } from '@/components/ui';
import { ApiClientError } from '@/services/api';
import { authApi } from '@/services/dataApi';
import { useAuth } from '@/store/auth';
import { useUi } from '@/store/ui';

export function LoginPage() {
  const { register, handleSubmit } = useForm<{ email: string; password: string }>();
  const setSession = useAuth((s) => s.setSession);
  const navigate = useNavigate();
  const push = useUi((s) => s.push);

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        try {
          const res = await authApi.login(values);
          setSession(res.data.user, res.data.accessToken);
          push('Login successful!', 'ok');
          navigate('/');
        } catch (err) {
          push(err instanceof ApiClientError ? err.message : 'Login failed', 'err');
        }
      })}
    >
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Welcome back</h1>
        <p className="text-[13px] text-white/55">Sign in to continue.</p>
      </div>
      <Field label="Email">
        <Input type="email" autoComplete="email" {...register('email', { required: true })} />
      </Field>
      <Field label="Password">
        <PasswordInput autoComplete="current-password" {...register('password', { required: true })} />
      </Field>
      <Button className="h-10 w-full" type="submit">
        Sign in
      </Button>
      <div className="flex justify-between text-sm">
        <Link className="font-medium hover:underline" to="/register">
          Create account
        </Link>
        <Link className="hover:underline" to="/forgot-password">
          Forgot password
        </Link>
      </div>
    </form>
  );
}

export function RegisterPage() {
  const { register, handleSubmit } = useForm<{ name: string; email: string; password: string }>();
  const setSession = useAuth((s) => s.setSession);
  const navigate = useNavigate();
  const push = useUi((s) => s.push);

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        try {
          const res = await authApi.register(values);
          setSession(res.data.user, res.data.accessToken);
          push('Account created successfully!', 'ok');
          navigate('/');
        } catch (err) {
          push(err instanceof ApiClientError ? err.message : 'Could not register', 'err');
        }
      })}
    >
      <h1 className="text-[22px] font-semibold tracking-tight">Create your workspace</h1>
      <p className="text-[13px] text-ink-soft">A personal ATS for engineers — not another spreadsheet.</p>
      <Field label="Name">
        <Input {...register('name', { required: true })} />
      </Field>
      <Field label="Email">
        <Input type="email" {...register('email', { required: true })} />
      </Field>
      <Field label="Password">
        <PasswordInput autoComplete="new-password" {...register('password', { required: true, minLength: 8 })} />
      </Field>
      <Button className="w-full" type="submit">
        Create account
      </Button>
      <p className="text-sm text-ink-soft">
        Already have an account?{' '}
        <Link className="font-medium text-accent-dark hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPage() {
  const { register, handleSubmit } = useForm<{ email: string }>();
  const push = useUi((s) => s.push);
  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        await authApi.forgot(values.email);
        push('If that email exists, a reset token was issued (check server logs in development).');
      })}
    >
      <h1 className="text-xl font-semibold">Reset password</h1>
      <Field label="Email">
        <Input type="email" {...register('email', { required: true })} />
      </Field>
      <Button className="w-full" type="submit">
        Send reset
      </Button>
      <Link className="block text-sm text-ink-soft" to="/login">
        Back to sign in
      </Link>
    </form>
  );
}

export function ResetPage() {
  const { register, handleSubmit } = useForm<{ token: string; password: string }>();
  const navigate = useNavigate();
  const push = useUi((s) => s.push);
  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        try {
          await authApi.reset(values.token, values.password);
          push('Password updated. Sign in.');
          navigate('/login');
        } catch (err) {
          push(err instanceof ApiClientError ? err.message : 'Reset failed', 'err');
        }
      })}
    >
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <Field label="Reset token">
        <Input {...register('token', { required: true })} />
      </Field>
      <Field label="New password">
        <PasswordInput autoComplete="new-password" {...register('password', { required: true, minLength: 8 })} />
      </Field>
      <Button className="w-full" type="submit">
        Update password
      </Button>
    </form>
  );
}
