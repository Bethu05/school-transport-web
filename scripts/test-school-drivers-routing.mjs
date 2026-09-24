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
const page = read("src/drivers/DriversPage.tsx");
const form = read("src/drivers/DriverFormDialog.tsx");
const api = read("src/drivers/drivers.api.ts");

console.log("School-scoped Drivers routing checkpoint");
console.log("----------------------------------------");

check(
  app.includes('path="/school/:tenantSlug/:schoolSlug/drivers"'),
  "canonical school-scoped Drivers route exists",
);

check(
  app.includes('<Navigate to="/drivers" replace />'),
  "unknown Drivers school URL returns to compatibility entry",
);

check(
  app.includes("<DriversPage key={routeSchool.id} />"),
  "Drivers screen remounts when school changes",
);

check(
  shell.includes('item.path === "/drivers"') && shell.includes('"drivers"'),
  "Drivers navigation uses canonical school path",
);

check(
  shell.includes('location.pathname === "/drivers"'),
  "school selector supports Drivers compatibility entry",
);

check(
  page.includes("const schoolId = activeSchool?.id"),
  "Drivers derives school from verified activeSchool",
);

check(
  page.includes("schoolId,") && page.includes("includeShared: true"),
  "Driver register requests current school plus Shared drivers",
);

check(
  page.includes('"drivers-summary", tenantId, schoolId'),
  "Driver summaries are school-context keyed",
);

check(
  page.includes("schoolId: input.schoolId ? schoolId : undefined"),
  "Driver creation cannot inject another school ID",
);

check(
  form.includes('assignment: "school"'),
  "new Driver defaults to current school",
);

check(
  form.includes('<MenuItem value="shared">Shared across tenant</MenuItem>'),
  "Shared Driver creation remains explicit",
);

check(
  form.includes("Driver assignment is preserved while editing."),
  "editing preserves existing Driver assignment",
);

check(
  api.includes("schoolId?: string") &&
    api.includes("includeShared?: boolean") &&
    api.includes('parameters.set("includeShared"'),
  "Drivers API forwards school and shared-resource filters",
);

console.log();
console.log("School-scoped Drivers routing checkpoint PASSED");
