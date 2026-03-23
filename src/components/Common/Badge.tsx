import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'default' | 'success' | 'error' | 'warning';

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  children: ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, variant = 'default', className = '', ...rest }: BadgeProps) {
  const variantClass = {
    default: 'bg-gray/15 text-navy dark:bg-white/10 dark:text-gray',
    success: 'bg-emerald/15 text-emerald dark:bg-emerald/20 dark:text-emerald',
    error: 'bg-red/15 text-red dark:bg-red/20 dark:text-red',
    warning: 'bg-amber/20 text-amber dark:bg-amber/25 dark:text-amber',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </span>
  );
}
