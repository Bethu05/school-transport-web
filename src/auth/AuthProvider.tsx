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
} from "react";

import {
  clearAccessToken,
  getAccessToken,
  PASSWORD_CHANGE_REQUIRED_EVENT,
  TENANT_ACCESS_INACTIVE_EVENT,
} from "../api/client";

import {
  getAuthContext,
  getAuthTenants,
  getCurrentUser,
  login as loginRequest,
  type ActiveTenant,
  type AuthTenantMembership,
  type AuthenticatedUser,
  type LoginRequest,
  type TenantCommercialAccess,
} from "./auth.api";

export interface AuthLoginOutcome {
  isSuperAdmin: boolean;

  passwordChangeRequired: boolean;
}

interface AuthContextValue {
  user: AuthenticatedUser | null;

  /**
   * Active tenant and backend-verified membership role.
   */
  tenant: ActiveTenant | null;

  /**
   * Effective permissions returned by the backend.
   */
  permissions: readonly string[];

  /**
   * Current tenant commercial access returned by /auth/context.
   */
  access: TenantCommercialAccess | null;

  /**
   * Live global credential state.
   *
   * When true, all normal application navigation must stop until
   * the authenticated user replaces the temporary password.
   */
  passwordChangeRequired: boolean;

  isSuperAdmin: boolean;

  loading: boolean;

  authenticated: boolean;

