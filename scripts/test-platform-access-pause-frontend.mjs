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

const actions = read("src/super-admin/TenantCommercialActions.tsx");

const tenants = read("src/super-admin/TenantsPanel.tsx");

console.log("Platform access pause frontend checkpoint");

console.log("-----------------------------------------");

check(
  api.includes("pausePlatformTenantAccess"),
  "Platform Admin pause API exists",
);

check(api.includes("/commercial/pause"), "pause endpoint is wired");

check(api.includes('"cancelled"'), "paused subscription status is typed");

check(actions.includes("Pause access"), "Pause Access control exists");

check(
  actions.includes("Users can still sign in"),
  "pause confirmation explains login behaviour",
);

check(
  actions.includes("Reactivate access"),
  "paused tenant can be reactivated",
);

check(
  actions.includes("tenant.subscriptionEffective"),
  "pause button requires effective access",
);

check(
  tenants.includes('return "Paused"'),
  "tenant list visibly labels paused access",
);

if (process.exitCode) {
  console.error();

  console.error("Platform access pause frontend checkpoint FAILED");

  process.exit(process.exitCode);
}

console.log();

console.log("Platform access pause frontend checkpoint PASSED");
