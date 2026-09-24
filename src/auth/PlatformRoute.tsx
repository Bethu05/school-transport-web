import type { ReactNode } from "react";

import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthProvider";

interface PlatformRouteProps {
  children: ReactNode;
}

/**
 * Boundary for every SaaS control-plane identity.
 *
 * Platform authority is independent from tenant membership.
 * A platform-only identity must never fall through into the
 * customer tenant application.
 */
export function PlatformRoute({ children }: PlatformRouteProps) {
  const { authenticated, isPlatformUser, loading, passwordChangeRequired } =
    useAuth();

  if (loading) {
    return null;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (passwordChangeRequired) {
    return <Navigate to="/change-password" replace />;
  }

  if (!isPlatformUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
