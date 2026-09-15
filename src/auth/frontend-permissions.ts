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
  DRIVERS_READ:
    'drivers.read',
  VEHICLES_READ:
    'vehicles.read',
  ROUTES_READ:
    'routes.read',
  TRIPS_READ:
    'trips.read',
  TRIPS_CREATE:
    'trips.create',
  TRIPS_UPDATE:
    'trips.update',
  TRIPS_SCHEDULE:
    'trips.schedule',
  TRIPS_BOARD:
    'trips.board',
  TRIPS_START:
    'trips.start',
  TRIPS_COMPLETE:
    'trips.complete',
  TRIPS_CANCEL:
    'trips.cancel',
  INCIDENTS_READ:
    'incidents.read',
  INCIDENTS_CREATE:
    'incidents.create',
  INCIDENTS_REPORT_ASSIGNED_TRIP:
    'incidents.report_assigned_trip',
  INCIDENTS_UPDATE:
    'incidents.update',
  STOPS_READ:
    'stops.read',

  STOPS_CREATE:
    'stops.create',

  STOPS_UPDATE:
    'stops.update',

  STOPS_DEACTIVATE:
    'stops.deactivate',

  STUDENTS_READ:
    'students.read',

  STUDENTS_CREATE:
    'students.create',

  STUDENTS_UPDATE:
    'students.update',

  STUDENTS_DEACTIVATE:
    'students.deactivate',

  STUDENTS_MANAGE_STOPS:
    'students.manage_stops',

  GUARDIANS_READ:
    'guardians.read',

  GUARDIANS_CREATE:
    'guardians.create',

  GUARDIANS_UPDATE:
    'guardians.update',

  GUARDIANS_ACTIVATE:
    'guardians.activate',

  GUARDIANS_DEACTIVATE:
    'guardians.deactivate',

  GUARDIANS_MANAGE_STUDENTS:
    'guardians.manage_students',
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
  permissions:
    readonly string[]
    | undefined,
  permission:
    FrontendPermission,
): boolean {
  return (
    permissions?.includes(
      permission,
    ) ?? false
  );
}
