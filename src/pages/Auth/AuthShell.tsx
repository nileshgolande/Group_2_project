import type { ReactNode } from 'react';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-svh w-full bg-gradient-to-br from-navy via-navy to-slate px-4 py-10 transition-colors duration-300 dark:from-navy dark:via-navy dark:to-slate">
      <div className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-[400px] flex-col justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/95 p-6 shadow-2xl shadow-navy/20 backdrop-blur-sm transition-colors duration-300 dark:border-white/10 dark:bg-slate/95 dark:shadow-black/40 sm:p-8">
          <h1 className="text-center text-xl font-semibold tracking-tight text-navy dark:text-white">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-center text-sm text-gray dark:text-gray">{subtitle}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
