import type { ReactNode } from "react";

import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthProvider";

interface SuperAdminRouteProps {
  children: ReactNode;
}

/**
 * Historical filename retained to avoid route churn.
 *
 * The /platform boundary now admits any authenticated platform
 * identity. Individual platform views and backend endpoints remain
 * permission-gated.
 */
export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { authenticated, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
