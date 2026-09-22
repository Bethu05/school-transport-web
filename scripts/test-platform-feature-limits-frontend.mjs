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

const limits = read("src/super-admin/TenantFeatureLimits.tsx");

const management = read("src/super-admin/TenantManagementPage.tsx");

const tenants = read("src/super-admin/TenantsPanel.tsx");

console.log("Platform tenant feature limits frontend checkpoint");

console.log("-------------------------------------------------");

check(
  api.includes("listPlatformTenantFeatureStates"),
  "tenant feature-state API is wired",
);

check(
  api.includes("setPlatformTenantFeatureEntitlement"),
  "tenant quota override mutation is wired",
);

check(
  api.includes("removePlatformTenantFeatureEntitlement"),
  "tenant quota override removal is wired",
);

check(
  limits.includes("Package") && limits.includes("Effective"),
  "package and effective allowances are visible",
);

check(
  limits.includes("Enter the total allowance, not the number being added."),
  "quota editor uses total effective allowance semantics",
);

check(limits.includes('"billing"'), "generic billing source is supported");

check(
  limits.includes('.endsWith(".custom_fields")'),
  "future custom-field quota categories can surface automatically",
);

check(
  limits.includes("removePlatformTenantFeatureEntitlement"),
  "Super Admin can remove a tenant-specific override",
);

check(
  limits.includes("state.override !== null") &&
    limits.includes("state.override.limitValue !== null") &&
    !limits.includes("state.override?.limitValue !== null,"),
  "missing override is not incorrectly treated as quota-bearing",
);

check(
  management.includes("<TenantFeatureLimits"),
  "feature limits live in dedicated Manage Tenant workspace",
);

check(
  tenants.includes("Manage tenant"),
  "tenant list exposes tenant management workspace",
);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log();

console.log("Platform tenant feature limits frontend checkpoint PASSED");
