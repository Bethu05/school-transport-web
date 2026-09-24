import { apiRequest } from "../api/client";

export type SchoolStatus = "active" | "inactive";

export interface School {
  id: string;

  tenantId: string;

  name: string;

  slug: string;

  shortName: string | null;

  logoAssetKey: string | null;

  code: string;

  timezone: string;

  address: string | null;

  status: SchoolStatus;

  createdAt: string;

  updatedAt: string;
}

export interface CreateSchoolInput {
  name: string;

  shortName?: string;

  code: string;

  timezone: string;

  address?: string;
}

export interface UpdateSchoolInput {
  name?: string;

  shortName?: string | null;

  code?: string;

  timezone?: string;

  address?: string | null;
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

export function updateSchool(
  tenantId: string,
  schoolId: string,
  input: UpdateSchoolInput,
): Promise<School> {
  return apiRequest<School>(`/schools/${schoolId}`, {
    tenantId,

    method: "PATCH",

    body: JSON.stringify(input),
  });
}

export interface SchoolProfile {
  schoolId: string;

  tenantId: string;

  countryCode: string | null;

  region: string | null;

  city: string | null;

  addressLine1: string | null;

  addressLine2: string | null;

  postalCode: string | null;

  latitude: number | null;

  longitude: number | null;

  phone: string | null;

  email: string | null;

  website: string | null;

  transportContactName: string | null;

  transportContactEmail: string | null;

  transportContactPhone: string | null;

  emergencyContactName: string | null;

  emergencyContactPhone: string | null;

  motto: string | null;

  vision: string | null;

  about: string | null;

  updatedAt: string;
}

export type UpdateSchoolProfileInput = Partial<
  Omit<SchoolProfile, "schoolId" | "tenantId" | "updatedAt">
>;

export function getSchoolProfile(
  tenantId: string,
  schoolId: string,
): Promise<SchoolProfile> {
  return apiRequest<SchoolProfile>(`/schools/${schoolId}/profile`, {
    tenantId,
  });
}

export function updateSchoolProfile(
  tenantId: string,
  schoolId: string,
  input: UpdateSchoolProfileInput,
): Promise<SchoolProfile> {
  return apiRequest<SchoolProfile>(`/schools/${schoolId}/profile`, {
    tenantId,

    method: "PATCH",

    body: JSON.stringify(input),
  });
}
