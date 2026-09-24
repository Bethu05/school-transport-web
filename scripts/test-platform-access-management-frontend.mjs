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

const page = read("src/super-admin/SuperAdminPage.tsx");

const panel = read("src/super-admin/PlatformAccessPanel.tsx");

const transition = read("src/super-admin/ScreenTransition.tsx");

console.log("Platform Access management frontend checkpoint");

console.log("----------------------------------------------");

check(
  api.includes("/platform/access/users/search?q=") &&
    !api.includes('"/platform/access/users",\n  );'),
  "platform-user discovery uses server-side search rather than bulk listing",
);

check(
  api.includes('"/platform/access/roles"') &&
    api.includes('"/platform/access/users"') &&
    api.includes("resetPlatformAccessUserPassword") &&
    api.includes("setPlatformAccessUserStatus"),
  "platform-user lifecycle API surface is wired",
);

check(
  panel.includes('placeholder="Search platform user..."') &&
    panel.includes("useDeferredValue") &&
    panel.includes("searchPlatformAccessUsers"),
  "search UI uses the server-side platform-user search",
);

check(
  panel.includes("Create Platform User") &&
    panel.includes("createPlatformAccessUser"),
  "Super Admin can create platform users",
);

check(
  panel.includes("View User") &&
    panel.includes("User created") &&
    panel.includes("Platform access added"),
  "platform-user profile exposes lifecycle dates",
);

check(
  panel.includes("Reset Password") &&
    panel.includes("resetPlatformAccessUserPassword"),
  "platform-user password recovery is exposed",
);

check(
  panel.includes("Deny Platform Access") &&
    panel.includes("Restore Platform Access") &&
    panel.includes("setPlatformAccessUserStatus"),
  "platform access can be suspended and restored",
);

check(
  panel.includes('label: "Audit"') &&
    panel.includes('label: "Services"') &&
    panel.includes('label: "Finance"') &&
    panel.includes('label: "Onboarding"') &&
    panel.includes('label: "Roles"') &&
    panel.includes('label: "Schools"') &&
    panel.includes('label: "School Setup"') &&
    panel.includes('label: "Users"'),
  "active permission modules retain the compact mini-sidebar",
);

check(
  panel.includes('height: "100%"') &&
    panel.includes("flex: 1") &&
    page.includes('flexDirection: "column"') &&
    transition.includes('height: "100%"'),
  "Platform Access and the shared workspace fill available screen height",
);

check(
  panel.includes("inheritedPermissions") &&
    panel.includes("draftAdditionalPermissions") &&
    panel.includes("!permissionsEditable"),
  "role permissions remain protected and suspended users cannot edit effective access",
);

check(
  transition.includes("190ms") &&
    transition.includes("prefers-reduced-motion: reduce"),
  "smooth navigation remains subtle and accessibility-aware",
);

if (process.exitCode) {
  console.error();

  console.error("PLATFORM ACCESS MANAGEMENT FRONTEND CHECKPOINT FAILED");

  process.exit(process.exitCode);
}

console.log();

console.log("PLATFORM ACCESS MANAGEMENT FRONTEND CHECKPOINT PASSED");
