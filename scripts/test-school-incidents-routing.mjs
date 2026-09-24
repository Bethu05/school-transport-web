import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function check(condition, description) {
  if (!condition) {
    throw new Error(`FAIL: ${description}`);
  }

  console.log(`✓ ${description}`);
}

const app = read("src/App.tsx");
const shell = read("src/app/AppShell.tsx");
const page = read("src/incidents/IncidentsPage.tsx");
const api = read("src/incidents/incidents.api.ts");

console.log("School-scoped Incidents routing checkpoint");
console.log("------------------------------------------");

check(
  app.includes('path="/school/:tenantSlug/:schoolSlug/incidents"'),
  "canonical school-scoped Incidents route exists",
);

check(
  app.includes('<Navigate to="/incidents" replace />'),
  "unknown Incidents school URL returns to compatibility entry",
);

check(
  app.includes("<IncidentsPage key={routeSchool.id} />"),
  "Incidents screen remounts when school changes",
);

check(
  shell.includes('item.path === "/incidents"') && shell.includes('"incidents"'),
  "Incidents navigation uses canonical school path",
);

check(
  shell.includes('location.pathname === "/incidents"'),
  "school selector supports Incidents compatibility route",
);

check(
  page.includes("const schoolId = activeSchool?.id"),
  "Incidents derives school from verified activeSchool",
);

check(
  page.includes('"incidents",') &&
    page.includes("schoolId,") &&
    page.includes("listIncidents(tenantId"),
  "incident register query is school filtered",
);

check(
  page.includes("...input") &&
    page.includes("schoolId,") &&
    page.includes("crypto.randomUUID()"),
  "new incident is forced to current school while retaining idempotency",
);

check(
  page.includes("FRONTEND_PERMISSIONS.INCIDENTS_READ") &&
    page.includes("FRONTEND_PERMISSIONS.INCIDENTS_CREATE"),
  "read and create permissions remain distinct",
);

check(
  page.includes("if (!canRead)") || page.includes("!canRead ?"),
  "create-only incident reporter experience remains present",
);

check(
  api.includes("schoolId?: string") &&
    api.includes('params.set("schoolId", query.schoolId)'),
  "Incidents API already forwards school filter",
);

console.log();
console.log("School-scoped Incidents routing checkpoint PASSED");
