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

const settingsApi = read("src/settings/settings.api.ts");

const settingsPage = read("src/settings/SettingsPage.tsx");

const organisationProfile = read("src/settings/OrganisationProfilePanel.tsx");

const schoolsApi = read("src/schools/schools.api.ts");

const schoolsPage = read("src/schools/SchoolsPage.tsx");

const schoolProfile = read("src/schools/SchoolProfileDialog.tsx");

const platformApi = read("src/super-admin/platform.api.ts");

const tenantPage = read("src/super-admin/TenantManagementPage.tsx");

const tenantProfile = read("src/super-admin/TenantProfileActions.tsx");

console.log("Profile V1 frontend checkpoint");
console.log("------------------------------");

check(
  settingsApi.includes('"/settings/profile"'),
  "tenant Settings profile API exists",
);

check(
  settingsPage.includes("<OrganisationProfilePanel"),
  "Settings renders Organisation Profile",
);

check(
  organisationProfile.includes('label="Country code"') &&
    organisationProfile.includes('label="Operational contact"') &&
    organisationProfile.includes('label="Motto"') &&
    organisationProfile.includes('label="Vision"'),
  "Organisation Profile exposes onboarding identity fields",
);

check(
  schoolsApi.includes("`/schools/${schoolId}/profile`"),
  "school profile API exists",
);

check(
  schoolsPage.includes("<SchoolProfileDialog"),
  "Schools exposes school profile management",
);

check(
  schoolProfile.includes('label="Transport contact"') &&
    schoolProfile.includes('label="Emergency contact"') &&
    schoolProfile.includes('label="Latitude"') &&
    schoolProfile.includes('label="Longitude"'),
  "School Profile exposes transport/contact/location fields",
);

check(
  platformApi.includes("`/platform/tenants/${tenantId}/profile`"),
  "Super Admin tenant profile API exists",
);

check(
  tenantPage.includes('title="Tenant details"') &&
    tenantPage.includes("<TenantProfileActions"),
  "Super Admin exposes Tenant Details",
);

check(
  tenantProfile.includes('label="Tenant slug"') &&
    tenantProfile.includes('label="Lifecycle status"'),
  "slug and lifecycle remain visible but read-only",
);

check(
  !tenantProfile.includes('label="Billing'),
  "finance/billing fields are excluded",
);

console.log();
console.log("Profile V1 frontend checkpoint PASSED");
