import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function RequireAuth({ children, requireAdmin = false }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user.birthdateConfirmed && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
