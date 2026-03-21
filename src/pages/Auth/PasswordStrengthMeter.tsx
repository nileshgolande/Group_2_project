import { useMemo } from 'react';

export function passwordStrengthScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  return score;
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = useMemo(() => passwordStrengthScore(password), [password]);
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const label = !password ? '—' : labels[Math.min(Math.max(score - 1, 0), 4)];

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={[
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              i < score ? 'bg-emerald' : 'bg-navy/10 dark:bg-white/15',
            ].join(' ')}
          />
        ))}
      </div>
      <p className="text-xs text-gray dark:text-gray">
        Strength: <span className="font-medium text-navy dark:text-white">{label}</span>
      </p>
    </div>
  );
}
