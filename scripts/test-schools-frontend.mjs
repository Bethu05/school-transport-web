import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function check(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);

    process.exitCode = 1;

    return;
  }

  console.log(`✓ ${message}`);
}

const permissions = read("src/auth/frontend-permissions.ts");

const api = read("src/schools/schools.api.ts");

const page = read("src/schools/SchoolsPage.tsx");

const form = read("src/schools/SchoolFormDialog.tsx");

const router = read("src/App.tsx");

const shell = read("src/app/AppShell.tsx");

console.log("Schools frontend checkpoint");

console.log("---------------------------");

check(
  permissions.includes('SCHOOLS_READ: "schools.read"'),
  "schools.read frontend permission exists",
);

check(
  permissions.includes('SCHOOLS_CREATE: "schools.create"'),
  "schools.create frontend permission exists",
);

check(
  api.includes('"/schools"') && api.includes('method: "POST"'),
  "POST /schools client is wired",
);

check(
  page.includes("FRONTEND_PERMISSIONS.SCHOOLS_CREATE"),
  "Add School is permission-aware",
);

check(
  page.includes('queryKey: ["schools"') || page.includes('"schools",'),
  "Schools query uses React Query",
);

check(
  page.includes('"operations-dashboard"'),
  "dashboard is refreshed after school creation",
);

check(
  form.includes("School name") &&
    form.includes("School code") &&
    form.includes("Timezone"),
  "school form exposes required fields",
);

check(
  router.includes('path="/schools"') && router.includes("<SchoolsPage />"),
  "/schools route is registered",
);

check(
  shell.includes('label: "Schools"') &&
    shell.includes("FRONTEND_PERMISSIONS.SCHOOLS_READ"),
  "Schools navigation is permission-aware",
);

if (process.exitCode) {
  console.error("\nSchools frontend checkpoint FAILED");

  process.exit(process.exitCode);
}

console.log("\nSchools frontend checkpoint PASSED");
