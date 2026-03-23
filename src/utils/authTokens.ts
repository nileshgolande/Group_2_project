import type { AuthUser } from '../store/slices/authSlice';

export function extractAccessRefresh(data: unknown): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  if (!data || typeof data !== 'object') {
    return { accessToken: null, refreshToken: null };
  }
  const o = data as Record<string, unknown>;
  const accessToken =
    (typeof o.access === 'string' && o.access) ||
    (typeof o.access_token === 'string' && o.access_token) ||
    (typeof o.token === 'string' && o.token) ||
    null;
  const refreshToken =
    (typeof o.refresh === 'string' && o.refresh) ||
    (typeof o.refresh_token === 'string' && o.refresh_token) ||
    null;
  return { accessToken, refreshToken };
}

export function extractAuthUser(data: unknown): AuthUser | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const o = data as Record<string, unknown>;
  const nested = o.user ?? o.profile;
  if (nested && typeof nested === 'object') {
    const u = nested as Record<string, unknown>;
    const id = u.id ?? u.pk;
    const email = u.email;
    if (id != null && typeof email === 'string') {
      return {
        id: String(id),
        email,
        name:
          typeof u.name === 'string'
            ? u.name
            : typeof u.username === 'string'
              ? u.username
              : undefined,
      };
    }
  }
  if (typeof o.email === 'string') {
    const id = o.user_id ?? o.id ?? o.email;
    return {
      id: String(id),
      email: o.email,
      name:
        typeof o.name === 'string'
          ? o.name
          : typeof o.username === 'string'
            ? o.username
            : undefined,
    };
  }
  return null;
}
