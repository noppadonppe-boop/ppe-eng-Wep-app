import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproved?: boolean;
  requireRoles?: UserRole[];
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
      <p className="text-slate-500 font-sarabun">กำลังตรวจสอบสิทธิ์...</p>
    </div>
  );
}

export default function ProtectedRoute({
  children,
  requireApproved = true,
  requireRoles,
}: ProtectedRouteProps) {
  const { firebaseUser, userProfile, loading } = useAuth();
  const location = useLocation();

  // 1. Still loading auth state → spinner
  if (loading) return <LoadingSpinner />;

  // 2. Not logged in → redirect to login
  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Logged in but profile not yet loaded → spinner
  if (!userProfile) return <LoadingSpinner />;

  // 4. Status checks
  if (requireApproved) {
    if (userProfile.status === 'pending') {
      return <Navigate to="/pending" replace />;
    }
    if (userProfile.status === 'rejected') {
      return <Navigate to="/login" replace />;
    }
  }

  // 5. Role check
  if (requireRoles && requireRoles.length > 0) {
    const hasRole = userProfile.role.some((r) => requireRoles.includes(r));
    if (!hasRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
