import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  /** Adds hover shadow / lift when true */
  hover?: boolean;
}

export function Card({ children, className = '', onClick, hover = false, ...rest }: CardProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            }
          : undefined
      }
      className={[
        'rounded-xl border border-navy/10 bg-white p-6 shadow-md transition-[box-shadow,transform,border-color] duration-300 dark:border-white/10 dark:bg-navy',
        hover || interactive ? 'hover:border-emerald/30 hover:shadow-lg dark:hover:border-emerald/25' : '',
        interactive ? 'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
