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
const page = read("src/routes/RoutesPage.tsx");
const api = read("src/routes/routes.api.ts");
const routeStops = read("src/routes/RouteStopsDialog.tsx");
const stopsApi = read("src/stops/stops.api.ts");

console.log("School-scoped Routes routing checkpoint");
console.log("---------------------------------------");

check(
  app.includes('path="/school/:tenantSlug/:schoolSlug/routes"'),
  "canonical school-scoped Routes route exists",
);

check(
  app.includes('<Navigate to="/routes" replace />'),
  "unknown Routes school URL returns to compatibility entry",
);

check(
  app.includes("<RoutesPage key={routeSchool.id} />"),
  "Routes screen remounts when school changes",
);

check(
  shell.includes('item.path === "/routes"') && shell.includes('"routes"'),
  "Routes navigation uses canonical school path",
);

check(
  shell.includes('location.pathname === "/routes"'),
  "school selector supports Routes compatibility entry",
);

check(
  page.includes("const schoolId = activeSchool?.id"),
  "Routes derives school from verified activeSchool",
);

check(
  page.includes('"routes-summary", tenantId, schoolId'),
  "Route summaries are keyed by school context",
);

check(
  page.includes("listRoutesPage(tenantId") && page.includes("schoolId,"),
  "Route register and summaries use backend school filtering",
);

check(
  page.includes("...input") &&
    page.includes("schoolId,") &&
    page.includes("createRoute(tenantId"),
  "new Routes are forced to the current school",
);

check(
  page.includes("const schools: School[] = activeSchool ? [activeSchool] : []"),
  "Route form receives only the current authorised school",
);

check(
  api.includes("schoolId?: string") &&
    api.includes('parameters.set("schoolId", query.schoolId)'),
  "Routes API forwards exact school filter",
);

check(
  routeStops.includes("schoolId: route.schoolId") &&
    routeStops.includes("includeShared: true") &&
    routeStops.includes('status: "active"'),
  "Route stop selector requests school plus shared active Stops",
);

check(
  stopsApi.includes('query: Omit<ListStopsQuery, "page" | "limit"> = {}') &&
    stopsApi.includes("...query"),
  "Stop compatibility helper supports scoped queries",
);

console.log();
console.log("School-scoped Routes routing checkpoint PASSED");
