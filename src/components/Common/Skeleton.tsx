import type { HTMLAttributes } from 'react';

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** e.g. h-4, h-24 w-full */
  className?: string;
}

export function Skeleton({ className = 'h-4 w-full', ...rest }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-gray/25 dark:bg-white/10 ${className}`.trim()}
      {...rest}
    >
      <div
        className="absolute inset-y-0 left-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/15"
        aria-hidden
      />
    </div>
  );
}
