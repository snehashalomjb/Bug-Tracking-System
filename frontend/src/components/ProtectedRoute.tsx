import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { token, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-darkbg-200 transition-colors duration-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading your profile...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if token is not set
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to unauthorized route if user does not possess role
  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
export default ProtectedRoute;
