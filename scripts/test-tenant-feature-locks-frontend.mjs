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

const authApi = read("src/auth/auth.api.ts");
const authProvider = read("src/auth/AuthProvider.tsx");
const shell = read("src/app/AppShell.tsx");
const students = read("src/students/StudentsPage.tsx");
const upgradeDialog = read("src/commercial/UpgradeRequiredDialog.tsx");

console.log("Tenant feature-lock frontend checkpoint");
console.log("---------------------------------------");

check(
  authApi.includes("features: TenantFeatureAccess[]"),
  "auth context contract exposes effective tenant features",
);

check(
  authProvider.includes("features: readonly TenantFeatureAccess[]") &&
    authProvider.includes("setFeatures(context.features)"),
  "AuthProvider stores backend feature entitlement state",
);

check(
  shell.includes('feature: "tracking.live"'),
  "navigation supports whole-page feature requirements",
);

check(
  shell.includes("enabledFeatureKeys") &&
    shell.includes("lockedNavigationItem"),
  "navigation can calculate commercial lock state",
);

check(
  shell.includes("hasFrontendPermission("),
  "permission filtering remains independent from feature entitlement",
);

check(
  shell.includes("UpgradeRequiredDialog") &&
    shell.includes("LockRounded"),
  "locked navigation has visible upgrade treatment",
);

check(
  students.includes(
    'feature.key === "students.custom_fields"',
  ) &&
    students.includes("studentCustomFieldsEnabled"),
  "Student Custom Fields consumes its effective feature entitlement",
);

check(
  students.includes("canManageStudentCustomFields"),
  "Custom Fields still separately requires user permission",
);

check(
  students.includes("setCustomFieldsUpgradeOpen(true)") &&
    students.includes('featureName="Student Custom Fields"'),
  "locked Custom Fields action opens upgrade explanation",
);

check(
  students.includes("<LockRounded />") &&
    students.includes(
      'color={studentCustomFieldsEnabled ? "primary" : "warning"}',
    ),
  "locked Custom Fields action is visually distinct",
);

check(
  upgradeDialog.includes("Upgrade required") &&
    /current\s+package/.test(upgradeDialog),
  "upgrade dialog contains concise package explanation",
);

console.log();
console.log("Tenant feature-lock frontend checkpoint PASSED");
