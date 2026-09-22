import { apiRequest, setAccessToken } from "../api/client";

export interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  tokenType?: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface ActiveTenant {
  tenantId: string;
  role: string;
}

export interface PasswordSecurityState {
  mustChangePassword: boolean;
}

export type TenantCommercialAccessReason =
  | "active_subscription"
  | "active_trial"
  | "subscription_required"
  | "trial_expired"
  | "subscription_expired"
  | "subscription_inactive"
  | "subscription_not_started"
  | "plan_inactive";

export interface TenantCommercialAccess {
  operational: boolean;

  reason: TenantCommercialAccessReason;

  subscriptionStatus: "active" | "trialing" | "cancelled" | "expired" | null;

  startsAt: string | null;

  endsAt: string | null;

  planStatus: string | null;
}

export interface AuthTenantMembership extends ActiveTenant {
  name: string;

  slug: string;

  timezone: string;
}

interface AuthTenantListResponse {
  items: AuthTenantMembership[];
}

export interface CurrentUserResponse {
  user: AuthenticatedUser;

  platform: {
    isSuperAdmin: boolean;
  };

  /**
   * Credential state comes from live backend identity state.
   *
   * This is deliberately independent from tenant commercial access.
   */
  security: PasswordSecurityState;
}

export type TenantFeatureAccessSource =
  | "override"
  | "plan"
  | "none";

export interface TenantFeatureAccess {
  key: string;

  enabled: boolean;

  source: TenantFeatureAccessSource;

  limitValue: number | null;
}

export interface AuthContextResponse {
  user: AuthenticatedUser;

  tenant: ActiveTenant;

  /**
   * Effective permissions calculated by the backend.
   *
   * This is the frontend authorization source of truth.
   */
  permissions: string[];

  /**
   * Effective commercial capabilities for the selected tenant.
   *
   * Permission and entitlement remain separate concerns.
   */
  features: TenantFeatureAccess[];

  /**
   * Commercial access is calculated by the backend.
   *
   * Authentication and tenant membership may remain valid even
   * when operational access is paused.
   */
  access: TenantCommercialAccess;
}

export interface ChangePasswordInput {
  currentPassword: string;

  newPassword: string;
}

/**
 * Authenticate the user and store the JWT.
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",

    auth: false,

    body: JSON.stringify(credentials),
  });

  setAccessToken(response.accessToken);

  return response;
}

/**
 * JWT identity + live password-security state.
 *
 * No tenant header is required because password identity is global.
 */
export function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiRequest<CurrentUserResponse>("/auth/me");
}

/**
 * Change the authenticated user's own password.
 *
 * No x-tenant-id is supplied because passwords belong to the
 * global identity rather than one organisation.
 */
export function changePassword(input: ChangePasswordInput): Promise<void> {
  return apiRequest<void>("/auth/password", {
    method: "PUT",

    body: JSON.stringify(input),
  });
}

/**
 * Discover tenants the authenticated identity is actually
 * allowed to access.
 *
 * No tenant header is required because tenant selection has
 * not happened yet.
 */
export async function getAuthTenants(): Promise<AuthTenantMembership[]> {
  const response = await apiRequest<AuthTenantListResponse>("/auth/tenants");

  return response.items;
}

/**
 * Fully verified tenant context.
 *
 * Backend checks membership before returning the tenant role.
 */
export function getAuthContext(tenantId: string): Promise<AuthContextResponse> {
  return apiRequest<AuthContextResponse>("/auth/context", {
    tenantId,
  });
}
