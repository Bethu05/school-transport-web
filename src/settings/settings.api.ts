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

export interface SettingsResponse {
  general: GeneralSettings;
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
