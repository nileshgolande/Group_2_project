import { z } from 'zod';

export const passwordFieldSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[0-9]/, 'Include a number');

const emailOrDemoAdmin = z
  .string()
  .trim()
  .min(1, 'Username or email is required')
  .refine(
    (v) => z.string().email().safeParse(v).success || v.toLowerCase() === 'admin',
    { message: 'Enter a valid email or demo username admin' }
  );

export const loginSchema = z.object({
  email: emailOrDemoAdmin,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(2, 'At least 2 characters')
      .max(64, 'At most 64 characters'),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
    password: passwordFieldSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive'], {
      required_error: 'Select your risk tolerance',
      invalid_type_error: 'Select your risk tolerance',
    }),
    acceptTerms: z.boolean().refine((v) => v === true, {
      message: 'You must accept the terms',
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    otp: z
      .string()
      .length(6, 'Code must be 6 digits')
      .regex(/^\d{6}$/, 'Digits only'),
    password: passwordFieldSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
