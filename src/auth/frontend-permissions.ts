/**
 * Frontend permission mirror used only to control visibility of actions.
 *
 * SECURITY:
 * The backend PermissionGuard remains the source of truth and still
 * authorizes every request. This helper only prevents the UI from
 * advertising actions that the current tenant role cannot perform.
 */
export const FRONTEND_PERMISSIONS = {
  STOPS_READ:
    'stops.read',

  STOPS_CREATE:
    'stops.create',

  STOPS_UPDATE:
    'stops.update',

  STOPS_DEACTIVATE:
    'stops.deactivate',
} as const;

export type FrontendPermission =
  (typeof FRONTEND_PERMISSIONS)[keyof typeof FRONTEND_PERMISSIONS];

const ALL_STOP_PERMISSIONS:
  readonly FrontendPermission[] = [
    FRONTEND_PERMISSIONS.STOPS_READ,
    FRONTEND_PERMISSIONS.STOPS_CREATE,
    FRONTEND_PERMISSIONS.STOPS_UPDATE,
    FRONTEND_PERMISSIONS.STOPS_DEACTIVATE,
  ];

const ROLE_PERMISSIONS:
  Record<
    string,
    readonly FrontendPermission[]
  > = {
    owner:
      ALL_STOP_PERMISSIONS,

    admin:
      ALL_STOP_PERMISSIONS,

    transport_manager: [
      FRONTEND_PERMISSIONS.STOPS_READ,
      FRONTEND_PERMISSIONS.STOPS_CREATE,
      FRONTEND_PERMISSIONS.STOPS_UPDATE,
      FRONTEND_PERMISSIONS.STOPS_DEACTIVATE,
    ],

    dispatcher: [
      FRONTEND_PERMISSIONS.STOPS_READ,
      FRONTEND_PERMISSIONS.STOPS_CREATE,
    ],

    staff: [
      FRONTEND_PERMISSIONS.STOPS_READ,
    ],

    driver: [],

    guardian: [],
  };

export function hasFrontendPermission(
  role:
    | string
    | undefined,
  permission:
    FrontendPermission,
): boolean {
  if (!role) {
    return false;
  }

  return (
    ROLE_PERMISSIONS[
      role
    ] ?? []
  ).includes(
    permission,
  );
}
