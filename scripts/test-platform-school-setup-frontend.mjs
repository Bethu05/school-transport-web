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

const api = read("src/super-admin/platform.api.ts");
const sales = read("src/super-admin/ExecutiveSalesWorkspace.tsx");
const review = read("src/super-admin/SchoolSetupReviewPanel.tsx");
const onboarding = read("src/super-admin/OnboardingWorkspace.tsx");
const overview = read("src/super-admin/SuperAdminOverview.tsx");
const schools = read("src/super-admin/SchoolsWorkspace.tsx");

console.log("Platform School Setup frontend checkpoint");
console.log("----------------------------------------");

check(
  api.includes('"/platform/school-setup-requests"') &&
    api.includes('"/platform/school-setup-requests/mine"') &&
    api.includes("/submit") &&
    api.includes("/approve") &&
    api.includes("/reject"),
  "School Setup create/list/submit/review API surface is wired",
);

check(
  sales.includes("createPlatformSchoolSetupRequest") &&
    sales.includes("updateOwnPlatformSchoolSetupRequest") &&
    sales.includes("submitOwnPlatformSchoolSetupRequest"),
  "Executive Sales supports Draft -> Edit -> Submit",
);

check(
  sales.includes("Creating a draft does not create a tenant"),
  "sales UI communicates the pre-tenant boundary",
);

check(
  review.includes("approvePlatformSchoolSetupRequest") &&
    review.includes("rejectPlatformSchoolSetupRequest"),
  "review UI supports explicit approval and rejection",
);

check(
  onboarding.includes("School applications") &&
    onboarding.includes("15-step onboarding") &&
    onboarding.includes("<TenantOnboardingPanel"),
  "Super Admin keeps one canonical two-stage onboarding workspace",
);

check(
  overview.includes("listPlatformSchoolSetupRequestsForReview") &&
    overview.includes('request.status === "submitted"'),
  "Pending review KPI derives from pre-tenant applications",
);

check(
  !schools.includes("<CreateTenantDialog") &&
    !schools.includes("Create school"),
  "Schools UI cannot directly provision a tenant",
);

if (process.exitCode) {
  console.error();
  console.error("Platform School Setup frontend checkpoint FAILED");
} else {
  console.log();
  console.log("Platform School Setup frontend checkpoint PASSED");
}
