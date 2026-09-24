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
const page = read("src/stops/StopsPage.tsx");
const api = read("src/stops/stops.api.ts");
const form = read("src/stops/StopFormDialog.tsx");

console.log("School-scoped Stops routing checkpoint");
console.log("--------------------------------------");

check(
  app.includes('path="/school/:tenantSlug/:schoolSlug/stops"'),
  "canonical school-scoped Stops route exists",
);

check(
  app.includes('<Navigate to="/stops" replace />'),
  "unknown Stops school URL returns to compatibility entry",
);

check(
  app.includes("<StopsPage key={routeSchool.id} />"),
  "Stops screen remounts on school change",
);

check(
  shell.includes('item.path === "/stops"') && shell.includes('"stops"'),
  "Stops navigation uses canonical school path",
);

check(
  page.includes("const schoolId = activeSchool?.id"),
  "Stops derives school from verified activeSchool",
);

check(
  page.includes("includeShared: true"),
  "Stops list and summaries include tenant-shared Stops",
);

check(
  !page.includes("All schools"),
  "school-scoped Stops no longer exposes All schools filter",
);

check(
  page.includes("schoolId: input.schoolId ? schoolId : undefined"),
  "Stop creation is constrained to current school or Shared",
);

check(
  page.includes("const schools: School[] = activeSchool ? [activeSchool] : []"),
  "Stop form receives only the current authorised school",
);

check(
  form.includes('<MenuItem value="">Shared stop</MenuItem>'),
  "Shared stop creation remains available",
);

check(
  api.includes("includeShared?: boolean") &&
    api.includes('parameters.set("includeShared"'),
  "Stops frontend API forwards explicit shared-resource option",
);

console.log();
console.log("School-scoped Stops routing checkpoint PASSED");
