import type { ReactNode } from "react";

import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthProvider";

interface PasswordChangeBoundaryProps {
  children: ReactNode;
}

/**
 * Authentication boundary that deliberately ignores commercial
 * subscription state.
 *
 * Used by identity/security pages and Platform Administration.
 */
export function PasswordChangeBoundary({
  children,
}: PasswordChangeBoundaryProps) {
  const { authenticated, loading, passwordChangeRequired } = useAuth();

  if (loading) {
    return null;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (passwordChangeRequired) {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}
