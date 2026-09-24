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
const page = read("src/vehicles/VehiclesPage.tsx");
const form = read("src/vehicles/VehicleFormDialog.tsx");
const api = read("src/vehicles/vehicles.api.ts");

console.log("School-scoped Vehicles routing checkpoint");
console.log("-----------------------------------------");

check(
  app.includes('path="/school/:tenantSlug/:schoolSlug/vehicles"'),
  "canonical school-scoped Vehicles route exists",
);

check(
  app.includes('<Navigate to="/vehicles" replace />'),
  "unknown Vehicles school URL returns to compatibility entry",
);

check(
  app.includes("<VehiclesPage key={routeSchool.id} />"),
  "Vehicles screen remounts when school changes",
);

check(
  shell.includes('item.path === "/vehicles"') && shell.includes('"vehicles"'),
  "Vehicles navigation uses canonical school path",
);

check(
  shell.includes('location.pathname === "/vehicles"'),
  "school selector supports Vehicles compatibility entry",
);

check(
  page.includes("const schoolId = activeSchool?.id"),
  "Vehicles derives school from verified activeSchool",
);

check(
  page.includes("schoolId,") && page.includes("includeShared: true"),
  "Vehicle register requests current school plus Shared vehicles",
);

check(
  page.includes("schoolId: input.schoolId ? schoolId : undefined"),
  "Vehicle creation cannot inject another school ID",
);

check(
  form.includes('assignment: "school"'),
  "new Vehicle defaults to current school",
);

check(
  form.includes('<MenuItem value="shared">Shared across tenant</MenuItem>'),
  "Shared Vehicle creation remains explicit",
);

check(
  form.includes("Vehicle assignment is preserved while editing."),
  "editing preserves existing Vehicle assignment",
);

check(
  api.includes("schoolId?: string") &&
    api.includes("includeShared?: boolean") &&
    api.includes('parameters.set("includeShared"'),
  "Vehicles API forwards school and shared-resource filters",
);

console.log();
console.log("School-scoped Vehicles routing checkpoint PASSED");
