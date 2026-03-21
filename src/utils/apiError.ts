import { isAxiosError } from 'axios';

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) {
      return data;
    }
    if (data && typeof data === 'object') {
      const o = data as Record<string, unknown>;
      if (typeof o.detail === 'string') {
        return o.detail;
      }
      if (Array.isArray(o.detail)) {
        const first = o.detail[0];
        if (first && typeof first === 'object' && 'msg' in first) {
          return String((first as { msg: string }).msg);
        }
      }
      if (typeof o.message === 'string') {
        return o.message;
      }
      if (typeof o.error === 'string') {
        return o.error;
      }
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
