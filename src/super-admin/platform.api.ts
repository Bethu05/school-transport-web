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

export interface PlatformTenantProfile {
  tenantId: string;

  name: string;

  slug: string;

  status: string;

  timezone: string;

  displayName: string | null;

  countryCode: string | null;

  region: string | null;

  city: string | null;

  addressLine1: string | null;

  addressLine2: string | null;

  postalCode: string | null;

  phone: string | null;

  email: string | null;

  website: string | null;

  operationalContactName: string | null;

  operationalContactEmail: string | null;

  operationalContactPhone: string | null;

  motto: string | null;

  vision: string | null;

  about: string | null;

  logoAssetKey: string | null;

  updatedAt: string;
}

export interface UpdatePlatformTenantProfileInput {
  name: string;

  timezone: string;

  displayName?: string | null;

  countryCode?: string | null;

  region?: string | null;

  city?: string | null;

  addressLine1?: string | null;

  addressLine2?: string | null;

  postalCode?: string | null;

  phone?: string | null;

  email?: string | null;

  website?: string | null;

  operationalContactName?: string | null;

  operationalContactEmail?: string | null;

  operationalContactPhone?: string | null;

  motto?: string | null;

  vision?: string | null;

  about?: string | null;
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

export function getPlatformTenantProfile(
  tenantId: string,
): Promise<PlatformTenantProfile> {
  return apiRequest<PlatformTenantProfile>(
    `/platform/tenants/${tenantId}/profile`,
  );
}

export function updatePlatformTenantProfile(
  tenantId: string,
  input: UpdatePlatformTenantProfileInput,
): Promise<PlatformTenantProfile> {
  return apiRequest<PlatformTenantProfile>(
    `/platform/tenants/${tenantId}/profile`,
    {
      method: "PATCH",

      body: JSON.stringify(input),
    },
  );
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

// ============================================================
// PRE-TENANT SCHOOL SETUP REQUESTS
//
// School applications exist before a tenant exists.
// Approval provisions the tenant + first school and hands the
// school into the canonical 15-step onboarding workflow.
// ============================================================

export type PlatformSchoolSetupRequestStatus =
  "draft" | "submitted" | "approved" | "rejected";

export interface PlatformSchoolSetupRequestEvent {
  id: number;

  eventType: string;

  actorUserId: string;

  details: Record<string, unknown>;

  createdAt: string;
}

export interface PlatformSchoolSetupRequest {
  id: string;

  status: PlatformSchoolSetupRequestStatus;

  tenantName: string;

  tenantSlug: string;

  timezone: string;

  schoolName: string;

  schoolCode: string;

  schoolAddress: string | null;

  createdBy: string;

  submittedAt: string | null;

  reviewedBy: string | null;

  reviewedAt: string | null;

  decisionNotes: string | null;

  tenantId: string | null;

  createdAt: string;

  updatedAt: string;

  events: PlatformSchoolSetupRequestEvent[];
}

interface PlatformSchoolSetupRequestListResponse {
  items: PlatformSchoolSetupRequest[];
}

export interface CreatePlatformSchoolSetupRequestInput {
  tenantName: string;

  tenantSlug: string;

  timezone: string;

  schoolName: string;

  schoolCode: string;

  schoolAddress?: string;
}

export type UpdatePlatformSchoolSetupRequestInput =
  CreatePlatformSchoolSetupRequestInput;

export function createPlatformSchoolSetupRequest(
  input: CreatePlatformSchoolSetupRequestInput,
): Promise<PlatformSchoolSetupRequest> {
  return apiRequest<PlatformSchoolSetupRequest>(
    "/platform/school-setup-requests",
    {
      method: "POST",

      body: JSON.stringify(input),
    },
  );
}

export async function listOwnPlatformSchoolSetupRequests(): Promise<
  PlatformSchoolSetupRequest[]
> {
  const response = await apiRequest<PlatformSchoolSetupRequestListResponse>(
    "/platform/school-setup-requests/mine",
  );

  return response.items;
}

export function updateOwnPlatformSchoolSetupRequest(
  requestId: string,
  input: UpdatePlatformSchoolSetupRequestInput,
): Promise<PlatformSchoolSetupRequest> {
  return apiRequest<PlatformSchoolSetupRequest>(
    `/platform/school-setup-requests/${requestId}`,
    {
      method: "PUT",

      body: JSON.stringify(input),
    },
  );
}

export function submitOwnPlatformSchoolSetupRequest(
  requestId: string,
): Promise<PlatformSchoolSetupRequest> {
  return apiRequest<PlatformSchoolSetupRequest>(
    `/platform/school-setup-requests/${requestId}/submit`,
    {
      method: "POST",
    },
  );
}

export interface ApprovePlatformSchoolSetupRequestInput {
  notes?: string;
}

export interface RejectPlatformSchoolSetupRequestInput {
  reason: string;
}

/**
 * Platform review queue for submitted school applications.
 *
 * These records are deliberately pre-tenant. A tenantId appears
 * only after an authorized approval provisions the school.
 */
export async function listPlatformSchoolSetupRequestsForReview(): Promise<
  PlatformSchoolSetupRequest[]
> {
  const response = await apiRequest<PlatformSchoolSetupRequestListResponse>(
    "/platform/school-setup-requests/review",
  );

  return response.items;
}

/**
 * Approve a submitted application.
 *
 * Approval provisions the tenant + first school and transfers the
 * school into the canonical onboarding workflow. It does not make
 * the school live.
 */
export function approvePlatformSchoolSetupRequest(
  requestId: string,
  input: ApprovePlatformSchoolSetupRequestInput,
): Promise<PlatformSchoolSetupRequest> {
  return apiRequest<PlatformSchoolSetupRequest>(
    `/platform/school-setup-requests/${requestId}/approve`,
    {
      method: "POST",

      body: JSON.stringify(input),
    },
  );
}

/**
 * Reject a submitted application without provisioning a tenant.
 */
export function rejectPlatformSchoolSetupRequest(
  requestId: string,
  input: RejectPlatformSchoolSetupRequestInput,
): Promise<PlatformSchoolSetupRequest> {
  return apiRequest<PlatformSchoolSetupRequest>(
    `/platform/school-setup-requests/${requestId}/reject`,
    {
      method: "POST",

      body: JSON.stringify(input),
    },
  );
}

// ============================================================
// PLATFORM TENANT ONBOARDING WORKFLOW
//
// These are Platform Super Admin calls.
//
// They deliberately do NOT supply x-tenant-id. The target tenant
// is identified by the platform endpoint path and independently
// authorized by the backend.
// ============================================================

export type PlatformOnboardingApprovalStatus =
  "pending_review" | "approved" | "rejected";

export type PlatformOnboardingStepStatus =
  "pending" | "in_progress" | "completed" | "skipped" | "blocked";

export type PlatformOnboardingStage =
  | "registration"
  | "approval"
  | "provisioning"
  | "commercial_setup"
  | "account_setup"
  | "data_migration"
  | "data_validation"
  | "ready_to_launch"
  | "live";

export interface PlatformOnboardingStep {
  stepKey: string;

  stepOrder: number;

  stepName: string;

  status: PlatformOnboardingStepStatus;

  requiredForActivation: boolean;

  completionMethod: string | null;

  completedBy: string | null;

  completedAt: string | null;

  notes: string | null;

  metadata: Record<string, unknown>;

  updatedBy: string | null;

  updatedAt: string;
}

export interface PlatformOnboardingWorkflow {
  tenantId: string;

  tenantName: string;

  tenantSlug: string;

  approvalStatus: PlatformOnboardingApprovalStatus;

  currentStage: PlatformOnboardingStage;

  approvedBy: string | null;

  approvedAt: string | null;

  rejectedBy: string | null;

  rejectedAt: string | null;

  rejectionReason: string | null;

  activatedBy: string | null;

  activatedAt: string | null;

  createdAt: string;

  updatedAt: string;

  steps: PlatformOnboardingStep[];
}

export interface PlatformOnboardingQueueItem {
  tenantId: string;

  tenantName: string;

  tenantSlug: string;

  tenantStatus: string;

  approvalStatus: PlatformOnboardingApprovalStatus;

  currentStage: PlatformOnboardingStage;

  completedRequiredSteps: number;

  requiredSteps: number;

  updatedAt: string;
}

export interface PlatformOnboardingQueue {
  items: PlatformOnboardingQueueItem[];
}

export interface PlatformOnboardingSummary {
  tenant: {
    id: string;

    name: string;

    slug: string;

    status: string;

    timezone: string;
  };

  workflow: {
    approvalStatus: PlatformOnboardingApprovalStatus;

    currentStage: PlatformOnboardingStage;

    approvedAt: string | null;

    activatedAt: string | null;

    readyToActivate: boolean;

    live: boolean;
  };

  progress: {
    requiredSteps: number;

    completedRequiredSteps: number;

    remainingRequiredSteps: number;

    percent: number;
  };

  blockers: Array<{
    stepKey: string;

    stepOrder: number;

    stepName: string;

    status: PlatformOnboardingStepStatus;
  }>;

  commercial: {
    planId: string;

    planCode: string;

    planName: string;

    subscriptionStatus: string;

    startsAt: string;

    endsAt: string | null;

    externalReference: string | null;
  } | null;

  initialAdmin: {
    userId: string;

    email: string;

    firstName: string;

    lastName: string;

    userStatus: string;

    membershipStatus: string;
  } | null;

  step13: {
    status: PlatformOnboardingStepStatus;

    completionMethod: string | null;

    completedAt: string | null;
  } | null;
}

export interface SetPlatformOnboardingApprovalInput {
  approvalStatus: PlatformOnboardingApprovalStatus;

  notes?: string;
}

export interface UpdatePlatformOnboardingStepInput {
  status: PlatformOnboardingStepStatus;

  completionMethod?: string;

  notes?: string;

  metadata?: Record<string, unknown>;
}

export interface ActivatePlatformOnboardingInput {
  notes?: string;
}

/**
 * Global approval/readiness queue.
 *
 * This is wired now for the later top-level Onboarding workspace.
 */
export function listPlatformOnboardingQueue(): Promise<PlatformOnboardingQueue> {
  return apiRequest<PlatformOnboardingQueue>("/platform/onboarding/queue");
}

/**
 * Canonical persisted 15-step workflow.
 */
export function getPlatformOnboardingWorkflow(
  tenantId: string,
): Promise<PlatformOnboardingWorkflow> {
  return apiRequest<PlatformOnboardingWorkflow>(
    `/platform/onboarding/tenants/${tenantId}`,
  );
}

/**
 * Read launch readiness, blockers, commercial configuration and
 * administrator evidence for one tenant.
 */
export function getPlatformOnboardingSummary(
  tenantId: string,
): Promise<PlatformOnboardingSummary> {
  return apiRequest<PlatformOnboardingSummary>(
    `/platform/onboarding/tenants/${tenantId}/summary`,
  );
}

/**
 * Super Admin approval decision.
 */
export function setPlatformOnboardingApproval(
  tenantId: string,
  input: SetPlatformOnboardingApprovalInput,
): Promise<PlatformOnboardingWorkflow> {
  return apiRequest<PlatformOnboardingWorkflow>(
    `/platform/onboarding/tenants/${tenantId}/approval`,
    {
      method: "PUT",

      body: JSON.stringify(input),
    },
  );
}

/**
 * Manual workflow evidence update.
 *
 * The UI deliberately uses this only where human evidence is
 * appropriate. System-managed steps are never given generic
 * completion buttons.
 */
export function updatePlatformOnboardingStep(
  tenantId: string,
  stepKey: string,
  input: UpdatePlatformOnboardingStepInput,
): Promise<PlatformOnboardingWorkflow> {
  return apiRequest<PlatformOnboardingWorkflow>(
    `/platform/onboarding/tenants/${tenantId}/steps/${stepKey}`,
    {
      method: "PUT",

      body: JSON.stringify(input),
    },
  );
}

/**
 * Re-read verified platform evidence and reconcile automatic steps.
 */
export function reconcilePlatformOnboarding(
  tenantId: string,
): Promise<PlatformOnboardingWorkflow> {
  return apiRequest<PlatformOnboardingWorkflow>(
    `/platform/onboarding/tenants/${tenantId}/reconcile`,
    {
      method: "POST",
    },
  );
}

/**
 * Step 12 activation gate.
 */
export function activatePlatformOnboarding(
  tenantId: string,
  input: ActivatePlatformOnboardingInput,
): Promise<PlatformOnboardingWorkflow> {
  return apiRequest<PlatformOnboardingWorkflow>(
    `/platform/onboarding/tenants/${tenantId}/activate`,
    {
      method: "PUT",

      body: JSON.stringify(input),
    },
  );
}

// ============================================================
// REVIEWED TENANT SALES CONFIGURATION
//
// This is the canonical onboarding commercial transaction for
// Steps 5-8. The backend persists subscription, capacity and
// feature exceptions atomically and emits the parent commercial
// audit event consumed by onboarding reconciliation.
// ============================================================

export type PlatformSalesCapacitySource =
  "billing" | "contract" | "promotion" | "manual";

export type PlatformSalesFeatureExceptionSource =
  "addon" | "trial" | "manual" | "contract" | "promotion" | "billing";

export interface PlatformSalesCapacityInput {
  schools: number;

  students: number;

  vehicles: number;

  drivers: number;

  source?: PlatformSalesCapacitySource;

  reason?: string;
}

export interface PlatformSalesFeatureExceptionInput {
  featureId: string;

  enabled: boolean;

  source: PlatformSalesFeatureExceptionSource;

  reason: string;

  limitValue?: number;

  endsAt?: string;
}

export interface ApplyPlatformTenantSalesConfigurationInput {
  planId: string;

  status: "active" | "trialing";

  endsAt?: string;

  capacity: PlatformSalesCapacityInput;

  featureExceptions: PlatformSalesFeatureExceptionInput[];

  dealReference?: string;

  dealNotes?: string;
}

export interface PlatformSalesConfigurationResult {
  auditEventId: number;

  subscription: {
    planId: string;

    status: "active" | "trialing" | "cancelled" | "expired";

    startsAt: string;

    endsAt: string | null;

    externalReference: string | null;
  };

  capacity: PlatformTenantCapacityState;

  featureStates: PlatformTenantFeatureState[];
}

/**
 * Apply the complete reviewed commercial deal atomically.
 *
 * This endpoint is intentionally different from the ordinary
 * post-onboarding subscription/capacity/feature admin controls.
 */
export function applyPlatformTenantSalesConfiguration(
  tenantId: string,
  input: ApplyPlatformTenantSalesConfigurationInput,
): Promise<PlatformSalesConfigurationResult> {
  return apiRequest<PlatformSalesConfigurationResult>(
    `/platform/tenants/${tenantId}/commercial/sales-configuration`,
    {
      method: "PUT",

      body: JSON.stringify(input),
    },
  );
}

// ============================================================
// PLATFORM ACCESS MANAGEMENT
//
// Super Admin-only platform identity + access control.
// ============================================================

export type PlatformAccessStatus = "active" | "suspended" | "revoked";

export interface PlatformAccessUser {
  id: string;

  email: string;

  firstName: string;

  lastName: string;

  status: string;

  platformAccessStatus: PlatformAccessStatus;

  roles: string[];

  createdAt: string;

  platformAddedAt: string;
}

export interface PlatformAccessRoleCatalogueItem {
  key: string;

  name: string;

  description: string | null;
}

export interface PlatformPermissionCatalogueItem {
  key: string;

  module: string;

  action: string;

  description: string | null;
}

export interface PlatformAccessRoleAssignment {
  role: string;

  status: "active" | "suspended" | "revoked";

  createdAt: string;

  updatedAt: string;
}

export interface PlatformUserAccessIdentity {
  id: string;

  email: string;

  firstName: string;

  lastName: string;

  status: string;

  createdAt: string;

  updatedAt: string;

  mustChangePassword: boolean;

  passwordChangedAt: string | null;
}

export interface PlatformUserAccess {
  user: PlatformUserAccessIdentity;

  roles: string[];

  roleAssignments: PlatformAccessRoleAssignment[];

  platformAccessStatus: PlatformAccessStatus;

  platformAddedAt: string;

  platformUpdatedAt: string;

  inheritedPermissions: string[];

  additionalPermissions: string[];

  effectivePermissions: string[];
}

interface PlatformAccessUserSearchResponse {
  items: PlatformAccessUser[];
}

interface PlatformAccessRoleListResponse {
  items: PlatformAccessRoleCatalogueItem[];
}

interface PlatformPermissionCatalogueResponse {
  items: PlatformPermissionCatalogueItem[];
}

export async function searchPlatformAccessUsers(
  search: string,
): Promise<PlatformAccessUser[]> {
  const normalized = search.trim();

  if (normalized.length < 2) {
    return [];
  }

  const response = await apiRequest<PlatformAccessUserSearchResponse>(
    `/platform/access/users/search?q=${encodeURIComponent(normalized)}`,
  );

  return response.items;
}

export async function listPlatformAccessRoles(): Promise<
  PlatformAccessRoleCatalogueItem[]
> {
  const response = await apiRequest<PlatformAccessRoleListResponse>(
    "/platform/access/roles",
  );

  return response.items;
}

export async function listPlatformPermissionCatalogue(): Promise<
  PlatformPermissionCatalogueItem[]
> {
  const response = await apiRequest<PlatformPermissionCatalogueResponse>(
    "/platform/access/permissions",
  );

  return response.items;
}

export function getPlatformUserAccess(
  userId: string,
): Promise<PlatformUserAccess> {
  return apiRequest<PlatformUserAccess>(`/platform/access/users/${userId}`);
}

export interface CreatePlatformAccessUserInput {
  email: string;

  firstName: string;

  lastName: string;

  role: string;

  temporaryPassword: string;
}

export function createPlatformAccessUser(
  input: CreatePlatformAccessUserInput,
): Promise<PlatformUserAccess> {
  return apiRequest<PlatformUserAccess>("/platform/access/users", {
    method: "POST",

    body: JSON.stringify(input),
  });
}

export function replacePlatformUserPermissions(
  userId: string,
  permissionKeys: string[],
): Promise<PlatformUserAccess> {
  return apiRequest<PlatformUserAccess>(
    `/platform/access/users/${userId}/permissions`,
    {
      method: "PUT",

      body: JSON.stringify({
        permissionKeys,
      }),
    },
  );
}

export function resetPlatformAccessUserPassword(
  userId: string,
  temporaryPassword: string,
): Promise<PlatformUserAccess> {
  return apiRequest<PlatformUserAccess>(
    `/platform/access/users/${userId}/password/reset`,
    {
      method: "PUT",

      body: JSON.stringify({
        temporaryPassword,
      }),
    },
  );
}

export function setPlatformAccessUserStatus(
  userId: string,
  status: "active" | "suspended",
): Promise<PlatformUserAccess> {
  return apiRequest<PlatformUserAccess>(
    `/platform/access/users/${userId}/status`,
    {
      method: "PUT",

      body: JSON.stringify({
        status,
      }),
    },
  );
}
