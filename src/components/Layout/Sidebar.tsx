import {
  Briefcase,
  LayoutDashboard,
  MessageCircle,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { setSidebarOpen } from '../../store/slices/uiSlice';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase, end: false },
  { to: '/stocks', label: 'Stocks', icon: TrendingUp, end: false },
  { to: '/recommendations', label: 'Recommendations', icon: Sparkles, end: false },
  { to: '/chat', label: 'Chat', icon: MessageCircle, end: false },
] as const;

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
    isActive
      ? 'bg-emerald/15 text-emerald'
      : 'text-gray hover:bg-white/5 hover:text-white',
  ].join(' ');
}

interface NavPanelProps {
  variant: 'desktop' | 'drawer';
  onNavigate?: () => void;
}

function NavPanel({ variant, onNavigate }: NavPanelProps) {
  const dispatch = useAppDispatch();

  return (
    <aside
      className={[
        'flex h-full w-64 flex-col bg-navy text-white',
        variant === 'desktop' ? 'min-h-[calc(100svh-4rem)] border-r border-white/10' : '',
      ].join(' ')}
      aria-label="Main navigation"
    >
      {variant === 'drawer' && (
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
          <span className="text-sm font-medium text-white/90">Menu</span>
          <button
            type="button"
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
            onClick={() => dispatch(setSidebarOpen(false))}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      )}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={navLinkClass}
          >
            <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export function Sidebar() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.sidebarOpen);

  const closeMobile = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      dispatch(setSidebarOpen(false));
    }
  };

  return (
    <>
      <div
        className={[
          'fixed inset-0 top-16 z-30 bg-black/50 transition-opacity duration-300 ease-out lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        aria-hidden={!open}
        onClick={() => dispatch(setSidebarOpen(false))}
      />

      <div
        className={[
          'fixed left-0 top-16 z-40 h-[calc(100svh-4rem)] w-64 shadow-xl transition-transform duration-300 ease-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <NavPanel variant="drawer" onNavigate={closeMobile} />
      </div>

      <div className="hidden min-h-0 w-64 shrink-0 lg:block">
        <NavPanel variant="desktop" />
      </div>
    </>
  );
}
