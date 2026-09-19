import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`✓ ${message}`);
}

const dashboard = read("src/dashboard/operations/OperationsDashboard.tsx");

const hook = read("src/dashboard/operations/useOperationsDashboardData.ts");

const safety = read("src/operational-safety/OperationalSafetyPanel.tsx");

const metricCard = read("src/dashboard/components/MetricCard.tsx");

console.log("Operations dashboard live-data checkpoint");
console.log("-----------------------------------------");

assert(
  hook.includes("listTripsPage") &&
    hook.includes("listDriversPage") &&
    hook.includes("listStudentsPage"),
  "dashboard summary uses real trips, drivers and students APIs",
);

assert(
  !dashboard.includes('value: "08"') &&
    !dashboard.includes('value: "31"') &&
    !dashboard.includes('value: "684"'),
  "hardcoded dashboard KPI values removed",
);

assert(
  !dashboard.includes("North Route A") &&
    !dashboard.includes("Westlands B") &&
    !dashboard.includes("South Route C") &&
    !dashboard.includes("East Route D"),
  "fake trip rows removed",
);

assert(
  dashboard.includes("useOperationsDashboardData"),
  "operations dashboard consumes live summary hook",
);

assert(
  dashboard.includes('navigate("/tracking")'),
  "Live Tracking action opens the real tracking module",
);

assert(
  dashboard.includes("<OperationalSafetyPanel"),
  "Operational Safety remains part of the operations dashboard",
);

assert(
  safety.includes("Immediate attention required") &&
    safety.includes("All clear"),
  "Operational Safety has clear active and normal visual states",
);
assert(
  safety.includes("getTrip") &&
    safety.includes("vehicleRegistrationNumber") &&
    safety.includes("driverName") &&
    safety.includes("routeName") &&
    safety.includes("tripStatusLabel"),
  "Operational Safety resolves human-readable trip, vehicle and driver details",
);

assert(
  safety.includes("borderLeftColor: open") &&
    safety.includes("label={`${openCount} open`}"),
  "open safety alerts receive explicit visual treatment",
);

assert(
  safety.includes('scrollMarginTop: "96px"'),
  "safety panel supports dashboard Alerts navigation",
);

assert(
  !metricCard.includes("metricCardLight") &&
    !metricCard.includes("metricCardDark") &&
    !metricCard.includes("gold09"),
  "dashboard KPI cards no longer use gold gradient styling",
);

if (process.exitCode) {
  console.error("\nOperations dashboard checkpoint FAILED");
} else {
  console.log("\nOperations dashboard checkpoint PASSED");
}
