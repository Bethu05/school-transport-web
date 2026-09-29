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
const panel = read("src/super-admin/PlatformAccessPanel.tsx");

console.log("Platform Access revamp checkpoint");
console.log("---------------------------------");

check(
  api.includes("listPlatformAccessUsers") &&
    api.includes("/platform/access/users?"),
  "platform users auto-load through paginated server endpoint",
);

check(
  panel.includes('value="users"') && panel.includes('value="roles"'),
  "workspace separates Users and Roles",
);

check(
  panel.includes("usersQuery") && panel.includes("<Pagination"),
  "user directory uses server-side pagination",
);

check(
  panel.includes('placeholder="Search name, email or role..."') &&
    panel.includes("normalizedSearch"),
  "user search remains server-side",
);

check(
  api.includes("getPlatformAccessRole") &&
    api.includes("replacePlatformRolePermissions"),
  "role detail and atomic role-permission update API are wired",
);

check(
  panel.includes("draftRolePermissions") && panel.includes("Save role"),
  "role permission templates are editable",
);

check(
  panel.includes("Protected role") && panel.includes("!selectedRole.editable"),
  "protected roles cannot be edited",
);

check(
  panel.includes("inheritedPermissions") &&
    panel.includes("draftAdditionalPermissions") &&
    panel.includes("User extra"),
  "user-specific permissions remain separate from inherited role access",
);

check(
  panel.includes("Create User") &&
    panel.includes("Reset password") &&
    panel.includes("Suspend") &&
    panel.includes("Restore"),
  "existing platform-user lifecycle actions remain available",
);

check(
  panel.includes("Confirm temporary password") &&
    panel.includes("resetConfirmPassword"),
  "Platform user reset requires password confirmation",
);

check(
  panel.includes("Temporary password and confirmation do not match.") &&
    panel.includes("Passwords do not match."),
  "Platform user reset rejects mismatched passwords",
);

check(
  panel.includes("Set Temporary Password") &&
    panel.includes("resetPlatformAccessUserPassword"),
  "Super Admin can set a temporary password for a Platform user",
);

check(
  panel.includes("They must change it at next sign-in.") &&
    api.includes("/password/reset"),
  "Platform user is forced into next-login password change flow",
);

check(
  panel.includes("resetMutation.isError") &&
    panel.includes("Password could not be reset."),
  "Platform password reset surfaces failures inside the dialog",
);

if (process.exitCode) {
  console.error();
  console.error("PLATFORM ACCESS REVAMP CHECKPOINT FAILED");
  process.exit(process.exitCode);
}

console.log();
console.log("PLATFORM ACCESS REVAMP CHECKPOINT PASSED");
