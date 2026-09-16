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

/**
 * Fetch the schools visible inside the authenticated tenant.
 *
 * The backend currently returns active schools only. The frontend
 * uses this lightweight endpoint for human-readable selectors.
 */
export function listSchools(tenantId: string): Promise<School[]> {
  return apiRequest<School[]>("/schools", {
    tenantId,
  });
}
