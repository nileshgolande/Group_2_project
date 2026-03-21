import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { skipProtectedAuthInDev } from '../../utils/devAuth';

export function ProtectedRoute() {
  const token = useAppSelector((s) => s.auth.token);
  const location = useLocation();

  if (!token && !skipProtectedAuthInDev()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
