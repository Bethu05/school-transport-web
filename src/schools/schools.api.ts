import { apiRequest } from "../api/client";

export type SchoolStatus = "active" | "inactive";

export interface School {
  id: string;

  tenantId: string;

  name: string;

  code: string;

  timezone: string;

  address: string | null;

  status: SchoolStatus;

  createdAt: string;

  updatedAt: string;
}

export interface CreateSchoolInput {
  name: string;

  code: string;

  timezone: string;

  address?: string;
}

/**
 * Fetch active schools visible inside the authenticated tenant.
 *
 * PostgreSQL RLS remains the authoritative tenant boundary.
 */
export function listSchools(tenantId: string): Promise<School[]> {
  return apiRequest<School[]>("/schools", {
    tenantId,
  });
}

/**
 * Create an additional school / campus inside the active tenant.
 *
 * The tenant ID is supplied only through the verified request
 * context header. It is deliberately not part of the payload.
 */
export function createSchool(
  tenantId: string,
  input: CreateSchoolInput,
): Promise<School> {
  return apiRequest<School>("/schools", {
    tenantId,

    method: "POST",

    body: JSON.stringify(input),
  });
}
