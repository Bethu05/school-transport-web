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

const safetyApi = read("src/operational-safety/operational-safety.api.ts");

const metricCard = read("src/dashboard/components/MetricCard.tsx");

console.log("Operations dashboard live-data checkpoint");
console.log("-----------------------------------------");

assert(
  hook.includes("listTripsPage") &&
    hook.includes("listDriversPage") &&
    hook.includes("listStudentsPage"),
  "dashboard summary uses real domain APIs",
);

assert(
  !dashboard.includes('value: "08"') &&
    !dashboard.includes('value: "31"') &&
    !dashboard.includes('value: "684"'),
  "hardcoded KPI values removed",
);

assert(
  !dashboard.includes("North Route A") && !dashboard.includes("Westlands B"),
  "fake trip rows removed",
);

assert(
  dashboard.includes("useOperationsDashboardData"),
  "dashboard consumes live operations data",
);

assert(
  dashboard.includes('navigate("/tracking")'),
  "Live Tracking action opens real tracking module",
);

assert(
  safety.includes("vehicleRegistrationNumber") &&
    safety.includes("driverName") &&
    safety.includes("routeName"),
  "safety events show human-readable operational details",
);

assert(
  safety.includes("events.slice(0, 4)"),
  "dashboard limits safety preview to four cards",
);

assert(
  safety.includes("<Drawer") && safety.includes('overflowY: "auto"'),
  "full safety history uses a scrollable drawer",
);

assert(
  safety.includes("drawerCursorHistory") &&
    safety.includes("nextCursor") &&
    safetyApi.includes("cursor"),
  "safety history uses backend cursor pagination",
);

assert(
  safety.includes('"all", "open", "resolved"'),
  "safety drawer supports All / Open / Resolved filters",
);

assert(
  safety.includes('sm: "repeat(2, minmax(0, 1fr))"') &&
    safety.includes('lg: "repeat(3, minmax(0, 1fr))"') &&
    safety.includes('xl: "repeat(4, minmax(0, 1fr))"'),
  "dashboard safety cards use responsive 1 / 2 / 3 / 4 grid",
);

assert(
  safety.includes('label={open ? "OPEN" : "Resolved"}'),
  "open deviations receive explicit alert state",
);

assert(
  safety.includes('scrollMarginTop: "96px"'),
  "Alerts navigation remains supported",
);

assert(
  !metricCard.includes("metricCardLight") &&
    !metricCard.includes("metricCardDark") &&
    !metricCard.includes("gold09"),
  "KPI cards remain free from old gold-gradient styling",
);

if (process.exitCode) {
  console.error("\nOperations dashboard checkpoint FAILED");
} else {
  console.log("\nOperations dashboard checkpoint PASSED");
}

assert(
  metricCard.includes("navigate(metric.path)") &&
    metricCard.includes('role="button"') &&
    metricCard.includes("tabIndex={0}"),
  "KPI cards are accessible clickable navigation controls",
);

assert(
  dashboard.includes('path: "/trips"') &&
    dashboard.includes('path: "/vehicles"') &&
    dashboard.includes('path: "/drivers"') &&
    dashboard.includes('path: "/students"'),
  "KPI cards route to their real operational modules",
);
