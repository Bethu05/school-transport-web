/*
 * AuthProvider intentionally exports both the provider component
 * and useAuth().
 *
 * They form one authentication API and are kept together so every
 * consumer uses the same session contract.
 *
 * Fast Refresh may reload this module rather than hot-replacing only
 * the component, which is acceptable for authentication state.
 */
/* oxlint-disable react/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  clearAccessToken,
  getAccessToken,
} from '../api/client';

import {
  getAuthContext,
  getCurrentUser,
  login as loginRequest,
  type ActiveTenant,
  type AuthenticatedUser,
  type LoginRequest,
} from './auth.api';

interface AuthContextValue {
  user:
    | AuthenticatedUser
    | null;

  /**
   * Active tenant and backend-verified
   * membership role.
   */
  tenant:
    | ActiveTenant
    | null;

  /**
   * Effective permissions returned by the backend for the
   * authenticated user's active tenant membership.
   */
  permissions:
    readonly string[];

  loading: boolean;

  authenticated: boolean;

  login: (
    credentials:
      LoginRequest,
  ) => Promise<void>;

  logout: () => void;
}

const AuthContext =
  createContext<AuthContextValue | null>(
    null,
  );

interface AuthProviderProps {
  children: ReactNode;
}

const TENANT_STORAGE_KEY =
  'school_transport_tenant_id';

/**
 * Resolve the tenant selected for the
 * current browser session.
 *
 * During development we fall back to the
 * seeded development tenant.
 *
 * Later this becomes a proper tenant /
 * school selector for multi-membership users.
 */
function resolveTenantId():
  | string
  | null {
  const storedTenant =
    localStorage.getItem(
      TENANT_STORAGE_KEY,
    );

  if (storedTenant) {
    return storedTenant;
  }

  const developmentTenant =
    import.meta.env
      .VITE_DEV_TENANT_ID;

  if (developmentTenant) {
    localStorage.setItem(
      TENANT_STORAGE_KEY,
      developmentTenant,
    );

    return developmentTenant;
  }

  return null;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [
    user,
    setUser,
  ] =
    useState<
      AuthenticatedUser | null
    >(null);

  const [
    tenant,
    setTenant,
  ] =
    useState<
      ActiveTenant | null
    >(null);

  const [
    permissions,
    setPermissions,
  ] =
    useState<
      readonly string[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  /**
   * Restore a previously authenticated
   * browser session when the application
   * starts.
   */
  useEffect(() => {
    async function restoreSession():
      Promise<void> {
      const token =
        getAccessToken();

      if (!token) {
        setLoading(false);

        return;
      }

      try {
        const tenantId =
          resolveTenantId();

        /**
         * Preferred session restoration:
         *
         * JWT
         *   ->
         * backend tenant membership check
         *   ->
         * verified user + tenant role.
         */
        if (tenantId) {
          const context =
            await getAuthContext(
              tenantId,
            );

          setUser(
            context.user,
          );

          setTenant(
            context.tenant,
          );

          setPermissions(
            context.permissions,
          );

          return;
        }

        /**
         * Fallback identity restoration.
         *
         * This is useful before a production
         * tenant selector exists.
         */
        const response =
          await getCurrentUser();

        setUser(
          response.user,
        );

        setTenant(null);

        setPermissions([]);
      } catch {
        /**
         * Any invalid or expired session
         * should return the browser to a
         * clean unauthenticated state.
         */
        clearAccessToken();

        setUser(null);

        setTenant(null);

        setPermissions([]);
      } finally {
        setLoading(false);
      }
    }

    void restoreSession();
  }, []);

  /**
   * Authenticate then immediately resolve
   * the active tenant context.
   */
  async function login(
    credentials:
      LoginRequest,
  ): Promise<void> {
    await loginRequest(
      credentials,
    );

    const tenantId =
      resolveTenantId();

    if (tenantId) {
      const context =
        await getAuthContext(
          tenantId,
        );

      setUser(
        context.user,
      );

      setTenant(
        context.tenant,
      );

      setPermissions(
        context.permissions,
      );

      return;
    }

    const response =
      await getCurrentUser();

    setUser(
      response.user,
    );

    setTenant(null);

    setPermissions([]);
  }

  /**
   * Clear the local JWT and all
   * authenticated application state.
   */
  function logout(): void {
    clearAccessToken();

    setUser(null);

    setTenant(null);

    setPermissions([]);
  }

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user,

        tenant,

        permissions,

        loading,

        authenticated:
          user !== null,

        login,

        logout,
      }),
      [
        user,
        tenant,
        permissions,
        loading,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Single hook used throughout the web
 * application to access authentication
 * and backend-verified tenant context.
 */
export function useAuth():
  AuthContextValue {
  const context =
    useContext(
      AuthContext,
    );

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider',
    );
  }

  return context;
}
