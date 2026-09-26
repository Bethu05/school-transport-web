/**
 * Permission names used by frontend UI components.
 *
 * IMPORTANT:
 *
 * These constants do NOT grant permissions.
 *
 * The backend calculates the authenticated user's effective
 * permissions and returns them through /auth/context.
 *
 * The frontend only asks:
 *
 *   does permissions[] contain X?
 *
 * This prevents frontend/backend role-permission drift.
 */

export const FRONTEND_PERMISSIONS = {
  SCHOOLS_READ: "schools.read",

  SCHOOLS_CREATE: "schools.create",

  SCHOOLS_UPDATE: "schools.update",

  DRIVERS_READ: "drivers.read",
  DRIVERS_CREATE: "drivers.create",
  DRIVERS_IMPORT: "drivers.import",
  DRIVERS_MANAGE_APP_ACCESS: "drivers.manage_app_access",
  VEHICLES_READ: "vehicles.read",
  VEHICLES_IMPORT: "vehicles.import",
  ROUTES_READ: "routes.read",
  TRIPS_READ: "trips.read",
  TRIPS_CREATE: "trips.create",
  TRIPS_UPDATE: "trips.update",
  TRIPS_MANAGE_RIDERS: "trips.manage_riders",
  TRIPS_SCHEDULE: "trips.schedule",
  TRIPS_BOARD: "trips.board",
  TRIPS_START: "trips.start",
  TRIPS_AUTHORIZE_START: "trips.authorize_start",
  TRIPS_COMPLETE: "trips.complete",
  TRIPS_CANCEL: "trips.cancel",
  INCIDENTS_READ: "incidents.read",
  INCIDENTS_CREATE: "incidents.create",
  INCIDENTS_REPORT_ASSIGNED_TRIP: "incidents.report_assigned_trip",
  INCIDENTS_UPDATE: "incidents.update",

  OPERATIONAL_SAFETY_EVENTS_READ: "operational_safety_events.read",

  STOPS_READ: "stops.read",

  STOPS_CREATE: "stops.create",

  STOPS_UPDATE: "stops.update",

  STOPS_DEACTIVATE: "stops.deactivate",

  STUDENTS_READ: "students.read",

  STUDENTS_CREATE: "students.create",

  STUDENTS_IMPORT: "students.import",

  STUDENTS_UPDATE: "students.update",

  STUDENTS_DEACTIVATE: "students.deactivate",

  STUDENTS_MANAGE_STOPS: "students.manage_stops",

  STUDENTS_MANAGE_CUSTOM_FIELDS: "students.manage_custom_fields",

  GUARDIANS_READ: "guardians.read",

  GUARDIANS_CREATE: "guardians.create",

  GUARDIANS_IMPORT: "guardians.import",

  GUARDIANS_UPDATE: "guardians.update",

  GUARDIANS_ACTIVATE: "guardians.activate",

  GUARDIANS_DEACTIVATE: "guardians.deactivate",

  GUARDIANS_MANAGE_STUDENTS: "guardians.manage_students",

  GUARDIANS_MANAGE_APP_ACCESS: "guardians.manage_app_access",

  /**
   * Tenant identity administration.
   *
   * These values only control frontend visibility. Backend
   * PermissionGuard remains authoritative.
   */
  USERS_READ: "users.read",

  USERS_CREATE: "users.create",

  USERS_IMPORT_TRANSPORT_MANAGERS: "users.import_transport_managers",

  USERS_UPDATE_ROLE: "users.update_role",

  USERS_ACTIVATE: "users.activate",

  USERS_DEACTIVATE: "users.deactivate",

  USERS_RESET_PASSWORD: "users.reset_password",

  /**
   * Organisation-wide configuration.
   *
   * These permissions are issued by /auth/context.
   * The frontend does not infer them from role names.
   */
  SETTINGS_READ: "settings.read",

  SETTINGS_UPDATE: "settings.update",
} as const;

export type FrontendPermission =
  (typeof FRONTEND_PERMISSIONS)[keyof typeof FRONTEND_PERMISSIONS];

/**
 * UI authorization is based exclusively on the effective
 * permission set supplied by the backend.
 *
 * Backend PermissionGuard remains authoritative for the request
 * itself; this helper controls frontend visibility/availability.
 */
export function hasFrontendPermission(
  permissions: readonly string[] | undefined,
  permission: FrontendPermission,
): boolean {
  return permissions?.includes(permission) ?? false;
}
