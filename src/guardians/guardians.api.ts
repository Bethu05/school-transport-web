import { apiRequest } from "../api/client";

export type GuardianStatus = "active" | "inactive";

export interface Guardian {
  id: string;
  tenantId: string;
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
