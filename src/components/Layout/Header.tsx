import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  UserRound,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { toggleSidebar, toggleTheme } from '../../store/slices/uiSlice';

function displayName(user: { name?: string; email: string } | null): string {
  if (!user) return '';
  const n = user.name?.trim();
  if (n) return n;
  return user.email;
}

export function Header() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useAppSelector((s) => s.ui.theme);
  const user = useAppSelector((s) => s.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-3 border-b border-navy/10 bg-white px-3 shadow-sm transition-colors duration-300 dark:border-white/10 dark:bg-navy md:gap-4 md:px-4">
      <button
        type="button"
        aria-label="Open menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-navy transition-colors hover:bg-navy/5 dark:text-white dark:hover:bg-white/10 lg:hidden"
        onClick={() => dispatch(toggleSidebar())}
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <div className="flex shrink-0 items-center">
        <Link
          to="/"
          className="font-semibold tracking-tight text-navy transition-colors hover:text-emerald dark:text-white dark:hover:text-emerald"
        >
          MORPHEUS
        </Link>
      </div>

      <div className="mx-auto flex min-w-0 max-w-xl flex-1">
        <label className="relative block w-full">
          <span className="sr-only">Search</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search symbols, news…"
            className="h-10 w-full rounded-lg border border-navy/10 bg-white pl-10 pr-3 text-sm text-navy placeholder:text-gray/80 transition-[border-color,box-shadow] duration-200 focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/30 dark:border-white/10 dark:bg-slate dark:text-white dark:placeholder:text-gray"
          />
        </label>
      </div>

      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
        {user ? (
          <div className="mr-0 flex min-w-0 max-w-[7rem] items-center gap-1.5 sm:mr-1 sm:max-w-[12rem] md:max-w-[14rem]">
            <UserRound className="h-4 w-4 shrink-0 text-gray dark:text-gray" aria-hidden />
            <span
              className="truncate text-xs font-medium text-navy sm:text-sm dark:text-white"
              title={displayName(user)}
            >
              {displayName(user)}
            </span>
          </div>
        ) : null}

        <button
          type="button"
          aria-label="Notifications"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-navy transition-colors hover:bg-navy/5 dark:text-white dark:hover:bg-white/10"
        >
          <Bell className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-navy transition-colors hover:bg-navy/5 dark:text-white dark:hover:bg-white/10"
          onClick={() => dispatch(toggleTheme())}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 transition-transform duration-300" aria-hidden />
          ) : (
            <Moon className="h-5 w-5 transition-transform duration-300" aria-hidden />
          )}
        </button>

        {user ? (
          <button
            type="button"
            className="flex h-10 items-center gap-1.5 rounded-lg border border-navy/10 px-2.5 text-sm font-medium text-navy transition-colors hover:bg-navy/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10 sm:px-3"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Log out</span>
          </button>
        ) : (
          <button
            type="button"
            aria-label="Profile"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-navy transition-colors hover:bg-navy/5 dark:text-white dark:hover:bg-white/10"
          >
            <UserRound className="h-5 w-5" aria-hidden />
          </button>
        )}
      </div>
    </header>
  );
}
