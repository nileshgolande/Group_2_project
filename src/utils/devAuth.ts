/**
 * Opt-in dev bypass for protected routes (no token). Default is off so login is required like production.
 * Set `VITE_SKIP_PROTECTED_AUTH=true` in `.env.development.local` only if you need to skip auth while coding.
 */
export function skipProtectedAuthInDev(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }
  return import.meta.env.VITE_SKIP_PROTECTED_AUTH === 'true';
}
