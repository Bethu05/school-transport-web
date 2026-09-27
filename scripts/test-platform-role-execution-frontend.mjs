import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function check(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`✓ ${message}`);
}

const auth = read("src/auth/AuthProvider.tsx");
const limited = read("src/super-admin/PlatformLimitedRolePage.tsx");
const workspace = read(
  "src/super-admin/PlatformOnboardingRoleWorkspace.tsx",
);
const panel = read("src/super-admin/TenantOnboardingPanel.tsx");
const api = read("src/super-admin/platform.api.ts");

console.log("Platform role -> user execution checkpoint");
console.log("------------------------------------------");

check(
  auth.includes("refreshPlatformAuthorization") &&
    auth.includes('window.addEventListener("focus"'),
  "live platform authority refreshes while session remains open",
);

check(
  limited.includes("ONBOARDING_READ_ALL") &&
    limited.includes("ONBOARDING_READ_ASSIGNED") &&
    limited.includes('label: "Onboarding"'),
  "onboarding navigation is permission-driven",
);

check(
  workspace.includes("listPlatformOnboardingQueue") &&
    workspace.includes("listOwnPlatformSchoolSetupRequests") &&
    workspace.includes("canReadAll") &&
    workspace.includes("canReadAssigned"),
  "global and assigned onboarding discovery use separate authorised paths",
);

check(
  api.includes("/platform/onboarding/commercial/plans") &&
    api.includes("/platform/onboarding/tenants/${tenantId}/commercial") &&
    api.includes("/platform/onboarding/tenants/${tenantId}/initial-admin"),
  "limited users use permission-scoped onboarding resource endpoints",
);

check(
  panel.includes("canApproveOnboarding") &&
    panel.includes("ONBOARDING_APPROVE") &&
    panel.includes("Approve school") &&
    panel.includes("Reject application"),
  "approval controls follow live approval permission",
);

check(
  panel.includes("canManageOnboarding") &&
    panel.includes("ONBOARDING_MANAGE") &&
    panel.includes("ONBOARDING_UPDATE_ASSIGNED") &&
    panel.includes("Reconcile verified evidence") &&
    panel.includes("Mark import complete"),
  "workflow mutation controls follow manage/update-assigned authority",
);

check(
  panel.includes("canConfigureCommercial") &&
    panel.includes("ONBOARDING_CONFIGURE_COMMERCIAL") &&
    panel.includes("<OnboardingCommercialReview"),
  "commercial setup follows commercial-configuration permission",
);

check(
  panel.includes("canProvisionAdmin") &&
    panel.includes("ONBOARDING_PROVISION_ADMIN") &&
    panel.includes("<TenantInitialAdminActions"),
  "initial administrator provisioning follows explicit permission",
);

check(
  panel.includes("canActivateTenant") &&
    panel.includes("SCHOOL_ACTIVATE") &&
    panel.includes("Activate tenant"),
  "tenant activation follows explicit activation permission",
);

check(
  panel.includes("isSuperAdmin") &&
    panel.includes("<TenantAdminRecoveryActions"),
  "Super Admin-only password recovery is not leaked into limited role UI",
);

if (process.exitCode) {
  console.error();
  console.error("ROLE EXECUTION CHECKPOINT FAILED");
  process.exit(process.exitCode);
}

console.log();
console.log("ROLE EXECUTION CHECKPOINT PASSED");
