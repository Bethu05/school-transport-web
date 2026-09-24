import type { ReactNode } from "react";

import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthProvider";

interface ProtectedRouteProps {
  children: ReactNode;

  enforceCommercialAccess?: boolean;
}

export function ProtectedRoute({
  children,
  enforceCommercialAccess = true,
}: ProtectedRouteProps) {
  const {
    authenticated,
    isPlatformUser,
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

  if (passwordChangeRequired) {
    return <Navigate to="/change-password" replace />;
  }

  /**
   * Hard trust-boundary rule:
   *
   * platform identities do not enter tenant application screens.
   *
   * This also protects direct/manual URL navigation.
   */
  if (isPlatformUser) {
    return <Navigate to="/platform" replace />;
  }

  if (enforceCommercialAccess && access && !access.operational) {
    return <Navigate to="/account-status" replace />;
  }

  return children;
}
