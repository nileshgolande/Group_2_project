export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.REACT_APP_API_URL as string | undefined) ??
  'http://localhost:8000/api';

export const API_ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  stocks: { list: '/stocks/', detail: (id: string) => `/stocks/${id}/` },
  portfolio: { list: '/portfolio/', add: '/portfolio/add' },
  chat: { send: '/chat/', history: '/chat/history/' },
} as const;
