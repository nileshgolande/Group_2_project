export { store } from './store';
export type { RootState, AppDispatch } from './store';

export { useAppDispatch } from '../hooks/useAppDispatch';
export { useAppSelector } from '../hooks/useAppSelector';

export type { AuthUser, AuthState, SetTokenPayload } from './slices/authSlice';
export {
  setUser,
  setToken,
  setLoading as setAuthLoading,
  setError,
  setRememberMe,
  logout,
} from './slices/authSlice';
export { default as authReducer } from './slices/authSlice';

export type { PortfolioHolding, PortfolioState } from './slices/portfolioSlice';
export {
  setHoldings,
  addHolding,
  removeHolding,
  setLoading as setPortfolioLoading,
} from './slices/portfolioSlice';
export { default as portfolioReducer } from './slices/portfolioSlice';

export type { ThemeMode, UiState } from './slices/uiSlice';
export { toggleTheme, toggleSidebar, setSidebarOpen } from './slices/uiSlice';
export { default as uiReducer } from './slices/uiSlice';
