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

const mobileNavigation = fs.readFileSync(
  "src/super-admin/PlatformMobileNavigation.tsx",
  "utf8",
);

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
console.log("Platform shared navigation checkpoint");
console.log("-------------------------------------");

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
  sidebar.includes("mobile?: boolean"),
  "shared sidebar supports mobile rendering",
);

check(
  mobileNavigation.includes("export function PlatformMobileNavigation"),
  "shared Platform mobile navigation component exists",
);

check(
  mobileNavigation.includes("<Drawer") &&
    mobileNavigation.includes("<PlatformSidebar") &&
    mobileNavigation.includes("<MenuRounded"),
  "mobile navigation reuses the canonical Platform sidebar",
);

check(
  mobileNavigation.includes('"55vw"') &&
    mobileNavigation.includes('"60dvh"') &&
    mobileNavigation.includes("rgba(45, 212, 191"),
  "mobile navigation uses compact translucent teal-glass card",
);

check(
  superAdmin.includes('from "./PlatformMobileNavigation"') &&
    superAdmin.includes("<PlatformMobileNavigation"),
  "Super Admin renders shared mobile navigation",
);

check(
  limitedRole.includes('from "./PlatformMobileNavigation"') &&
    limitedRole.includes("<PlatformMobileNavigation"),
  "limited Platform roles render shared mobile navigation",
);

check(
  limitedRole.includes("platformPermissions") &&
    limitedRole.includes("hasFrontendPlatformPermission"),
  "limited Platform navigation remains permission-derived",
);

check(
  permissions.includes("ONBOARDING_READ_ALL") &&
    permissions.includes("SCHOOL_READ_ALL") &&
    permissions.includes("FINANCE_READ"),
  "frontend Platform permission catalogue covers control-plane domains",
);

check(
  !sidebar.includes("isSuperAdmin") &&
    !sidebar.includes("executive_sales") &&
    !sidebar.includes("assistant_platform_admin"),
  "shared navigation contains no hard-coded Platform role authorization",
);

if (failed) {
  console.error("");
  console.error("PLATFORM SHARED NAVIGATION CHECKPOINT FAILED");
  process.exit(1);
}

console.log("");
console.log("PLATFORM SHARED NAVIGATION CHECKPOINT PASSED");
