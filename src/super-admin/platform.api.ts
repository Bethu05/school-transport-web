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

export type PlatformFeatureMode = "included" | "addon" | "unavailable";

export type PlatformTenantFeatureSource =
  "addon" | "trial" | "manual" | "contract" | "promotion" | "billing" | "demo";

export type PlatformEffectiveFeatureSource = "override" | "plan" | "none";

export interface PlatformTenantFeatureOverride {
  id: string;

  enabled: boolean;

  source: PlatformTenantFeatureSource;

  limitValue: number | null;

  startsAt: string;

  endsAt: string | null;

  notes: string | null;
}

export interface PlatformTenantFeatureState {
  featureId: string;

  key: string;

  name: string;

  category: string;

  isSafetyBaseline: boolean;

  planMode: PlatformFeatureMode;

  planLimitValue: number | null;

  override: PlatformTenantFeatureOverride | null;

  effectiveEnabled: boolean;

  effectiveLimitValue: number | null;

  effectiveSource: PlatformEffectiveFeatureSource;
}

interface PlatformTenantFeatureStatesResponse {
  items: PlatformTenantFeatureState[];
}

export interface SetPlatformTenantFeatureEntitlementInput {
  enabled: boolean;

  source: PlatformTenantFeatureSource;

  limitValue?: number;

  startsAt?: string;

  endsAt?: string;

  /**
   * Required justification for a tenant-specific commercial exception.
   */
  notes: string;
}

export interface PlatformTenantFeatureEntitlementResult {
  id: string;

  tenantId: string;

  featureId: string;

  enabled: boolean;

  source: PlatformTenantFeatureSource;

  limitValue: number | null;

  startsAt: string;

  endsAt: string | null;

  notes: string | null;
}

/**
 * Read the package allowance, tenant override and effective result
 * for all commercial features of one customer tenant.
 *
 * This remains a Platform Admin request and therefore deliberately
 * carries no x-tenant-id header.
 */
export async function listPlatformTenantFeatureStates(
  tenantId: string,
): Promise<PlatformTenantFeatureState[]> {
  const response = await apiRequest<PlatformTenantFeatureStatesResponse>(
    `/platform/tenants/${tenantId}/commercial/features`,
  );

  return response.items;
}

/**
 * Create or replace a tenant-specific feature entitlement.
 *
 * limitValue is the TOTAL effective allowance purchased or manually
 * assigned to the tenant, not an increment over the plan allowance.
 */
export function setPlatformTenantFeatureEntitlement(
  tenantId: string,
  featureId: string,
  input: SetPlatformTenantFeatureEntitlementInput,
): Promise<PlatformTenantFeatureEntitlementResult> {
  return apiRequest<PlatformTenantFeatureEntitlementResult>(
    `/platform/tenants/${tenantId}/commercial/features/${featureId}`,
    {
      method: "PUT",

      body: JSON.stringify(input),
    },
  );
}

/**
 * Remove the customer-specific override.
 *
 * The tenant immediately falls back to its package configuration.
 */
export function removePlatformTenantFeatureEntitlement(
  tenantId: string,
  featureId: string,
): Promise<{ removed: boolean }> {
  return apiRequest<{ removed: boolean }>(
    `/platform/tenants/${tenantId}/commercial/features/${featureId}`,
    {
      method: "DELETE",
    },
  );
}

export interface ResetPlatformTenantAdminPasswordInput {
  temporaryPassword: string;
}

/**
 * Platform-support password recovery.
 *
 * The target user's global login credential is replaced with a
 * temporary password and the backend forces password change at
 * next sign-in.
 */
export function resetPlatformTenantAdminPassword(
  tenantId: string,
  userId: string,
  input: ResetPlatformTenantAdminPasswordInput,
): Promise<void> {
  return apiRequest<void>(
    `/platform/tenants/${tenantId}/admins/${userId}/password/reset`,
    {
      method: "PUT",

      body: JSON.stringify(input),
    },
  );
}

export type PlatformTenantCapacitySource =
  "billing" | "contract" | "promotion" | "manual" | "demo" | "bootstrap";

export type SetPlatformTenantCapacitySource =
  "billing" | "contract" | "promotion" | "manual" | "demo";

