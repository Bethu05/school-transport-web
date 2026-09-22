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

const capacity = read("src/super-admin/TenantCapacityActions.tsx");

const management = read("src/super-admin/TenantManagementPage.tsx");

console.log("Tenant capacity frontend checkpoint");

console.log("-----------------------------------");

check(
  api.includes("getPlatformTenantCapacity") &&
    api.includes("/commercial/capacity"),
  "tenant capacity read API is wired",
);

check(
  api.includes("setPlatformTenantCapacity") && api.includes('method: "PUT"'),
  "tenant capacity mutation API is wired",
);

check(
  capacity.includes('label="Schools"') &&
    capacity.includes('label="Students"') &&
    capacity.includes('label="Buses / vehicles"') &&
    capacity.includes('label="Drivers"'),
  "all four tenant-wide capacity controls are visible",
);

check(
  capacity.includes("Current usage is above the contracted allowance."),
  "over-limit state is visible without deleting data",
);

check(
  capacity.includes("Save capacity"),
  "Platform Admin can amend sold capacity",
);

check(
  management.includes("<TenantCapacityActions"),
  "capacity editor lives in dedicated Manage Tenant workspace",
);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log();

console.log("Tenant capacity frontend checkpoint PASSED");
