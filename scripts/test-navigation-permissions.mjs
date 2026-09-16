import { readFileSync } from "node:fs";

const shell = readFileSync("src/app/AppShell.tsx", "utf8");

const permissions = readFileSync("src/auth/frontend-permissions.ts", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

const expectedPermissions = [
  "drivers.read",
  "vehicles.read",
  "routes.read",
  "trips.read",
  "stops.read",
  "students.read",
  "guardians.read",
  "incidents.read",
  "incidents.create",
];

for (const permission of expectedPermissions) {
  assert(
    permissions.includes(`'${permission}'`),
    `frontend permission constant: ${permission}`,
  );
}

assert(
  shell.includes("permissions,"),
  "AppShell consumes backend permissions[]",
);

assert(
  shell.includes("hasFrontendPermission("),
  "navigation checks effective permissions",
);

const operationalRules = [
  ["label: 'Trips'", "FRONTEND_PERMISSIONS.TRIPS_READ"],
  ["label: 'Routes'", "FRONTEND_PERMISSIONS.ROUTES_READ"],
  ["label: 'Stops'", "FRONTEND_PERMISSIONS.STOPS_READ"],
  ["label: 'Vehicles'", "FRONTEND_PERMISSIONS.VEHICLES_READ"],
  ["label: 'Drivers'", "FRONTEND_PERMISSIONS.DRIVERS_READ"],
  ["label: 'Students'", "FRONTEND_PERMISSIONS.STUDENTS_READ"],
  ["label: 'Guardians'", "FRONTEND_PERMISSIONS.GUARDIANS_READ"],
];

for (const [label, permission] of operationalRules) {
  const start = shell.indexOf(label);

  assert(start >= 0, `navigation item exists: ${label}`);

  const next = shell.indexOf("\n  {", start + 1);

  const block = shell.slice(start, next >= 0 ? next : shell.length);

  assert(block.includes(permission), `${label} uses backend read permission`);

  assert(!block.includes("roles:"), `${label} no longer hard-codes roles`);
}

const incidentStart = shell.indexOf("label: 'Incidents'");

const incidentEnd = shell.indexOf("\n  {", incidentStart + 1);

const incidentBlock = shell.slice(incidentStart, incidentEnd);

assert(
  incidentBlock.includes("FRONTEND_PERMISSIONS.INCIDENTS_READ"),
  "Incidents supports read permission",
);

assert(
  incidentBlock.includes("FRONTEND_PERMISSIONS.INCIDENTS_CREATE"),
  "Incidents supports report-only users",
);

assert(
  shell.includes("label: 'Dashboard'") &&
    shell.includes("label: 'Live Tracking'"),
  "special Dashboard/Tracking navigation preserved",
);

console.log("");
console.log("Navigation permissions checkpoint PASSED");