export interface PlatformTenantCapacityDimension {
  used: number;

  limit: number;

  overLimit: boolean;
}

export interface PlatformTenantCapacityState {
  tenantId: string;

  source: PlatformTenantCapacitySource;

  notes: string | null;

  updatedAt: string;

  schools: PlatformTenantCapacityDimension;

  students: PlatformTenantCapacityDimension;

  vehicles: PlatformTenantCapacityDimension;

  drivers: PlatformTenantCapacityDimension;
}

export interface SetPlatformTenantCapacityInput {
  schools: number;

  students: number;

  vehicles: number;

  drivers: number;

  source: SetPlatformTenantCapacitySource;

  notes?: string;
}

/**
 * Read tenant-wide commercial capacity and current usage.
 *
 * These limits apply to the whole tenant account, not per school.
 */
export function getPlatformTenantCapacity(
  tenantId: string,
): Promise<PlatformTenantCapacityState> {
  return apiRequest<PlatformTenantCapacityState>(
    `/platform/tenants/${tenantId}/commercial/capacity`,
  );
}

/**
 * Replace the tenant's TOTAL contracted operating capacity.
 *
 * Values are absolute allowances, not increments.
 */
export function setPlatformTenantCapacity(
  tenantId: string,
  input: SetPlatformTenantCapacityInput,
): Promise<PlatformTenantCapacityState> {
  return apiRequest<PlatformTenantCapacityState>(
    `/platform/tenants/${tenantId}/commercial/capacity`,
    {
      method: "PUT",

      body: JSON.stringify(input),
    },
  );
}

export type PlatformPlanFeatureMode = "included" | "addon" | "unavailable";

export interface PlatformPlanFeature {
  id: string;

  key: string;

  name: string;

  category: string;

  description: string | null;

  status: string;

  isSafetyBaseline: boolean;

  mode: PlatformPlanFeatureMode;

  limitValue: number | null;
}

export interface PlatformPlanCapacityDefaults {
  planId: string;

  configured: boolean;

  schools: number | null;

  students: number | null;

  vehicles: number | null;

  drivers: number | null;

  updatedAt: string | null;
}

export interface PlatformPlanDetail {
  id: string;

  code: string;

  name: string;

  description: string | null;

  status: string;

  isSellable: boolean;

  sortOrder: number;

  capacityDefaults: PlatformPlanCapacityDefaults;

  features: PlatformPlanFeature[];
}

export interface SetPlatformPlanCapacityDefaultsInput {
  schools: number;

  students: number;

  vehicles: number;

  drivers: number;
}

/**
 * Replace the default TOTAL operating capacity bundled with a package.
 *
 * These defaults do not alter any existing customer's negotiated
 * tenant capacity.
 */
export function setPlatformPlanCapacityDefaults(
  planId: string,
  input: SetPlatformPlanCapacityDefaultsInput,
): Promise<PlatformPlanCapacityDefaults> {
  return apiRequest<PlatformPlanCapacityDefaults>(
    `/platform/plans/${planId}/capacity-defaults`,
    {
      method: "PUT",

      body: JSON.stringify(input),
    },
  );
}

export interface SetPlatformPlanFeatureInput {
  mode: PlatformPlanFeatureMode;

  /**
   * TOTAL package allowance.
   *
   * This is not an increment over the existing limit.
   */
  limitValue?: number;
}

export interface PlatformPlanFeatureMutationResult {
  planId: string;

  featureId: string;

  mode: PlatformPlanFeatureMode;

  limitValue: number | null;
}

/**
 * Fetch one plan with its complete feature matrix.
 */
export function getPlatformPlan(planId: string): Promise<PlatformPlanDetail> {
  return apiRequest<PlatformPlanDetail>(`/platform/plans/${planId}`);
}

/**
 * Update one feature inside one commercial plan.
 */
export function setPlatformPlanFeature(
  planId: string,
  featureId: string,
  input: SetPlatformPlanFeatureInput,
): Promise<PlatformPlanFeatureMutationResult> {
  return apiRequest<PlatformPlanFeatureMutationResult>(
    `/platform/plans/${planId}/features/${featureId}`,
    {
      method: "PUT",

      body: JSON.stringify(input),
    },
  );
}
