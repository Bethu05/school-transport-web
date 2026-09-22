import type { ReactNode } from "react";

import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthProvider";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const {
    authenticated,
    isSuperAdmin,
    loading,
    access,
    passwordChangeRequired,
  } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  /**
   * Credential recovery outranks every tenant/platform destination.
   */
  if (passwordChangeRequired) {
    return <Navigate to="/change-password" replace />;
  }

  if (isSuperAdmin) {
    return <Navigate to="/platform" replace />;
  }

  if (access && !access.operational) {
    return <Navigate to="/account-status" replace />;
  }

  return children;
}
