import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';

export function useAppDispatch(): AppDispatch {
  return useDispatch<AppDispatch>();
}
