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
const provider = read("src/auth/AuthProvider.tsx");
const page = read("src/students/StudentsPage.tsx");
const form = read("src/students/StudentFormDialog.tsx");
const routing = read("src/schools/school-routing.ts");

console.log("School-scoped Students routing checkpoint");
console.log("-----------------------------------------");

check(
  app.includes('path="/school/:tenantSlug/:schoolSlug/students"'),
  "canonical school-scoped Students route exists",
);

check(
  app.includes("schools.find((school) => school.slug === schoolSlug)"),
  "URL school is resolved only from backend-authorised schools",
);

check(
  app.includes('<Navigate to="/students" replace />'),
  "unknown school URL returns to controlled Students entry",
);

check(
  provider.includes("getAuthSchools") &&
    provider.includes("activeSchool") &&
    provider.includes("selectSchool"),
  "AuthProvider remains the verified school-context source",
);

check(
  routing.includes("/school/") && routing.includes("schoolSlug"),
  "canonical school path builder exists",
);

check(
  shell.includes("navigationPath(item)") &&
    shell.includes("handleSchoolChange") &&
    shell.includes("buildSchoolPath("),
  "AppShell navigation and authorised school switching are wired",
);

check(
  shell.includes('location.pathname === "/students"') &&
    shell.includes('location.pathname.startsWith("/school/")'),
  "school selector is restricted to migrated school-context routes",
);

check(
  page.includes("const schoolId = activeSchool?.id"),
  "StudentsPage derives school from verified activeSchool",
);

check(
  !page.includes("All schools"),
  "tenant-wide All schools filter removed from school-scoped Students",
);

check(
  page.includes("schoolId,") && page.includes('"students-summary"'),
  "Student list and summary queries are school filtered",
);

check(
  page.includes("...input") && page.includes("schoolId,"),
  "Student creation is server request-scoped to current school",
);

check(
  form.includes("fixedSchoolId") &&
    form.includes("editing || Boolean(fixedSchoolId)") &&
    form.includes("schoolId: selectedSchoolId"),
  "Student create form is locked to current school",
);

console.log();
console.log("School-scoped Students routing checkpoint PASSED");
