import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

const permissions = readFileSync("src/auth/frontend-permissions.ts", "utf8");

const api = readFileSync("src/users/users.api.ts", "utf8");

const page = readFileSync("src/users/UsersAccessPage.tsx", "utf8");

const createDialog = readFileSync("src/users/CreateUserDialog.tsx", "utf8");

const roleDialog = readFileSync("src/users/ChangeUserRoleDialog.tsx", "utf8");

const accessDialog = readFileSync("src/users/UserAccessDialog.tsx", "utf8");

console.log("User lifecycle frontend checkpoint");

console.log("----------------------------------");

assert(
  permissions.includes('"users.create"'),
  "users.create frontend permission exists",
);

assert(
  permissions.includes('"users.update_role"'),
  "users.update_role frontend permission exists",
);

assert(
  permissions.includes('"users.activate"'),
  "users.activate frontend permission exists",
);

assert(
  permissions.includes('"users.deactivate"'),
  "users.deactivate frontend permission exists",
);

assert(
  api.includes('apiRequest<TenantUserProvisionResult>("/users"'),
  "create-user endpoint is wired",
);

assert(
  api.includes("`/users/${userId}/role`"),
  "role-update endpoint is wired",
);

assert(
  api.includes("`/users/${userId}/activate`"),
  "activate endpoint is wired",
);

assert(
  api.includes("`/users/${userId}/deactivate`"),
  "deactivate endpoint is wired",
);

assert(
  page.includes("FRONTEND_PERMISSIONS.USERS_CREATE"),
  "Add User visibility uses backend permission",
);

assert(
  page.includes("FRONTEND_PERMISSIONS.USERS_UPDATE_ROLE"),
  "role editing uses backend permission",
);

assert(
  page.includes("FRONTEND_PERMISSIONS.USERS_ACTIVATE"),
  "reactivation uses backend permission",
);

assert(
  page.includes("FRONTEND_PERMISSIONS.USERS_DEACTIVATE"),
  "deactivation uses backend permission",
);

assert(
  page.includes("FRONTEND_PERMISSIONS.USERS_RESET_PASSWORD"),
  "password reset still uses backend permission",
);

assert(
  page.includes("Existing account linked successfully"),
  "existing global identity success message exists",
);

assert(
  page.includes("temporary password was not applied"),
  "existing identity messaging does not claim password replacement",
);

assert(
  page.includes(
    "Other organisations linked to the same account are unaffected",
  ),
  "tenant-only deactivation is explained",
);

assert(
  createDialog.includes(
    "already belongs to an account in another school group",
  ),
  "Add User explains global identity linking",
);

assert(
  createDialog.includes('value: "admin"') &&
    createDialog.includes('value: "transport_manager"') &&
    createDialog.includes('value: "dispatcher"') &&
    createDialog.includes('value: "staff"'),
  "generic Add User exposes approved tenant roles",
);

assert(
  !createDialog.includes('value: "owner"') &&
    !createDialog.includes('value: "driver"') &&
    !createDialog.includes('value: "guardian"'),
  "owner/driver/guardian are excluded from generic user creation",
);

assert(roleDialog.includes("Update the role"), "change-role dialog exists");

assert(
  accessDialog.includes("Reactivate access") &&
    accessDialog.includes("Deactivate access"),
  "tenant access lifecycle confirmation exists",
);

console.log();

console.log("User lifecycle frontend checkpoint PASSED");
