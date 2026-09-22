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

const tenants = read("src/super-admin/TenantsPanel.tsx");

const management = read("src/super-admin/TenantManagementPage.tsx");

const page = read("src/super-admin/SuperAdminPage.tsx");

console.log("Super Admin tenant management workspace checkpoint");

console.log("--------------------------------------------------");

check(
  tenants.includes("Manage tenant"),
  "each tenant exposes an explicit Manage tenant action",
);

check(
  !tenants.includes("expandedTenantId"),
  "tenant settings are no longer embedded in expandable table rows",
);

check(
  page.includes("<TenantManagementPage"),
  "Super Admin renders a dedicated tenant management workspace",
);

check(
  management.includes("Back to schools"),
  "dedicated workspace provides clear return navigation",
);

check(
  management.includes("Subscription & access") &&
    management.includes("Capacity") &&
    management.includes("Features") &&
    management.includes("Administrator access"),
  "tenant management areas are grouped clearly",
);

check(
  management.includes("<TenantCommercialActions"),
  "subscription and access controls live in Manage Tenant",
);

check(
  management.includes("<TenantFeatureLimits"),
  "feature configuration lives in Manage Tenant",
);

check(
  management.includes("<TenantAdminRecoveryActions"),
  "administrator recovery lives in Manage Tenant",
);

check(
  page.includes("School overview"),
  "right sidebar remains a lightweight school summary",
);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log();

console.log("Super Admin tenant management workspace checkpoint PASSED");
