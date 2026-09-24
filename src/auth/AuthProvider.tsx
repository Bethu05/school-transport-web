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
  getAuthSchools,
  getAuthTenants,
  getCurrentUser,
  login as loginRequest,
  type ActiveTenant,
  type AuthTenantMembership,
  type AuthenticatedUser,
  type LoginRequest,
  type TenantCommercialAccess,
  type TenantFeatureAccess,
} from "./auth.api";

import type { School } from "../schools/schools.api";

export interface AuthLoginOutcome {
  isSuperAdmin: boolean;

  isPlatformUser: boolean;

  passwordChangeRequired: boolean;
}

interface AuthContextValue {
  user: AuthenticatedUser | null;

  /**
   * Active tenant and backend-verified membership role.
   */
  tenant: ActiveTenant | null;

  /**
   * Metadata for the selected backend-authorised tenant.
   *
   * /auth/context deliberately carries only tenantId + role.
   * Name/slug/timezone come from the authenticated /auth/tenants
   * discovery response.
   */
  tenantMembership: AuthTenantMembership | null;

  /**
   * Schools the authenticated identity may enter in the current
   * tenant according to /auth/schools.
   */
  schools: readonly School[];

  /**
   * Current frontend school context.
   *
   * This is always selected from `schools`; arbitrary browser
   * input can never create an active school.
   */
  activeSchool: School | null;

  /**
   * Change school context only to a school already returned by
   * the backend-authorised discovery endpoint.
   */
  selectSchool: (schoolId: string) => void;

  /**
   * Effective permissions returned by the backend.
   */
  permissions: readonly string[];

  /**
   * Effective tenant feature entitlements returned by /auth/context.
   */
  features: readonly TenantFeatureAccess[];

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

  isPlatformUser: boolean;

  platformRoles: readonly string[];

