import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Common/Button';
import { API_ENDPOINTS } from '../../constants/api';
import { apiClient } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { AuthShell } from './AuthShell';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { resetPasswordSchema, type ResetPasswordFormValues } from './authSchemas';

export function ResetPassword() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      otp: '',
      password: '',
      confirmPassword: '',
    },
  });

  const pwd = watch('password') ?? '';

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setFormError(null);
    try {
      await apiClient.post(API_ENDPOINTS.auth.resetPassword, {
        otp: data.otp,
        password: data.password,
      });
      navigate('/login', {
        replace: true,
        state: { message: 'Password updated. You can sign in with your new password.' },
      });
    } catch (e) {
      setFormError(getApiErrorMessage(e, 'Could not reset password'));
    }
  };

  return (
    <AuthShell title="Reset password" subtitle="Enter the code from your email">
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
          <label htmlFor="reset-otp" className="text-sm font-medium text-navy dark:text-white">
            One-time code (6 digits)
          </label>
          <input
            id="reset-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="mt-1 w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-center font-mono text-lg tracking-[0.35em] text-navy transition-colors focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25 dark:border-white/10 dark:bg-navy dark:text-white"
            {...register('otp')}
          />
          {errors.otp ? (
            <p className="mt-1 text-xs text-red" role="alert">
              {errors.otp.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="reset-password" className="text-sm font-medium text-navy dark:text-white">
            New password
          </label>
          <input
            id="reset-password"
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
          <label htmlFor="reset-confirm" className="text-sm font-medium text-navy dark:text-white">
            Confirm new password
          </label>
          <input
            id="reset-confirm"
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

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {isSubmitting ? 'Updating…' : 'Update password'}
        </Button>

        <p className="text-center text-sm text-gray dark:text-gray">
          <Link to="/login" className="font-medium text-emerald transition-colors hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