  login: (credentials: LoginRequest) => Promise<AuthLoginOutcome>;

  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

const TENANT_STORAGE_KEY = "school_transport_tenant_id";

function clearTenantSelection(): void {
  localStorage.removeItem(TENANT_STORAGE_KEY);
}

/**
 * Resolve a tenant ONLY from memberships returned by the
 * authenticated backend.
 *
 * Browser storage is a preference, never an authorization source.
 */
function resolveAuthorizedTenantId(
  memberships: readonly AuthTenantMembership[],
): string | null {
  const storedTenant = localStorage.getItem(TENANT_STORAGE_KEY);

  if (
    storedTenant &&
    memberships.some((membership) => membership.tenantId === storedTenant)
  ) {
    return storedTenant;
  }

  const developmentTenant = import.meta.env.VITE_DEV_TENANT_ID;

  if (
    developmentTenant &&
    memberships.some((membership) => membership.tenantId === developmentTenant)
  ) {
    localStorage.setItem(TENANT_STORAGE_KEY, developmentTenant);

    return developmentTenant;
  }

  if (memberships.length === 1) {
    const tenantId = memberships[0].tenantId;

    localStorage.setItem(TENANT_STORAGE_KEY, tenantId);

    return tenantId;
  }

  /**
   * Multi-membership users will eventually choose from the
   * tenant selector.
   */
  clearTenantSelection();

  return null;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  const [tenant, setTenant] = useState<ActiveTenant | null>(null);

  const [permissions, setPermissions] = useState<readonly string[]>([]);

  const [access, setAccess] = useState<TenantCommercialAccess | null>(null);

  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [loading, setLoading] = useState(true);

  /**
   * Remove tenant-operational state without destroying the global
   * identity JWT.
   */
  function clearTenantRuntimeState(): void {
    setTenant(null);

    setPermissions([]);

    setAccess(null);
  }

  /**
   * Restore an authenticated browser session.
   */
  useEffect(() => {
    async function restoreSession(): Promise<void> {
      const token = getAccessToken();

      if (!token) {
        setLoading(false);

        return;
      }

      try {
        const response = await getCurrentUser();

        setUser(response.user);

        setIsSuperAdmin(response.platform.isSuperAdmin);

        setPasswordChangeRequired(response.security.mustChangePassword);

        /**
         * A temporary-password user must not progress into tenant
         * discovery or operational API calls.
         *
         * /auth/tenants itself is deliberately blocked by the
         * backend until the password has been replaced.
         */
        if (response.security.mustChangePassword) {
          clearTenantRuntimeState();

          return;
        }

        if (response.platform.isSuperAdmin) {
          clearTenantSelection();

          clearTenantRuntimeState();

          return;
        }

        const memberships = await getAuthTenants();

        const tenantId = resolveAuthorizedTenantId(memberships);

        if (tenantId) {
          const context = await getAuthContext(tenantId);

          setUser(context.user);

          setTenant(context.tenant);

          setPermissions(context.permissions);

          setAccess(context.access);

          return;
        }

        clearTenantRuntimeState();
      } catch {
        clearAccessToken();

        clearTenantSelection();

        setUser(null);

        clearTenantRuntimeState();

        setPasswordChangeRequired(false);

        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    void restoreSession();
  }, []);

  /**
   * Authenticate then resolve identity security BEFORE tenant
   * discovery.
   */
  async function login(credentials: LoginRequest): Promise<AuthLoginOutcome> {
    await loginRequest(credentials);

    const response = await getCurrentUser();

    setUser(response.user);

    setIsSuperAdmin(response.platform.isSuperAdmin);

    setPasswordChangeRequired(response.security.mustChangePassword);

    if (response.security.mustChangePassword) {
      clearTenantRuntimeState();

      return {
        isSuperAdmin: response.platform.isSuperAdmin,

        passwordChangeRequired: true,
      };
    }

    if (response.platform.isSuperAdmin) {
      clearTenantSelection();

      clearTenantRuntimeState();

      return {
        isSuperAdmin: true,

        passwordChangeRequired: false,
      };
    }

    const memberships = await getAuthTenants();

    const tenantId = resolveAuthorizedTenantId(memberships);

    if (tenantId) {
      const context = await getAuthContext(tenantId);

      setUser(context.user);

      setTenant(context.tenant);

      setPermissions(context.permissions);

      setAccess(context.access);
    } else {
      clearTenantRuntimeState();
    }

    return {
      isSuperAdmin: false,

      passwordChangeRequired: false,
    };
  }

  /**
   * Clear local authenticated application state.
   */
  function logout(): void {
    clearAccessToken();

    clearTenantSelection();

    setUser(null);

    clearTenantRuntimeState();

    setPasswordChangeRequired(false);

    setIsSuperAdmin(false);
  }

  /**
   * A password reset may happen while the affected user already
   * has the application open.
   *
   * The next protected API request returns PASSWORD_CHANGE_REQUIRED.
   * Move immediately into the forced-password route without waiting
   * for the access JWT to expire.
   */
  useEffect(() => {
    function handlePasswordChangeRequired(): void {
      setPasswordChangeRequired(true);

      clearTenantRuntimeState();
    }

    window.addEventListener(
      PASSWORD_CHANGE_REQUIRED_EVENT,
      handlePasswordChangeRequired,
    );

    return () => {
      window.removeEventListener(
        PASSWORD_CHANGE_REQUIRED_EVENT,
        handlePasswordChangeRequired,
      );
    };
  }, []);

  /**
   * Commercial access can also change while a session is open.
   */
  useEffect(() => {
    async function refreshCommercialAccess(): Promise<void> {
      if (passwordChangeRequired) {
        return;
      }

      const tenantId = tenant?.tenantId;

      if (!tenantId) {
        return;
      }

      try {
        const context = await getAuthContext(tenantId);

        setUser(context.user);

        setTenant(context.tenant);

        setPermissions(context.permissions);

        setAccess(context.access);
      } catch {
        /**
         * Normal authentication/session restoration remains
         * responsible for invalid JWT handling.
         */
      }
    }

    function handleTenantAccessInactive(): void {
      void refreshCommercialAccess();
    }

    window.addEventListener(
      TENANT_ACCESS_INACTIVE_EVENT,
      handleTenantAccessInactive,
    );

    return () => {
      window.removeEventListener(
        TENANT_ACCESS_INACTIVE_EVENT,
        handleTenantAccessInactive,
      );
    };
  }, [passwordChangeRequired, tenant?.tenantId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,

      tenant,

      permissions,

      access,

      passwordChangeRequired,

      isSuperAdmin,

      loading,

      authenticated: user !== null,

      login,

      logout,
    }),
    [
      user,
      tenant,
      permissions,
      access,
      passwordChangeRequired,
      isSuperAdmin,
      loading,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
