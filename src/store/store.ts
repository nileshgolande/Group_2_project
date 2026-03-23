import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { AUTH_STORAGE_KEYS } from '../constants/storage';
import authReducer, { logout, setToken, setUser, type AuthState } from './slices/authSlice';
import portfolioReducer from './slices/portfolioSlice';
import uiReducer from './slices/uiSlice';

const authStorageListener = createListenerMiddleware();

authStorageListener.startListening({
  actionCreator: setToken,
  effect: (action, listenerApi) => {
    if (typeof window === 'undefined') {
      return;
    }
    const payload = action.payload;
    const remember = (listenerApi.getState() as { auth: AuthState }).auth.rememberMe;
    const clearLocal = () => {
      localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
      localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
    };
    const clearSession = () => {
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
    };
    try {
      if (payload === null) {
        clearLocal();
        clearSession();
        return;
      }
      if (remember) {
        clearSession();
        if (typeof payload === 'string') {
          if (payload.length > 0) {
            localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, payload);
          } else {
            localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
          }
          return;
        }
        localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, payload.accessToken);
        if (payload.refreshToken === undefined) {
          return;
        }
        if (payload.refreshToken === null || payload.refreshToken === '') {
          localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
        } else {
          localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, payload.refreshToken);
        }
        return;
      }
      clearLocal();
      if (typeof payload === 'string') {
        if (payload.length > 0) {
          sessionStorage.setItem(AUTH_STORAGE_KEYS.accessToken, payload);
        } else {
          sessionStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
        }
        return;
      }
      sessionStorage.setItem(AUTH_STORAGE_KEYS.accessToken, payload.accessToken);
      if (payload.refreshToken === undefined) {
        return;
      }
      if (payload.refreshToken === null || payload.refreshToken === '') {
        sessionStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
      } else {
        sessionStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, payload.refreshToken);
      }
    } catch {
      /* storage may be unavailable */
    }
  },
});

authStorageListener.startListening({
  actionCreator: setUser,
  effect: (action, listenerApi) => {
    if (typeof window === 'undefined') {
      return;
    }
    const user = action.payload;
    const remember = (listenerApi.getState() as { auth: AuthState }).auth.rememberMe;
    try {
      if (user === null) {
        localStorage.removeItem(AUTH_STORAGE_KEYS.user);
        sessionStorage.removeItem(AUTH_STORAGE_KEYS.user);
        return;
      }
      const raw = JSON.stringify(user);
      if (remember) {
        sessionStorage.removeItem(AUTH_STORAGE_KEYS.user);
        localStorage.setItem(AUTH_STORAGE_KEYS.user, raw);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEYS.user);
        sessionStorage.setItem(AUTH_STORAGE_KEYS.user, raw);
      }
    } catch {
      /* ignore */
    }
  },
});

authStorageListener.startListening({
  actionCreator: logout,
  effect: () => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
      localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
      localStorage.removeItem(AUTH_STORAGE_KEYS.user);
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.user);
    } catch {
      /* ignore */
    }
  },
});

export const store = configureStore({
  reducer: {
    auth: authReducer,
    portfolio: portfolioReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(authStorageListener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
