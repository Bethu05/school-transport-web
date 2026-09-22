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

const api = read("src/super-admin/platform.api.ts");

const recovery = read("src/super-admin/TenantAdminRecoveryActions.tsx");

const management = read("src/super-admin/TenantManagementPage.tsx");

console.log("Platform admin password recovery frontend checkpoint");

console.log("----------------------------------------------------");

check(
  api.includes("resetPlatformTenantAdminPassword") &&
    api.includes("/password/reset"),
  "Platform Admin password-reset API is wired",
);

check(
  recovery.includes("Reset admin password"),
  "administrator recovery action is visible",
);

check(
  recovery.includes("Minimum 12 characters"),
  "temporary password policy is communicated",
);

check(
  /signs\s+out\s+existing\s+refresh\s+sessions/.test(recovery),
  "operator is warned that existing sessions are revoked",
);

check(
  recovery.includes("forced to choose a new password") ||
    recovery.includes("must change the temporary password"),
  "forced-password-change behaviour is explained",
);

check(
  management.includes("<TenantAdminRecoveryActions"),
  "recovery control lives in dedicated Manage Tenant workspace",
);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log();

console.log("Platform admin password recovery frontend checkpoint PASSED");
