import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

const permissions = read("src/auth/frontend-permissions.ts");

const api = read("src/guardians/guardians.api.ts");

const form = read("src/guardians/GuardianFormDialog.tsx");

const accessDialog = read("src/guardians/GuardianParentAppAccessDialog.tsx");

const page = read("src/guardians/GuardiansPage.tsx");

const transportManagerApiCheck = read(
  "scripts/test-transport-manager-guardian-permissions-api.mjs",
);

console.log("Guardian Parent App frontend checkpoint");

console.log("---------------------------------------");

check(
  permissions.includes('"guardians.manage_app_access"'),
  "Parent App access frontend permission exists",
);

check(
  api.includes('"/guardians/with-parent-app-access"'),
  "atomic Guardian + Parent App create endpoint is wired",
);

check(
  api.includes("`/guardians/${guardianId}/app-access`"),
  "existing Guardian app-access endpoint is wired",
);

check(
  form.includes("Give Parent App access"),
  "Guardian creation form exposes Parent App access switch",
);

check(
  form.includes("temporaryPassword.length <") && form.includes("12"),
  "new Parent account temporary password is validated",
);

check(
  form.includes("existing global account") || form.includes("existing account"),
  "creation form explains existing global identity reuse",
);

check(
  accessDialog.includes("Remove Parent App access") &&
    accessDialog.includes("Give Parent App access"),
  "existing Guardian access dialog supports enable and removal",
);

check(
  accessDialog.includes("existing work access"),
  "access removal explains preservation of another organisational role",
);

check(
  page.includes("GUARDIANS_MANAGE_APP_ACCESS"),
  "Guardian page visibility is permission-based",
);

check(
  page.includes('guardian.userId ? "Enabled" : "Not enabled"'),
  "Guardian list renders Parent App access status",
);

check(
  page.includes("temporary password was not applied"),
  "existing-account success messaging does not claim password replacement",
);

check(
  page.includes('membershipMode === "preserved"'),
  "frontend distinguishes preserved non-Guardian organisational access",
);

check(
  !api.includes("userId?:"),
  "ordinary Guardian create/update API does not expose raw userId linking",
);

check(
  transportManagerApiCheck.includes('"guardians.manage_app_access"'),
  "Transport Manager API checkpoint expects new backend permission",
);

console.log("");

console.log("Guardian Parent App frontend checkpoint PASSED");
