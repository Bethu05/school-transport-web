import { apiRequest } from "../api/client";

export type SettingsDateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export type SettingsTimeFormat = "12h" | "24h";

export type SettingsWeekStartDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface GeneralSettings {
  tenantId: string;

  name: string;

  timezone: string;

  locale: string;

  dateFormat: SettingsDateFormat;

  timeFormat: SettingsTimeFormat;

  weekStartDay: SettingsWeekStartDay;

  updatedAt: string;
}

export interface OrganisationProfile {
  tenantId: string;

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

export interface UpdateOrganisationProfileInput {
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

export interface SettingsResponse {
  general: GeneralSettings;

  profile: OrganisationProfile;
}

export interface UpdateGeneralSettingsInput {
  name?: string;

  timezone?: string;

  locale?: string;

  dateFormat?: SettingsDateFormat;

  timeFormat?: SettingsTimeFormat;

  weekStartDay?: SettingsWeekStartDay;
}

/**
 * Load settings for the authenticated active tenant.
 *
 * Requires settings.read.
 */
export function getSettings(tenantId: string): Promise<SettingsResponse> {
  return apiRequest<SettingsResponse>("/settings", {
    tenantId,
  });
}

/**
 * Update organisation-wide general settings.
 *
 * IMPORTANT:
 *
 * tenantId is never sent in the JSON body.
 * Tenant identity continues to come from the authenticated
 * tenant context through x-tenant-id + backend membership/RLS.
 *
 * Requires settings.update.
 */
export function updateGeneralSettings(
  tenantId: string,
  input: UpdateGeneralSettingsInput,
): Promise<SettingsResponse> {
  return apiRequest<SettingsResponse>("/settings/general", {
    method: "PATCH",

    tenantId,

    body: JSON.stringify(input),
  });
}

export function updateOrganisationProfile(
  tenantId: string,
  input: UpdateOrganisationProfileInput,
): Promise<SettingsResponse> {
  return apiRequest<SettingsResponse>("/settings/profile", {
    method: "PATCH",

    tenantId,

    body: JSON.stringify(input),
  });
}
