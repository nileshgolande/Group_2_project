import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark';

export interface UiState {
  theme: ThemeMode;
  sidebarOpen: boolean;
}

const THEME_STORAGE_KEY = 'morpheus_theme';

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'dark' || raw === 'light') {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return 'light';
}

/** Desktop: open by default; mobile: closed so the overlay does not cover the screen. */
function readInitialSidebarOpen(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  return window.matchMedia('(min-width: 1024px)').matches;
}

const initialState: UiState = {
  theme: readStoredTheme(),
  sidebarOpen: readInitialSidebarOpen(),
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, state.theme);
      } catch {
        /* ignore */
      }
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
  },
});

export const { toggleTheme, toggleSidebar, setSidebarOpen } = uiSlice.actions;

export default uiSlice.reducer;
