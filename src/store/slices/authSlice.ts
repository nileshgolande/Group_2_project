import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { AUTH_STORAGE_KEYS } from '../../constants/storage';

function readStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw =
      localStorage.getItem(AUTH_STORAGE_KEYS.user) ??
      sessionStorage.getItem(AUTH_STORAGE_KEYS.user);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.email !== 'string') return null;
    return {
      id: o.id,
      email: o.email,
      name: typeof o.name === 'string' ? o.name : undefined,
    };
  } catch {
    return null;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export type SetTokenPayload =
  | string
  | null
  | {
      accessToken: string;
      refreshToken?: string | null;
    };

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  /** When false, tokens are kept in sessionStorage only (except in-memory Redux). */
  rememberMe: boolean;
}

function readStoredAuthPartial(): Pick<AuthState, 'token' | 'refreshToken' | 'rememberMe'> {
  if (typeof window === 'undefined') {
    return { token: null, refreshToken: null, rememberMe: true };
  }
  try {
    const lsAccess = localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
    if (lsAccess) {
      return {
        token: lsAccess,
        refreshToken: localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken),
        rememberMe: true,
      };
    }
    const ssAccess = sessionStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
    if (ssAccess) {
      return {
        token: ssAccess,
        refreshToken: sessionStorage.getItem(AUTH_STORAGE_KEYS.refreshToken),
        rememberMe: false,
      };
    }
  } catch {
    /* ignore */
  }
  return { token: null, refreshToken: null, rememberMe: true };
}

const storedAuth = readStoredAuthPartial();
const storedUser = readStoredUser();

const initialState: AuthState = {
  user: storedAuth.token ? storedUser : null,
  ...storedAuth,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
    },
    setToken(state, action: PayloadAction<SetTokenPayload>) {
      const payload = action.payload;
      if (payload === null) {
        state.token = null;
        state.refreshToken = null;
        return;
      }
      if (typeof payload === 'string') {
        state.token = payload;
        return;
      }
      state.token = payload.accessToken;
      if (payload.refreshToken !== undefined) {
        state.refreshToken = payload.refreshToken;
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setRememberMe(state, action: PayloadAction<boolean>) {
      state.rememberMe = action.payload;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.error = null;
      state.isLoading = false;
      state.rememberMe = true;
    },
  },
});

export const { setUser, setToken, setLoading, setError, setRememberMe, logout } =
  authSlice.actions;

export default authSlice.reducer;
