import { apiRequest } from "../api/client";

export type TenantAssignableUserRole =
  "admin" | "transport_manager" | "dispatcher" | "staff";

export type TenantMembershipStatus = "active" | "invited" | "suspended";

export interface TenantUser {
  id: string;

  email: string;

  firstName: string;

  lastName: string;

  role: string;

  userStatus: string;

  membershipStatus: TenantMembershipStatus | string;

  mustChangePassword: boolean;
}

export interface CreateTenantUserInput {
  email: string;

  firstName: string;

  lastName: string;

  role: TenantAssignableUserRole;

  /**
   * Used only when the email is a brand-new global identity.
   *
   * The backend deliberately ignores this credential when the
   * email already belongs to an existing global account.
   */
  temporaryPassword?: string;
}

export interface TenantUserProvisionResult {
  identityMode: "created" | "existing";

  temporaryPasswordApplied: boolean;

  user: {
    id: string;

    email: string;

    firstName: string;

    lastName: string;

    status: string;

    mustChangePassword: boolean;
  };

  membership: {
    id: string;

    tenantId: string;

    userId: string;

    role: TenantAssignableUserRole;

    status: string;
  };
}

export interface UpdateTenantUserRoleInput {
  role: TenantAssignableUserRole;
}

export interface ResetTenantUserPasswordInput {
  temporaryPassword: string;
}

/**
 * List all login identities associated with the selected tenant,
 * including suspended memberships so they can be reactivated.
 *
 * Backend users.read + RLS remain authoritative.
 */
export function listTenantUsers(tenantId: string): Promise<TenantUser[]> {
  return apiRequest<TenantUser[]>("/users", {
    tenantId,
  });
}

/**
 * Create a brand-new global identity OR attach an already-existing
 * global identity to this tenant.
 *
 * Existing identities keep their global password and name.
 */
export function createTenantUser(
  tenantId: string,
  input: CreateTenantUserInput,
): Promise<TenantUserProvisionResult> {
  return apiRequest<TenantUserProvisionResult>("/users", {
    method: "POST",

    tenantId,

    body: JSON.stringify(input),
  });
}

/**
 * Change only this tenant's membership role.
 */
export function updateTenantUserRole(
  tenantId: string,
  userId: string,
  input: UpdateTenantUserRoleInput,
): Promise<TenantUser> {
  return apiRequest<TenantUser>(`/users/${userId}/role`, {
    method: "PUT",

    tenantId,

    body: JSON.stringify(input),
  });
}

/**
 * Reactivate tenant access without changing the global identity.
 */
export function activateTenantUser(
  tenantId: string,
  userId: string,
): Promise<TenantUser> {
  return apiRequest<TenantUser>(`/users/${userId}/activate`, {
    method: "PUT",

    tenantId,
  });
}

/**
 * Suspend access to only this tenant.
 *
 * The global user's access to other organisations is unaffected.
 */
export function deactivateTenantUser(
  tenantId: string,
  userId: string,
): Promise<TenantUser> {
  return apiRequest<TenantUser>(`/users/${userId}/deactivate`, {
    method: "PUT",

    tenantId,
  });
}

/**
 * Set another tenant user's temporary password.
 *
 * Backend protection rejects multi-tenant global identities because
 * a tenant administrator must not alter another organisation's
 * credential.
 */
export function resetTenantUserPassword(
  tenantId: string,
  userId: string,
  input: ResetTenantUserPasswordInput,
): Promise<void> {
  return apiRequest<void>(`/users/${userId}/password/reset`, {
    method: "PUT",

    tenantId,

    body: JSON.stringify(input),
  });
}
