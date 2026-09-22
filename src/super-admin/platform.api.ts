import { apiRequest } from "../api/client";

export interface PlatformTenantListItem {
  id: string;

  name: string;

  slug: string;

  status: string;

  timezone: string;

  planCode: string | null;

  planName: string | null;

  subscriptionStatus: "active" | "trialing" | "cancelled" | "expired" | null;

  subscriptionStartsAt: string | null;

  subscriptionEndsAt: string | null;

  subscriptionEffective: boolean;
}

interface PlatformTenantListResponse {
  items: PlatformTenantListItem[];
}

/**
 * Platform-level request.
 *
 * Authentication is supplied by apiRequest automatically.
 * No tenantId is supplied because this is deliberately a
 * cross-tenant Platform Admin endpoint.
 */
export async function listPlatformTenants(): Promise<PlatformTenantListItem[]> {
  const response =
    await apiRequest<PlatformTenantListResponse>("/platform/tenants");

  return response.items;
}

export interface PlatformPlanSummary {
  id: string;

  code: string;

  name: string;

  description: string | null;

  status: string;

  isSellable: boolean;
}

interface PlatformPlanListResponse {
  items: PlatformPlanSummary[];
}

export interface SetPlatformTenantSubscriptionInput {
  planId: string;

  status: "active" | "trialing";

  startsAt?: string;

  endsAt?: string;

  externalReference?: string;
}

export interface PlatformTenantSubscriptionResult {
  id: string;

  tenantId?: string;

  planId: string;

  status: "active" | "trialing" | "cancelled" | "expired";

  startsAt: string;

  endsAt: string | null;

  externalReference: string | null;
}

/**
 * Fetch commercial plans visible to Platform Admin.
 */
export async function listPlatformPlans(): Promise<PlatformPlanSummary[]> {
  const response =
    await apiRequest<PlatformPlanListResponse>("/platform/plans");

  return response.items;
}

/**
 * Assign or replace the current commercial subscription.
 *
 * No x-tenant-id is supplied. The tenant is identified by the
 * platform endpoint path and authorization remains platform-level.
 */
export function setPlatformTenantSubscription(
  tenantId: string,
  input: SetPlatformTenantSubscriptionInput,
): Promise<PlatformTenantSubscriptionResult> {
  return apiRequest<PlatformTenantSubscriptionResult>(
    `/platform/tenants/${tenantId}/commercial/subscription`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

/**
 * Pause operational access without disabling the tenant identity
 * or any user accounts.
 */
export function pausePlatformTenantAccess(
  tenantId: string,
): Promise<PlatformTenantSubscriptionResult> {
  return apiRequest<PlatformTenantSubscriptionResult>(
    `/platform/tenants/${tenantId}/commercial/pause`,
    {
      method: "PUT",
    },
  );
}

export interface CreatePlatformTenantInput {
  tenantName: string;

  tenantSlug: string;

  timezone: string;

  schoolName: string;

  schoolCode: string;

  schoolAddress?: string;
}

export interface PlatformTenantOnboardingResult {
  tenant: {
    id: string;

    name: string;

    slug: string;

    status: string;

    timezone: string;
  };

  school: {
    id: string;

    tenantId: string;

    name: string;

    code: string;

    timezone: string;

    address: string | null;

    status: string;
  };
}

/**
 * Create a new customer tenant together with its first school.
 *
 * This is a platform-level request and deliberately carries no
 * x-tenant-id header.
 */
export function createPlatformTenant(
  input: CreatePlatformTenantInput,
): Promise<PlatformTenantOnboardingResult> {
  return apiRequest<PlatformTenantOnboardingResult>("/platform/tenants", {
    method: "POST",

    body: JSON.stringify(input),
  });
}

export interface CreateInitialTenantAdminInput {
  email: string;

  firstName: string;

  lastName: string;

  password: string;
}

export interface PlatformInitialTenantAdminResult {
  user: {
    id: string;

    email: string;

    firstName: string;

    lastName: string;

    status: string;
  };

  membership: {
    id: string;

    tenantId: string;

    userId: string;

    role: "admin";

    status: string;
  };
}

/**
 * Create the first administrator account for a customer tenant.
 *
 * The password is sent only to the authenticated Platform Admin
 * endpoint. The backend hashes it with Argon2 before persistence.
 */
export function createInitialTenantAdmin(
  tenantId: string,
  input: CreateInitialTenantAdminInput,
): Promise<PlatformInitialTenantAdminResult> {
  return apiRequest<PlatformInitialTenantAdminResult>(
    `/platform/tenants/${tenantId}/admins/initial`,
    {
      method: "POST",

      body: JSON.stringify(input),
    },
  );
}

export interface PlatformTenantOnboardingStatus {
  tenantId: string;

  hasInitialAdmin: boolean;

  initialAdmin: {
    userId: string;

    email: string;

    firstName: string;

    lastName: string;

    userStatus: string;

    membershipStatus: string;
  } | null;
}

/**
 * Read persistent onboarding state for one tenant.
 *
 * This allows Platform Administration to render the correct
 * state after navigation or a full browser reload.
 */
export function getPlatformTenantOnboardingStatus(
  tenantId: string,
): Promise<PlatformTenantOnboardingStatus> {
  return apiRequest<PlatformTenantOnboardingStatus>(
    `/platform/tenants/${tenantId}/onboarding`,
  );
}
