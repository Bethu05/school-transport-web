import { readFileSync } from "node:fs";

const permissions = readFileSync("src/auth/frontend-permissions.ts", "utf8");

const shell = readFileSync("src/app/AppShell.tsx", "utf8");

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

console.log();
console.log("Control Room frontend access checkpoint");
console.log("---------------------------------------");

check(
  permissions.includes('CONTROL_ROOM_READ: "control_room.read"'),
  "control_room.read is represented in frontend permissions",
);

check(
  permissions.includes(
    'GUARDIANS_READ_OWN_ACTIVE_TRIP: "guardians.read_own_active_trip"',
  ),
  "Guardian active-trip permission is represented in frontend permissions",
);

const trackingNavStart = shell.indexOf('label: "Live Tracking"');

const trackingNavEnd = shell.indexOf(
  'label: "Recurring Trips"',
  trackingNavStart,
);

const trackingNavigation = shell.slice(trackingNavStart, trackingNavEnd);

check(
  trackingNavigation.includes("anyPermissions"),
  "Live Tracking navigation uses permission-based visibility",
);

check(
  trackingNavigation.includes("FRONTEND_PERMISSIONS.CONTROL_ROOM_READ"),
  "Control Room permission exposes operational tracking navigation",
);

check(
  trackingNavigation.includes(
    "FRONTEND_PERMISSIONS.GUARDIANS_READ_OWN_ACTIVE_TRIP",
  ),
  "Guardian relationship permission exposes Guardian tracking navigation",
);

check(
  !trackingNavigation.includes("roles: ALL_ROLES"),
  "Live Tracking is no longer granted to every tenant role",
);

check(
  page.includes("const canUseControlRoom =") &&
    page.includes("FRONTEND_PERMISSIONS.CONTROL_ROOM_READ"),
  "TrackingPage uses dedicated Control Room permission",
);

check(
  page.includes("const canUseGuardianTracking =") &&
    page.includes("FRONTEND_PERMISSIONS.GUARDIANS_READ_OWN_ACTIVE_TRIP"),
  "TrackingPage uses Guardian relationship permission",
);

check(
  page.includes("if (!tenantId || !canUseControlRoom)"),
  "tenant-wide realtime connection requires Control Room permission",
);

check(
  page.includes(
    "if (liveFleetMapEnabled) {\n        void hydrateLatestLocations();",
  ),
  "raw GPS HTTP snapshot requires Live Fleet Map entitlement",
);

check(
  page.includes(
    "if (canUseGuardianTracking) {\n      return <GuardianTrackingPanel",
  ),
  "Guardian UI is only entered through Guardian tracking permission",
);

check(
  page.includes("You do not have permission to access Live Tracking."),
  "unauthorised Staff or Driver does not fall into Guardian tracking",
);

check(
  !page.includes("if (!canReadFleet) {\n    if (!tenantId)"),
  "lack of vehicle-read permission no longer implies Guardian identity",
);

console.log();
console.log("Control Room frontend access checkpoint PASSED");
