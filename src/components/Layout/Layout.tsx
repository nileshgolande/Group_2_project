import { useEffect, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppDispatch } from '../../store';
import { setSidebarOpen } from '../../store/slices/uiSlice';
import { ChatbotWidget } from '../Chatbot/ChatbotWidget';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export interface LayoutProps {
  children?: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => {
      if (mq.matches) {
        dispatch(setSidebarOpen(true));
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [dispatch]);

  return (
    <div className="flex min-h-svh flex-col bg-white transition-colors duration-300 dark:bg-slate">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 transition-[padding] duration-300 md:p-6">
          {children ?? <Outlet />}
        </main>
      </div>
      <ChatbotWidget />
    </div>
  );
}
