import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: ReactNode;
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-90 ${className}`.trim()}
      aria-hidden
    />
  );
}

function sizeClasses(size: ButtonSize): string {
  switch (size) {
    case 'sm':
      return 'gap-1.5 rounded-md px-3 py-1.5 text-xs';
    case 'lg':
      return 'gap-2 rounded-lg px-5 py-2.5 text-base';
    default:
      return 'gap-2 rounded-lg px-4 py-2 text-sm';
  }
}

function variantClasses(variant: ButtonVariant): string {
  const base =
    'inline-flex items-center justify-center font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50';
  switch (variant) {
    case 'secondary':
      return `${base} border border-navy bg-transparent text-navy hover:bg-navy/5 focus-visible:outline-navy dark:border-white dark:text-white dark:hover:bg-white/10 dark:focus-visible:outline-white`;
    case 'ghost':
      return `${base} bg-transparent text-navy hover:bg-navy/5 focus-visible:outline-navy dark:text-white dark:hover:bg-white/10 dark:focus-visible:outline-white`;
    case 'danger':
      return `${base} bg-red text-white hover:bg-red/90 focus-visible:outline-red`;
    default:
      return `${base} bg-emerald text-white hover:bg-emerald/90 focus-visible:outline-emerald`;
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      className = '',
      type = 'button',
      disabled,
      children,
      onClick,
      ...rest
    },
    ref
  ) => {
    const isDisabled = Boolean(disabled || isLoading);
    const spinnerSize = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`${variantClasses(variant)} ${sizeClasses(size)} ${className}`.trim()}
        onClick={onClick}
        aria-busy={isLoading || undefined}
        {...rest}
      >
        {isLoading ? <Spinner className={spinnerSize} /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
