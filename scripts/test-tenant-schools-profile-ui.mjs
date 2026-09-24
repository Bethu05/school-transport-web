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

const page = read("src/schools/SchoolsPage.tsx");

const profile = read("src/schools/SchoolProfileDialog.tsx");

console.log("Tenant Schools profile UI checkpoint");

console.log("------------------------------------");

check(
  page.includes("Profile & contacts"),
  "school cards expose Profile & contacts explicitly",
);

check(
  page.includes("Edit school details"),
  "school cards expose Edit school details explicitly",
);

check(
  page.includes("School profile & onboarding"),
  "profile/onboarding area is visible on every school card",
);

check(
  page.includes("GPS coordinates") &&
    page.includes("transport contact") &&
    page.includes("emergency"),
  "school card explains additional profile capabilities",
);

check(
  page.includes("setProfileTarget(school)"),
  "Profile & contacts opens the selected school profile",
);

check(
  page.includes("FRONTEND_PERMISSIONS.SCHOOLS_UPDATE"),
  "core school editing remains permission controlled",
);

for (const field of [
  'label="Country code"',
  'label="County / region / state"',
  'label="City / town"',
  'label="Latitude"',
  'label="Longitude"',
  'label="Main phone"',
  'label="Transport contact"',
  'label="Emergency contact"',
  'label="Motto"',
  'label="Vision"',
  'label="About the school"',
]) {
  check(profile.includes(field), `School Profile contains ${field}`);
}

console.log();

console.log("Tenant Schools profile UI checkpoint PASSED");
