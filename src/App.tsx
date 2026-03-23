import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { CatchAllRoute } from './components/Auth/CatchAllRoute';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { Layout } from './components/Layout/Layout';
import { ChatPage } from './pages/ChatPage';
import { Dashboard } from './pages/Dashboard';
import { Landing } from './pages/Landing';
import { ForgotPassword } from './pages/Auth/ForgotPassword';
import { Login } from './pages/Auth/Login';
import { ResetPassword } from './pages/Auth/ResetPassword';
import { Signup } from './pages/Auth/Signup';
import { Portfolio } from './pages/Portfolio';
import { Recommendations } from './pages/Recommendations';
import { StockDetail } from './pages/Stocks/StockDetail';
import { StocksList } from './pages/Stocks/StocksList';
import { useAppSelector } from './store';

function ThemeSync() {
  const theme = useAppSelector((s) => s.ui.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}

export default function App() {
  return (
    <>
      <ThemeSync />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/stocks/:symbol" element={<StockDetail />} />
            <Route path="/stocks" element={<StocksList />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>
        </Route>
        <Route path="*" element={<CatchAllRoute />} />
      </Routes>
    </>
  );
}
