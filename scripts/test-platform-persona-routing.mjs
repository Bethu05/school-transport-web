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

const authApi = read("src/auth/auth.api.ts");
const provider = read("src/auth/AuthProvider.tsx");
const login = read("src/auth/LoginPage.tsx");
const presets = read("src/auth/dev-login-presets.ts");
const protectedRoute = read("src/auth/ProtectedRoute.tsx");
const platformRoute = read("src/auth/PlatformRoute.tsx");
const platformPage = read("src/super-admin/PlatformLimitedRolePage.tsx");
const superAdmin = read("src/super-admin/SuperAdminPage.tsx");

console.log("Platform persona routing checkpoint");
console.log("----------------------------------");

check(
  authApi.includes("roles: string[]") &&
    authApi.includes("permissions: string[]"),
  "auth/me frontend contract retains platform roles and permissions",
);

check(
  provider.includes("platformRoles") &&
    provider.includes("platformPermissions") &&
    provider.includes("isPlatformUser") &&
    provider.includes("response.platform.roles.length > 0"),
  "AuthProvider recognizes every platform identity without tenant discovery",
);

check(
  login.includes("outcome.isPlatformUser") &&
    protectedRoute.includes("isPlatformUser") &&
    platformRoute.includes("isPlatformUser"),
  "platform personas consistently route to /platform",
);

check(
  presets.includes('"Platform Admin"') &&
    presets.includes('"Assistant Platform Admin"') &&
    presets.includes('"Executive Sales"') &&
    presets.includes('"Administrator"') &&
    presets.includes('"Transport Manager"') &&
    presets.includes('"Driver"') &&
    presets.includes('"Parent"'),
  "development login exposes seven real personas",
);

check(
  platformPage.includes("<ExecutiveSalesWorkspace") &&
    platformPage.includes("<SchoolSetupReviewPanel") &&
    platformPage.includes("hasFrontendPlatformPermission"),
  "limited platform views derive from platform permissions",
);

check(
  superAdmin.includes("<PlatformLimitedRolePage") &&
    superAdmin.includes("isSuperAdmin"),
  "Super Admin retains full control centre while other platform users get limited views",
);

if (process.exitCode) {
  console.error();
  console.error("Platform persona routing checkpoint FAILED");
} else {
  console.log();
  console.log("Platform persona routing checkpoint PASSED");
}
