import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Common/Button';
import { API_ENDPOINTS } from '../../constants/api';
import { apiClient } from '../../services/api';
import { useAppDispatch } from '../../store';
import { setRememberMe, setToken, setUser } from '../../store/slices/authSlice';
import { getApiErrorMessage } from '../../utils/apiError';
import { extractAccessRefresh, extractAuthUser } from '../../utils/authTokens';
import { AuthShell } from './AuthShell';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { signupSchema, type SignupFormValues } from './authSchemas';

export function Signup() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      riskTolerance: 'moderate',
      acceptTerms: false,
    },
  });

  const pwd = watch('password') ?? '';

  const onSubmit = async (data: SignupFormValues) => {
    setFormError(null);
    try {
      const res = await apiClient.post(API_ENDPOINTS.auth.register, {
        username: data.username,
        email: data.email,
        password: data.password,
        risk_tolerance: data.riskTolerance,
      });
      const { accessToken, refreshToken } = extractAccessRefresh(res.data);
      if (accessToken) {
        dispatch(setRememberMe(true));
        const user = extractAuthUser(res.data);
        if (user) {
          dispatch(setUser(user));
        } else {
          dispatch(
            setUser({
              id: data.email,
              email: data.email,
              name: data.username,
            })
          );
        }
        dispatch(
          setToken({
            accessToken,
            refreshToken: refreshToken ?? null,
          })
        );
        navigate('/dashboard', { replace: true });
        return;
      }

      const loginRes = await apiClient.post(API_ENDPOINTS.auth.login, {
        email: data.email,
        password: data.password,
      });
      const tokens = extractAccessRefresh(loginRes.data);
      if (!tokens.accessToken) {
        navigate('/login', {
          replace: true,
          state: { message: 'Account created. Please sign in.' },
        });
        return;
      }
      dispatch(setRememberMe(true));
      dispatch(
        setUser(
          extractAuthUser(loginRes.data) ?? {
            id: data.email,
            email: data.email,
            name: data.username,
          }
        )
      );
      dispatch(
        setToken({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
        })
      );
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setFormError(getApiErrorMessage(e, 'Could not create account'));
    }
  };

  return (
    <AuthShell title="Create account" subtitle="Join MORPHEUS analytics">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError ? (
          <div
            role="alert"
            className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red dark:border-red/50 dark:bg-red/15 dark:text-red"
          >
            {formError}
          </div>
        ) : null}

        <div>
          <label htmlFor="signup-username" className="text-sm font-medium text-navy dark:text-white">
            Username
          </label>
          <input
            id="signup-username"
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy transition-colors focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25 dark:border-white/10 dark:bg-navy dark:text-white"
            {...register('username')}
          />
          {errors.username ? (
            <p className="mt-1 text-xs text-red" role="alert">
              {errors.username.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="signup-email" className="text-sm font-medium text-navy dark:text-white">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
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
          <label htmlFor="signup-password" className="text-sm font-medium text-navy dark:text-white">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy transition-colors focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25 dark:border-white/10 dark:bg-navy dark:text-white"
            {...register('password')}
          />
          <PasswordStrengthMeter password={pwd} />
          {errors.password ? (
            <p className="mt-1 text-xs text-red" role="alert">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="signup-confirm" className="text-sm font-medium text-navy dark:text-white">
            Confirm password
          </label>
          <input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy transition-colors focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25 dark:border-white/10 dark:bg-navy dark:text-white"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <p className="mt-1 text-xs text-red" role="alert">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <div>
          <span className="text-sm font-medium text-navy dark:text-white">Risk tolerance</span>
          <select
            id="signup-risk"
            className="mt-1 w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy transition-colors focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25 dark:border-white/10 dark:bg-navy dark:text-white"
            {...register('riskTolerance')}
          >
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
          {errors.riskTolerance ? (
            <p className="mt-1 text-xs text-red" role="alert">
              {errors.riskTolerance.message}
            </p>
          ) : null}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-navy dark:text-white">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-navy/30 text-emerald focus:ring-emerald dark:border-white/30"
              {...register('acceptTerms')}
            />
            <span>I agree to the Terms of Service and Privacy Policy.</span>
          </label>
          {errors.acceptTerms ? (
            <p className="mt-1 text-xs text-red" role="alert">
              {errors.acceptTerms.message}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-center text-sm text-gray dark:text-gray">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-emerald transition-colors hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
