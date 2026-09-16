import { Navigate } from 'react-router-dom'
import { getSessionUser, getToken } from '../services/api'

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const user = getSessionUser();
  const token = getToken();

  if (!user && !token) {
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
