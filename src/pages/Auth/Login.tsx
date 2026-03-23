import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Common/Button';
import { API_ENDPOINTS } from '../../constants/api';
import { DEMO_ACCESS_TOKEN, isDemoCredentials } from '../../constants/demoAuth';
import { apiClient } from '../../services/api';
import { useAppDispatch } from '../../store';
import { setRememberMe, setToken, setUser } from '../../store/slices/authSlice';
import { getApiErrorMessage } from '../../utils/apiError';
import { extractAccessRefresh, extractAuthUser } from '../../utils/authTokens';
import { AuthShell } from './AuthShell';
import { loginSchema, type LoginFormValues } from './authSchemas';

export function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const state = location.state as { from?: string; message?: string } | undefined;
  const flashMessage = state?.message ?? null;
  const authPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/'];
  const redirectTo =
    state?.from && !authPaths.includes(state.from) ? state.from : '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setFormError(null);
    if (isDemoCredentials(data.email, data.password)) {
      dispatch(setRememberMe(data.rememberMe));
      dispatch(
        setUser({
          id: 'demo-admin',
          email: 'admin@demo.local',
          name: 'Admin',
        })
      );
      dispatch(
        setToken({
          accessToken: DEMO_ACCESS_TOKEN,
          refreshToken: null,
        })
      );
      navigate(redirectTo, { replace: true });
      return;
    }
    try {
      const res = await apiClient.post(API_ENDPOINTS.auth.login, {
        email: data.email,
        password: data.password,
      });
      const { accessToken, refreshToken } = extractAccessRefresh(res.data);
      if (!accessToken) {
        setFormError('Login succeeded but no access token was returned.');
        return;
      }
      dispatch(setRememberMe(data.rememberMe));
      const user = extractAuthUser(res.data);
      if (user) {
        dispatch(setUser(user));
      } else {
        const email = data.email.trim();
        dispatch(
          setUser({
            id: 'session',
            email,
            name: email.includes('@') ? email.split('@')[0] : email,
          })
        );
      }
      dispatch(
        setToken({
          accessToken,
          refreshToken: refreshToken ?? null,
        })
      );
      navigate(redirectTo, { replace: true });
    } catch (e) {
      setFormError(getApiErrorMessage(e, 'Sign in failed'));
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to MORPHEUS">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {flashMessage ? (
          <div
            role="status"
            className="rounded-lg border border-emerald/40 bg-emerald/10 px-3 py-2 text-sm text-navy dark:border-emerald/40 dark:bg-emerald/15 dark:text-emerald"
          >
            {flashMessage}
          </div>
        ) : null}
        {formError ? (
          <div
            role="alert"
            className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red dark:border-red/50 dark:bg-red/15 dark:text-red"
          >
            {formError}
          </div>
        ) : null}

        <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-xs text-navy/80 dark:text-white/70">
          Demo account: username <span className="font-mono text-steel">admin</span> · password{' '}
          <span className="font-mono text-steel">pass1234</span>
        </p>

        <div>
          <label htmlFor="login-email" className="text-sm font-medium text-navy dark:text-white">
            Username or email
          </label>
          <input
            id="login-email"
            type="text"
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy transition-colors focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25 dark:border-white/10 dark:bg-navy dark:text-white"
            {...register('email')}
          />
          {errors.email ? (
            <p className="mt-1 text-xs text-red" role="alert">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="login-password" className="text-sm font-medium text-navy dark:text-white">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy transition-colors focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25 dark:border-white/10 dark:bg-navy dark:text-white"
            {...register('password')}
          />
          {errors.password ? (
            <p className="mt-1 text-xs text-red" role="alert">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-navy dark:text-white">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-navy/30 text-emerald focus:ring-emerald dark:border-white/30"
              {...register('rememberMe')}
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-emerald transition-colors hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="text-center text-sm text-gray dark:text-gray">
          No account?{' '}
          <Link to="/signup" className="font-medium text-emerald transition-colors hover:underline">
            Sign Up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