  platformPermissions: readonly string[];

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

const SCHOOL_STORAGE_KEY = "school_transport_school_id";

function clearTenantSelection(): void {
  localStorage.removeItem(TENANT_STORAGE_KEY);
}

function clearSchoolSelection(): void {
  localStorage.removeItem(SCHOOL_STORAGE_KEY);
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

/**
 * Resolve school preference ONLY from the list already returned
 * by the authenticated backend.
 *
 * Storage is therefore just a UX preference.
 *
 * Rules:
 *
 * - saved authorised school -> restore it;
 * - exactly one authorised school -> select automatically;
 * - multiple schools with no saved preference -> no selection,
 *   so the routing layer can show the school selector;
 * - zero schools -> no context.
 */
function resolveAuthorizedSchoolId(schools: readonly School[]): string | null {
  const storedSchoolId = localStorage.getItem(SCHOOL_STORAGE_KEY);

  if (
    storedSchoolId &&
    schools.some((school) => school.id === storedSchoolId)
  ) {
    return storedSchoolId;
  }

  const configuredDefaultSchoolSlug =
    import.meta.env.VITE_DEFAULT_SCHOOL_SLUG?.trim();

  if (configuredDefaultSchoolSlug) {
    const configuredDefaultSchool =
      schools.find((school) => school.slug === configuredDefaultSchoolSlug) ??
      null;

    if (configuredDefaultSchool) {
      localStorage.setItem(SCHOOL_STORAGE_KEY, configuredDefaultSchool.id);

      return configuredDefaultSchool.id;
    }
  }

  if (schools.length === 1) {
    const schoolId = schools[0].id;

    localStorage.setItem(SCHOOL_STORAGE_KEY, schoolId);

    return schoolId;
  }

  clearSchoolSelection();

  return null;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  const [tenant, setTenant] = useState<ActiveTenant | null>(null);

  const [tenantMembership, setTenantMembership] =
    useState<AuthTenantMembership | null>(null);

  const [schools, setSchools] = useState<readonly School[]>([]);

  const [activeSchool, setActiveSchool] = useState<School | null>(null);

  const [permissions, setPermissions] = useState<readonly string[]>([]);

  const [features, setFeatures] = useState<readonly TenantFeatureAccess[]>([]);

  const [access, setAccess] = useState<TenantCommercialAccess | null>(null);

  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [platformRoles, setPlatformRoles] = useState<readonly string[]>([]);

  const [platformPermissions, setPlatformPermissions] = useState<
    readonly string[]
  >([]);

  const isPlatformUser = platformRoles.length > 0;

  const [loading, setLoading] = useState(true);

  /**
   * Remove tenant-operational state without destroying the global
   * identity JWT.
   */
  function clearTenantRuntimeState(): void {
    setTenant(null);

    setTenantMembership(null);

    setSchools([]);

    setActiveSchool(null);

    setPermissions([]);

    setFeatures([]);

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

        setPlatformRoles(response.platform.roles);

        setPlatformPermissions(response.platform.permissions);

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

        if (response.platform.roles.length > 0) {
          clearTenantSelection();

          clearSchoolSelection();

          clearTenantRuntimeState();

          return;
        }

        const memberships = await getAuthTenants();

        const tenantId = resolveAuthorizedTenantId(memberships);

        if (tenantId) {
          const membership =
            memberships.find((item) => item.tenantId === tenantId) ?? null;

          const [context, authorizedSchools] = await Promise.all([
            getAuthContext(tenantId),
            getAuthSchools(tenantId),
          ]);

          setUser(context.user);

          setTenant(context.tenant);

          setTenantMembership(membership);

          setPermissions(context.permissions);

          setFeatures(context.features);

          setAccess(context.access);

          setSchools(authorizedSchools);

          const schoolId = resolveAuthorizedSchoolId(authorizedSchools);

          setActiveSchool(
            authorizedSchools.find((school) => school.id === schoolId) ?? null,
          );

          return;
        }

        clearTenantRuntimeState();
      } catch {
        clearAccessToken();

        clearTenantSelection();

        clearSchoolSelection();

        setUser(null);

        clearTenantRuntimeState();

        setPasswordChangeRequired(false);

        setIsSuperAdmin(false);

        setPlatformRoles([]);

        setPlatformPermissions([]);
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

    setPlatformRoles(response.platform.roles);

    setPlatformPermissions(response.platform.permissions);

    setPasswordChangeRequired(response.security.mustChangePassword);

    if (response.security.mustChangePassword) {
      clearTenantRuntimeState();

      return {
        isSuperAdmin: response.platform.isSuperAdmin,

        isPlatformUser: response.platform.roles.length > 0,

        passwordChangeRequired: true,
      };
    }

    if (response.platform.roles.length > 0) {
      clearTenantSelection();

      clearSchoolSelection();

      clearTenantRuntimeState();

      return {
        isSuperAdmin: response.platform.isSuperAdmin,

        isPlatformUser: true,

        passwordChangeRequired: false,
      };
    }

    const memberships = await getAuthTenants();

    const tenantId = resolveAuthorizedTenantId(memberships);

    if (tenantId) {
      const membership =
        memberships.find((item) => item.tenantId === tenantId) ?? null;

      const [context, authorizedSchools] = await Promise.all([
        getAuthContext(tenantId),
        getAuthSchools(tenantId),
      ]);

      setUser(context.user);

      setTenant(context.tenant);

      setTenantMembership(membership);

      setPermissions(context.permissions);

      setFeatures(context.features);

      setAccess(context.access);

      setSchools(authorizedSchools);

      const schoolId = resolveAuthorizedSchoolId(authorizedSchools);

      setActiveSchool(
        authorizedSchools.find((school) => school.id === schoolId) ?? null,
      );
    } else {
      clearTenantRuntimeState();
    }

    return {
      isSuperAdmin: false,

      isPlatformUser: false,

      passwordChangeRequired: false,
    };
  }

  /**
   * Change current school only to an identity already returned by
   * /auth/schools.
   *
   * The routing layer will subsequently encode this verified
   * selection into the canonical URL.
   */
  function selectSchool(schoolId: string): void {
    const school =
      schools.find((candidate) => candidate.id === schoolId) ?? null;

    if (!school) {
      return;
    }

    localStorage.setItem(SCHOOL_STORAGE_KEY, school.id);

    setActiveSchool(school);
  }

  /**
   * Clear local authenticated application state.
   */
  function logout(): void {
    clearAccessToken();

    clearTenantSelection();

    clearSchoolSelection();

    setUser(null);

    clearTenantRuntimeState();

    setPasswordChangeRequired(false);

    setIsSuperAdmin(false);

    setPlatformRoles([]);

    setPlatformPermissions([]);
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

        setFeatures(context.features);

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

      tenantMembership,

      schools,

      activeSchool,

      selectSchool,

      permissions,

      features,

      access,

      passwordChangeRequired,

      isSuperAdmin,

      isPlatformUser,

      platformRoles,

      platformPermissions,

      loading,

      authenticated: user !== null,

      login,

      logout,
    }),
    [
      user,
      tenant,
      tenantMembership,
      schools,
      activeSchool,
      permissions,
      features,
      access,
      passwordChangeRequired,
      isSuperAdmin,
      isPlatformUser,
      platformRoles,
      platformPermissions,
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
