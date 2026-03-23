import type { ReactNode } from 'react';
import { Card } from './Card';

export interface StatCardProps {
  title: string;
  value: ReactNode;
  change: string;
  isPositive: boolean;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ title, value, change, isPositive, icon, className = '' }: StatCardProps) {
  const changeColor = isPositive
    ? 'text-green dark:text-green'
    : 'text-red dark:text-red';

  return (
    <Card className={className} hover={true}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2 text-left">
          <p className="text-sm font-medium text-gray dark:text-gray">{title}</p>
          <p className="text-2xl font-semibold tracking-tight text-navy dark:text-white">{value}</p>
          <p className={`text-sm font-medium ${changeColor}`}>{change}</p>
        </div>
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald/10 text-emerald dark:bg-emerald/15">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
