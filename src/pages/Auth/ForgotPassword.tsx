import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Common/Button';
import { API_ENDPOINTS } from '../../constants/api';
import { apiClient } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { AuthShell } from './AuthShell';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from './authSchemas';

export function ForgotPassword() {
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setFormError(null);
    setSuccess(null);
    try {
      await apiClient.post(API_ENDPOINTS.auth.forgotPassword, { email: data.email });
      setSuccess('If an account exists for that email, you will receive reset instructions shortly.');
      reset({ email: data.email });
    } catch (e) {
      setFormError(getApiErrorMessage(e, 'Could not send reset link'));
    }
  };

  return (
    <AuthShell title="Forgot password" subtitle="We will email you a reset link">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError ? (
          <div
            role="alert"
            className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red dark:border-red/50 dark:bg-red/15 dark:text-red"
          >
            {formError}
          </div>
        ) : null}
        {success ? (
          <div
            role="status"
            className="rounded-lg border border-emerald/40 bg-emerald/10 px-3 py-2 text-sm text-navy dark:border-emerald/40 dark:bg-emerald/15 dark:text-emerald"
          >
            {success}
          </div>
        ) : null}

        <div>
          <label htmlFor="forgot-email" className="text-sm font-medium text-navy dark:text-white">
            Email
          </label>
          <input
            id="forgot-email"
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

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send Reset Link'}
        </Button>

        <p className="text-center text-sm text-gray dark:text-gray">
          <Link
            to="/reset-password"
            className="font-medium text-emerald transition-colors hover:underline"
          >
            Have a code?
          </Link>
          <span className="mx-2 text-gray/60">·</span>
          <Link to="/login" className="font-medium text-emerald transition-colors hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
