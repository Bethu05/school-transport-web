import { readFileSync } from "node:fs";

const access = readFileSync("src/super-admin/TenantFeatureAccess.tsx", "utf8");

const management = readFileSync(
  "src/super-admin/TenantManagementPage.tsx",
  "utf8",
);

const api = readFileSync("src/super-admin/platform.api.ts", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

console.log("");
console.log("Super Admin Live Fleet Map entitlement checkpoint");
console.log("-----------------------------------------------");

check(
  access.includes(`LIVE_FLEET_MAP_KEY = "control_room.live_map"`),
  "stable Live Fleet Map feature key is used",
);

check(
  access.includes("listPlatformTenantFeatureStates"),
  "tenant feature state is loaded from the platform API",
);

check(
  access.includes("state.effectiveEnabled") &&
    access.includes("packageModeLabel(state)") &&
    access.includes("effectiveSourceLabel(state)"),
  "package, effective access and source are visible",
);

check(
  access.includes("saveMutation.mutate(true)") &&
    access.includes("saveMutation.mutate(false)"),
  "Super Admin can explicitly enable or disable the customer override",
);

check(
  access.includes("Commercial reason") &&
    access.includes("commercialReason.length < 3"),
  "commercial reason is mandatory",
);

check(
  access.includes("removePlatformTenantFeatureEntitlement") &&
    access.includes("Return to package setting"),
  "customer override can be removed to restore package behaviour",
);

check(
  api.includes("setPlatformTenantFeatureEntitlement") &&
    api.includes("removePlatformTenantFeatureEntitlement"),
  "existing server-authoritative entitlement API is reused",
);

check(
  management.includes("<TenantFeatureAccess tenant={tenant} />") &&
    management.includes("<TenantFeatureLimits tenant={tenant} />"),
  "feature access and numeric limits coexist in Manage Tenant",
);

check(
  !access.includes("LiveTrackingMap") &&
    !management.includes("LiveTrackingMap"),
  "Super Admin receives commercial control but no operational map access",
);

console.log("");
console.log("Super Admin Live Fleet Map entitlement checkpoint PASSED");
