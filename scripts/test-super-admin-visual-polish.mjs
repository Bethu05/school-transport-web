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

const theme = read("src/super-admin/SuperAdminThemeProvider.tsx");

const sidebar = read("src/super-admin/PlatformSidebar.tsx");

const onboarding = read("src/super-admin/TenantOnboardingPanel.tsx");

const management = read("src/super-admin/TenantManagementPage.tsx");

console.log("");
console.log("Super Admin command-centre visual checkpoint");
console.log("--------------------------------------------");

check(
  theme.includes('mode: "dark"') &&
    theme.includes('default: "#20252B"') &&
    theme.includes("rgba(48, 55, 63, 0.76)"),
  "Super Admin uses dark-grey command-centre theme",
);

check(
  page.includes("linear-gradient(145deg, #292F36") &&
    page.includes('lg: "204px minmax(0, 1fr) 258px"'),
  "platform shell uses compact dark command-centre layout",
);

check(
  sidebar.includes("data-platform-floating-sidebar") &&
    sidebar.includes('height: "95dvh"') &&
    sidebar.includes('alignSelf: "center"'),
  "desktop sidebar floats at 95% viewport height",
);

check(
  sidebar.includes("0 26px 58px rgba(0, 0, 0, 0.36)") &&
    sidebar.includes("0 0 34px rgba(255, 255, 255, 0.045)"),
  "sidebar combines depth shadow and subtle white glow",
);

check(
  page.includes('bgcolor: "rgba(42, 48, 55, 0.66)"') &&
    page.includes("0 22px 52px rgba(0, 0, 0, 0.22)"),
  "main workspace is a translucent floating command surface",
);

check(
  page.includes("School applications") &&
    page.includes("Manage schools") &&
    page.includes("Platform users"),
  "quick navigation remains intact",
);

check(
  onboarding.includes("step.stepOrder <= 13") &&
    onboarding.includes("Navigation only.") &&
    onboarding.includes("readyToActivate"),
  "command-centre polish does not alter onboarding rules",
);

check(
  management.includes("<TenantOnboardingPanel") &&
    management.includes("TenantFeatureAccess") &&
    management.includes("TenantInitialAdminActions"),
  "school administration functionality remains intact",
);

if (process.exitCode) {
  console.error("");

  console.error("SUPER ADMIN COMMAND-CENTRE VISUAL CHECKPOINT FAILED");

  process.exit(process.exitCode);
}

console.log("");

console.log("SUPER ADMIN COMMAND-CENTRE VISUAL CHECKPOINT PASSED");
