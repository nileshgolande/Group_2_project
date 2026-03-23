import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';
import { DEMO_ACCESS_TOKEN } from '../constants/demoAuth';
import { AUTH_STORAGE_KEYS } from '../constants/storage';
import { store } from '../store/store';
import { logout, setToken } from '../store/slices/authSlice';

export interface MorpheusAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function extractTokens(data: unknown): {
  access: string | null;
  refresh: string | null;
} {
  if (!data || typeof data !== 'object') {
    return { access: null, refresh: null };
  }
  const o = data as Record<string, unknown>;
  const access =
    (typeof o.access === 'string' && o.access) ||
    (typeof o.access_token === 'string' && o.access_token) ||
    (typeof o.token === 'string' && o.token) ||
    null;
  const refresh =
    (typeof o.refresh === 'string' && o.refresh) ||
    (typeof o.refresh_token === 'string' && o.refresh_token) ||
    null;
  return { access, refresh };
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

function readStoredAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return (
    localStorage.getItem(AUTH_STORAGE_KEYS.accessToken) ??
    sessionStorage.getItem(AUTH_STORAGE_KEYS.accessToken)
  );
}

function readStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return (
    localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken) ??
    sessionStorage.getItem(AUTH_STORAGE_KEYS.refreshToken)
  );
}

function getAccessToken(): string | null {
  return store.getState().auth.token ?? readStoredAccessToken();
}

function getRefreshToken(): string | null {
  return store.getState().auth.refreshToken ?? readStoredRefreshToken();
}

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err: unknown) => Promise.reject(err instanceof Error ? err : new Error(String(err)))
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(token);
    }
  });
  failedQueue = [];
}

function isAuthRefreshRequest(config: InternalAxiosRequestConfig): boolean {
  const path = `${config.baseURL ?? ''}${config.url ?? ''}`;
  return path.includes(API_ENDPOINTS.auth.refresh);
}

function isAuthLoginRequest(config: InternalAxiosRequestConfig): boolean {
  const path = `${config.baseURL ?? ''}${config.url ?? ''}`;
  return path.includes(API_ENDPOINTS.auth.login);
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as MorpheusAxiosRequestConfig | undefined;
    const status = error.response?.status;

    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (
      isAuthRefreshRequest(originalRequest) ||
      isAuthLoginRequest(originalRequest)
    ) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      const access = getAccessToken();
      if (access === DEMO_ACCESS_TOKEN) {
        return Promise.reject(error);
      }
      store.dispatch(logout());
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newAccess) => {
        if (!newAccess) {
          return Promise.reject(new Error('Token refresh failed'));
        }
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        originalRequest._retry = true;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshUrl = `${API_BASE_URL.replace(/\/$/, '')}${API_ENDPOINTS.auth.refresh}`;
      const { data } = await axios.post<unknown>(
        refreshUrl,
        { refresh: refreshToken },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30_000,
        }
      );

      const tokens = extractTokens(data);
      const access = tokens.access;
      if (!access) {
        throw new Error('Refresh response did not include an access token');
      }

      const nextRefresh = tokens.refresh ?? refreshToken;
      store.dispatch(
        setToken({
          accessToken: access,
          refreshToken: nextRefresh,
        })
      );

      processQueue(null, access);

      originalRequest.headers.Authorization = `Bearer ${access}`;
      return apiClient(originalRequest);
    } catch (refreshErr) {
      const normalized =
        refreshErr instanceof Error
          ? refreshErr
          : new Error(String(refreshErr));
      processQueue(normalized, null);
      store.dispatch(logout());
      return Promise.reject(normalized);
    } finally {
      isRefreshing = false;
    }
  }
);
