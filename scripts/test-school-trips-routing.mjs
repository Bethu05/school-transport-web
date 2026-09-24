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
const page = read("src/trips/TripsPage.tsx");
const tripsApi = read("src/trips/trips.api.ts");
const routesApi = read("src/routes/routes.api.ts");
const driversApi = read("src/drivers/drivers.api.ts");
const vehiclesApi = read("src/vehicles/vehicles.api.ts");

console.log("School-scoped Trips routing checkpoint");
console.log("--------------------------------------");

check(
  app.includes('path="/school/:tenantSlug/:schoolSlug/trips"'),
  "canonical school-scoped Trips route exists",
);

check(
  app.includes('<Navigate to="/trips" replace />'),
  "unknown Trips school URL returns to controlled compatibility entry",
);

check(
  app.includes("<TripsPage key={routeSchool.id} />"),
  "Trips screen remounts when school context changes",
);

check(
  shell.includes('item.path === "/trips"') && shell.includes('"trips"'),
  "Trips navigation resolves to canonical school URL",
);

check(
  shell.includes('location.pathname === "/trips"'),
  "school selector supports the Trips compatibility entry",
);

check(
  page.includes("const schoolId = activeSchool?.id"),
  "TripsPage derives school from verified activeSchool",
);

check(
  page.includes("return listTrips(tenantId, {") && page.includes("schoolId,"),
  "Trip list is school filtered",
);

check(
  page.includes("return listRoutes(tenantId, {") && page.includes("schoolId,"),
  "Trip scheduling Routes are school filtered",
);

check(
  page.includes("return listDrivers(tenantId, {") &&
    page.includes("includeShared: true"),
  "Trip scheduling Drivers include current-school and shared resources",
);

check(
  page.includes("return listVehicles(tenantId, {") &&
    page.includes("includeShared: true"),
  "Trip scheduling Vehicles include current-school and shared resources",
);

check(
  tripsApi.includes("query: Omit<ListTripsQuery") &&
    tripsApi.includes("...query"),
  "Trips compatibility API forwards school filters",
);

check(
  routesApi.includes("schoolId?: string") &&
    routesApi.includes('parameters.set("schoolId", query.schoolId)'),
  "Routes frontend API exposes backend school filter",
);

check(
  driversApi.includes("includeShared?: boolean") &&
    driversApi.includes('parameters.set("includeShared"'),
  "Drivers frontend API exposes explicit shared-resource filter",
);

check(
  vehiclesApi.includes("includeShared?: boolean") &&
    vehiclesApi.includes('parameters.set("includeShared"'),
  "Vehicles frontend API exposes explicit shared-resource filter",
);

console.log();
console.log("School-scoped Trips routing checkpoint PASSED");
