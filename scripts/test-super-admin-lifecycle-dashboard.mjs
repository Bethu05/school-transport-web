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

const page = read("src/super-admin/SuperAdminPage.tsx");
const overview = read("src/super-admin/SuperAdminOverview.tsx");
const onboarding = read("src/super-admin/OnboardingWorkspace.tsx");
const schools = read("src/super-admin/SchoolsWorkspace.tsx");

console.log("Super Admin school lifecycle dashboard checkpoint");
console.log("------------------------------------------------");

check(
  page.includes('label: "Overview"') &&
    page.includes('label: "Onboarding"') &&
    page.includes('label: "Schools"') &&
    page.includes('label: "Plans"') &&
    page.includes('label: "Settings"'),
  "sidebar exposes the agreed platform lifecycle sections",
);

check(
  !page.includes('label: "Tenants"'),
  "generic Tenants navigation has been replaced by Schools",
);

check(
  page.includes("<SuperAdminOverview") &&
    page.includes("<OnboardingWorkspace") &&
    page.includes("<SchoolsWorkspace"),
  "top-level Overview, Onboarding and Schools workspaces are wired",
);

check(
  overview.includes("Pending review") &&
    overview.includes("In onboarding") &&
    overview.includes("Ready to launch") &&
    overview.includes("Live schools") &&
    overview.includes("On trial") &&
    overview.includes("Paused / inactive"),
  "overview exposes the required school lifecycle KPIs",
);

check(
  overview.includes("listPlatformSchoolSetupRequestsForReview") &&
    overview.includes("listPlatformOnboardingQueue") &&
    overview.includes("listPlatformTenants"),
  "overview reads pre-tenant review, canonical onboarding and school data",
);

check(
  onboarding.includes("School applications") &&
    onboarding.includes("15-step onboarding") &&
    onboarding.includes("<SchoolSetupReviewPanel"),
  "onboarding separates pre-tenant applications from post-approval workflow",
);

check(
  onboarding.includes("<TenantOnboardingPanel") &&
    onboarding.includes("Open onboarding"),
  "top-level onboarding opens the canonical 15-step control centre",
);

check(
  schools.includes('"live"') &&
    schools.includes('"trial"') &&
    schools.includes('"paused"') &&
    schools.includes('"deactivated"'),
  "schools workspace supports live, trial, paused and deactivated filters",
);

check(
  schools.includes("Manage school") &&
    !schools.includes("<CreateTenantDialog") &&
    !schools.includes("Create school"),
  "schools workspace manages existing schools without bypassing application approval",
);

check(
  schools.includes('tenant.subscriptionStatus === "trialing"') &&
    schools.includes('tenant.subscriptionStatus === "active"') &&
    schools.includes('tenant.status.toLowerCase() !== "active"'),
  "school lifecycle categories derive from persisted tenant and subscription state",
);

if (process.exitCode) {
  console.error();
  console.error("Super Admin school lifecycle dashboard checkpoint FAILED");
} else {
  console.log();
  console.log("Super Admin school lifecycle dashboard checkpoint PASSED");
}
