import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }

  console.log(`✓ ${message}`);
}

const permissions = read("src/auth/frontend-permissions.ts");

const api = read("src/operational-safety/operational-safety.api.ts");

const panel = read("src/operational-safety/OperationalSafetyPanel.tsx");

const realtime = read("src/tracking/tracking.realtime.ts");

const dashboard = read("src/dashboard/operations/OperationsDashboard.tsx");

assert(
  permissions.includes(
    'OPERATIONAL_SAFETY_EVENTS_READ: "operational_safety_events.read"',
  ),
  "frontend permission matches backend permission",
);

assert(
  api.includes("/operational-safety-events"),
  "dashboard bootstraps safety events from API",
);

assert(
  panel.includes("operational.route_deviation.confirmed"),
  "dashboard consumes confirmed deviation realtime event",
);

assert(
  panel.includes("operational.route_deviation.resolved"),
  "dashboard consumes resolved deviation realtime event",
);

assert(
  panel.includes("hasFrontendPermission") &&
    panel.includes("OPERATIONAL_SAFETY_EVENTS_READ"),
  "safety UI is permission gated",
);

assert(
  realtime.includes("RouteDeviationConfirmedOperationalEvent") &&
    realtime.includes("RouteDeviationResolvedOperationalEvent"),
  "realtime contracts include operational safety lifecycle",
);

assert(
  dashboard.includes("<OperationalSafetyPanel />"),
  "operations dashboard renders live safety panel",
);

assert(
  !dashboard.includes('title: "Route deviation detected"'),
  "old preview route-deviation card is removed",
);

console.log();
console.log("Operational safety dashboard checkpoint PASSED");

assert(
  dashboard.includes('getElementById("operational-safety")') &&
    dashboard.includes("scrollIntoView") &&
    panel.includes('id="operational-safety"'),
  "dashboard Alerts button links directly to operational safety feed",
);
