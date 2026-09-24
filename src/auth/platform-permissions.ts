export const FRONTEND_PLATFORM_PERMISSIONS = {
  SCHOOL_SETUP_CREATE: "platform.school_setup.create",
  SCHOOL_SETUP_READ_OWN: "platform.school_setup.read_own",
  SCHOOL_SETUP_READ_ALL: "platform.school_setup.read_all",
  SCHOOL_SETUP_UPDATE_OWN: "platform.school_setup.update_own",
  SCHOOL_SETUP_SUBMIT: "platform.school_setup.submit",
  SCHOOL_SETUP_REVIEW: "platform.school_setup.review",
  SCHOOL_SETUP_APPROVE: "platform.school_setup.approve",
  SCHOOL_SETUP_REJECT: "platform.school_setup.reject",

  ONBOARDING_READ_ASSIGNED: "platform.onboarding.read_assigned",
  ONBOARDING_UPDATE_ASSIGNED: "platform.onboarding.update_assigned",
  ONBOARDING_READ_ALL: "platform.onboarding.read_all",
  ONBOARDING_MANAGE: "platform.onboarding.manage",
  ONBOARDING_APPROVE: "platform.onboarding.approve",
  ONBOARDING_CONFIGURE_COMMERCIAL: "platform.onboarding.configure_commercial",
  ONBOARDING_PROVISION_ADMIN: "platform.onboarding.provision_admin",

  FINANCE_READ: "platform.finance.read",
  FINANCE_REVIEW: "platform.finance.review",
  FINANCE_APPROVE: "platform.finance.approve",

  SCHOOL_READ_ASSIGNED: "platform.school.read_assigned",
  SCHOOL_READ_ALL: "platform.school.read_all",
  SCHOOL_ACTIVATE: "platform.school.activate",
  SCHOOL_PAUSE: "platform.school.pause",
  SCHOOL_RESUME: "platform.school.resume",

  AUDIT_READ: "platform.audit.read",

  USERS_MANAGE: "platform.users.manage",
  ROLES_MANAGE: "platform.roles.manage",

  DEVICES_READ: "platform.devices.read",
  DEVICES_PROVISION: "platform.devices.provision",
  DEVICES_DIAGNOSTICS: "platform.devices.diagnostics",
  DEVICES_CONFIGURE: "platform.devices.configure",
  DEVICES_ROTATE_CREDENTIALS: "platform.devices.rotate_credentials",
} as const;

export type FrontendPlatformPermission =
  (typeof FRONTEND_PLATFORM_PERMISSIONS)[keyof typeof FRONTEND_PLATFORM_PERMISSIONS];

export function hasFrontendPlatformPermission(
  permissions: readonly string[],
  permission: FrontendPlatformPermission,
): boolean {
  return permissions.includes(permission);
}
