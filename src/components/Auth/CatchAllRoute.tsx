import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { skipProtectedAuthInDev } from '../../utils/devAuth';

/**
 * Unknown paths: authed users → dashboard; guests → public landing.
 */
export function CatchAllRoute() {
  const token = useAppSelector((s) => s.auth.token);

  if (token || skipProtectedAuthInDev()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/" replace />;
}
