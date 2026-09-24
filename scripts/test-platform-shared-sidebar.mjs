import fs from "node:fs";

let failed = false;

function check(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    return;
  }

  console.error(`✗ ${message}`);
  failed = true;
}

const sidebar = fs.readFileSync("src/super-admin/PlatformSidebar.tsx", "utf8");

const superAdmin = fs.readFileSync(
  "src/super-admin/SuperAdminPage.tsx",
  "utf8",
);

const limitedRole = fs.readFileSync(
  "src/super-admin/PlatformLimitedRolePage.tsx",
  "utf8",
);

const permissions = fs.readFileSync("src/auth/platform-permissions.ts", "utf8");

console.log("");
console.log("Platform shared sidebar checkpoint");
console.log("----------------------------------");

check(
  sidebar.includes("export function PlatformSidebar"),
  "shared PlatformSidebar component exists",
);

check(
  sidebar.includes("items: readonly PlatformSidebarItem[]"),
  "shared sidebar receives navigation items",
);

check(
  sidebar.includes("activeLabel"),
  "shared sidebar supports active navigation state",
);

check(
  sidebar.includes("userEmail"),
  "shared sidebar displays authenticated platform identity",
);

check(
  sidebar.includes("onLogout"),
  "shared sidebar exposes common logout behaviour",
);

check(
  superAdmin.includes('from "./PlatformSidebar"'),
  "Super Admin imports the shared sidebar",
);

check(
  superAdmin.includes("<PlatformSidebar"),
  "Super Admin renders the shared sidebar",
);

check(
  limitedRole.includes('from "./PlatformSidebar"'),
  "limited platform roles import the shared sidebar",
);

check(
  limitedRole.includes("<PlatformSidebar"),
  "Executive Sales / Assistant Platform Admin render the shared sidebar",
);

check(
  limitedRole.includes("platformPermissions"),
  "limited platform navigation is derived from live platform permissions",
);

check(
  limitedRole.includes("hasFrontendPlatformPermission"),
  "limited platform workspace visibility uses permission checks",
);

check(
  permissions.includes("ONBOARDING_READ_ALL") &&
    permissions.includes("SCHOOL_READ_ALL") &&
    permissions.includes("FINANCE_READ"),
  "frontend platform permission catalogue covers platform navigation domains",
);

check(
  !sidebar.includes("isSuperAdmin") &&
    !sidebar.includes("executive_sales") &&
    !sidebar.includes("assistant_platform_admin"),
  "shared sidebar contains no hard-coded platform role authorization",
);

if (failed) {
  console.error("");
  console.error("PLATFORM SHARED SIDEBAR CHECKPOINT FAILED");
  process.exit(1);
}

console.log("");
console.log("PLATFORM SHARED SIDEBAR CHECKPOINT PASSED");
