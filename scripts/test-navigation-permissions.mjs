import { readFileSync } from "node:fs";

const shell = readFileSync("src/app/AppShell.tsx", "utf8");

const permissions = readFileSync("src/auth/frontend-permissions.ts", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

/*
 * Static checkpoints must validate semantics rather than
 * Prettier formatting.
 *
 * Both of these are equivalent TypeScript:
 *
 *   "drivers.read"
 *   'drivers.read'
 */
function includesQuotedValue(source, value) {
  return source.includes(`"${value}"`) || source.includes(`'${value}'`);
}

function findNavigationLabel(source, label) {
  const candidates = [`label: "${label}"`, `label: '${label}'`];

  const positions = candidates
    .map((candidate) => source.indexOf(candidate))
    .filter((position) => position >= 0);

  if (positions.length === 0) {
    return -1;
  }

  return Math.min(...positions);
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
    includesQuotedValue(permissions, permission),
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
  ["Trips", "FRONTEND_PERMISSIONS.TRIPS_READ"],
  ["Routes", "FRONTEND_PERMISSIONS.ROUTES_READ"],
  ["Stops", "FRONTEND_PERMISSIONS.STOPS_READ"],
  ["Vehicles", "FRONTEND_PERMISSIONS.VEHICLES_READ"],
  ["Drivers", "FRONTEND_PERMISSIONS.DRIVERS_READ"],
  ["Students", "FRONTEND_PERMISSIONS.STUDENTS_READ"],
  ["Guardians", "FRONTEND_PERMISSIONS.GUARDIANS_READ"],
];

for (const [label, permission] of operationalRules) {
  const start = findNavigationLabel(shell, label);

  assert(start >= 0, `navigation item exists: ${label}`);

  const next = shell.indexOf("\n  {", start + 1);

  const block = shell.slice(start, next >= 0 ? next : shell.length);

  assert(block.includes(permission), `${label} uses backend read permission`);

  assert(!block.includes("roles:"), `${label} no longer hard-codes roles`);
}

const incidentStart = findNavigationLabel(shell, "Incidents");

assert(incidentStart >= 0, "navigation item exists: Incidents");

const incidentEnd = shell.indexOf("\n  {", incidentStart + 1);

const incidentBlock = shell.slice(
  incidentStart,
  incidentEnd >= 0 ? incidentEnd : shell.length,
);

assert(
  incidentBlock.includes("FRONTEND_PERMISSIONS.INCIDENTS_READ"),
  "Incidents supports read permission",
);

assert(
  incidentBlock.includes("FRONTEND_PERMISSIONS.INCIDENTS_CREATE"),
  "Incidents supports report-only users",
);

assert(
  findNavigationLabel(shell, "Dashboard") >= 0 &&
    findNavigationLabel(shell, "Live Tracking") >= 0,
  "special Dashboard/Tracking navigation preserved",
);

console.log("");
console.log("Navigation permissions checkpoint PASSED");
