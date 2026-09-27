import { apiRequest } from "../api/client";

export type GuardianStatus = "active" | "inactive";

export interface Guardian {
  id: string;

  tenantId: string;

  /**
   * Non-null means this Guardian profile is linked to a global
   * login identity.
   */
  userId: string | null;

  firstName: string;

  lastName: string;

  email: string | null;

  phone: string | null;

  status: GuardianStatus;

  notifyBoarded: boolean;

  notifyDroppedOff: boolean;

  notifyTripUpdates: boolean;

  createdAt: string;

  updatedAt: string;
}

export interface PaginatedGuardians {
  items: Guardian[];

  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

export interface ListGuardiansQuery {
  page?: number;

  limit?: number;

  search?: string;

  status?: GuardianStatus;
}

export interface CreateGuardianInput {
  firstName: string;

  lastName: string;

  email?: string;

  phone?: string;

  notifyBoarded?: boolean;

  notifyDroppedOff?: boolean;

  notifyTripUpdates?: boolean;
}

export interface UpdateGuardianInput {
  firstName?: string;

  lastName?: string;

  email?: string | null;

  phone?: string | null;

  notifyBoarded?: boolean;

  notifyDroppedOff?: boolean;

  notifyTripUpdates?: boolean;
}

export interface CreateGuardianWithParentAppAccessInput extends CreateGuardianInput {
  temporaryPassword: string;
}

export type GuardianIdentityMode = "created" | "existing" | null;

export type GuardianMembershipMode =
  "created" | "existing" | "reactivated" | "suspended" | "preserved" | "none";

export interface GuardianParentAppAccessResult {
  enabled: boolean;

  guardianId: string;

  userId: string | null;

  accountEmail: string | null;

  identityMode: GuardianIdentityMode;

  membershipMode: GuardianMembershipMode;

  temporaryPasswordApplied: boolean;

  membershipRole: string | null;

  membershipStatus: string | null;
}

export interface GuardianCreateWithParentAppAccessResult {
  guardian: Guardian;

  appAccess: GuardianParentAppAccessResult;
}

export interface SetGuardianParentAppAccessInput {
  enabled: boolean;

  temporaryPassword?: string;
}

export function listGuardians(
  tenantId: string,
  query: ListGuardiansQuery,
): Promise<PaginatedGuardians> {
  const params = new URLSearchParams();

  if (query.page) {
    params.set("page", String(query.page));
  }

  if (query.limit) {
    params.set("limit", String(query.limit));
  }

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.status) {
    params.set("status", query.status);
  }

  return apiRequest<PaginatedGuardians>(`/guardians?${params.toString()}`, {
    tenantId,
  });
}

/**
 * Create a contact-only Guardian profile.
 *
 * No login identity is created.
 */
export function createGuardian(
  tenantId: string,
  input: CreateGuardianInput,
): Promise<Guardian> {
  return apiRequest<Guardian>("/guardians", {
    method: "POST",

    tenantId,

    body: JSON.stringify(input),
  });
}

/**
 * Atomically create:
 *
 * Guardian profile
 *   +
 * global login identity/link
 *   +
 * tenant Parent App access
 *
 * Existing global identities keep their existing password.
 */
export function createGuardianWithParentAppAccess(
  tenantId: string,
  input: CreateGuardianWithParentAppAccessInput,
): Promise<GuardianCreateWithParentAppAccessResult> {
  return apiRequest<GuardianCreateWithParentAppAccessResult>(
    "/guardians/with-parent-app-access",
    {
      method: "POST",

      tenantId,

      body: JSON.stringify(input),
    },
  );
}

export function updateGuardian(
  tenantId: string,
  guardianId: string,
  input: UpdateGuardianInput,
): Promise<Guardian> {
  return apiRequest<Guardian>(`/guardians/${guardianId}`, {
    method: "PATCH",

    tenantId,

    body: JSON.stringify(input),
  });
}

/**
 * Enable or remove Parent App access for an existing Guardian.
 *
 * Parent App access is separate from the Guardian business profile.
 */
export function setGuardianParentAppAccess(
  tenantId: string,
  guardianId: string,
  input: SetGuardianParentAppAccessInput,
): Promise<GuardianParentAppAccessResult> {
  return apiRequest<GuardianParentAppAccessResult>(
    `/guardians/${guardianId}/app-access`,
    {
      method: "PUT",

      tenantId,

      body: JSON.stringify(input),
    },
  );
}

export function activateGuardian(
  tenantId: string,
  guardianId: string,
): Promise<Guardian> {
  return apiRequest<Guardian>(`/guardians/${guardianId}/activate`, {
    method: "POST",

    tenantId,
  });
}

export function deactivateGuardian(
  tenantId: string,
  guardianId: string,
): Promise<Guardian> {
  return apiRequest<Guardian>(`/guardians/${guardianId}/deactivate`, {
    method: "POST",

    tenantId,
  });
}

export interface ImportGuardianRowInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface ImportGuardiansInput {
  rows: ImportGuardianRowInput[];
}

export interface ImportGuardianRowResult {
  rowNumber: number;
  email: string;
  status: "imported" | "rejected";
  guardianId?: string;
  message?: string;
}

export interface ImportGuardiansResult {
  total: number;
  imported: number;
  rejected: number;
  results: ImportGuardianRowResult[];
}

export function importGuardians(
  tenantId: string,
  input: ImportGuardiansInput,
): Promise<ImportGuardiansResult> {
  return apiRequest<ImportGuardiansResult>("/guardians/import", {
    method: "POST",
    tenantId,
    body: JSON.stringify(input),
  });
}
