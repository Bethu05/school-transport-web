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

const authProvider = read("src/auth/AuthProvider.tsx");

const protectedRoute = read("src/auth/ProtectedRoute.tsx");

const app = read("src/App.tsx");

const page = read("src/account-status/AccountStatusPage.tsx");

const apiClient = read("src/api/client.ts");

console.log("Commercial access frontend checkpoint");

console.log("-------------------------------------");

check(
  authApi.includes("TenantCommercialAccess") &&
    authApi.includes("access: TenantCommercialAccess"),
  "/auth/context commercial access is typed",
);

check(
  authProvider.includes("setAccess(context.access)"),
  "AuthProvider stores backend access state",
);

check(
  protectedRoute.includes('to="/account-status"') &&
    protectedRoute.includes("!access.operational"),
  "inactive tenants are stopped before ERP pages mount",
);

check(app.includes('path="/account-status"'), "/account-status route exists");

check(
  page.includes("Your trial has ended") &&
    page.includes("Subscription required") &&
    page.includes("Account access paused"),
  "account-status messaging covers commercial states",
);

check(
  page.includes("sirb-Technologies") && page.includes("school administrator"),
  "support wording distinguishes administrators and staff",
);

check(
  apiClient.includes("TENANT_ACCESS_INACTIVE_EVENT") &&
    apiClient.includes('"TENANT_ACCESS_INACTIVE"'),
  "mid-session commercial suspension signal is handled",
);

check(
  authProvider.includes("TENANT_ACCESS_INACTIVE_EVENT") &&
    authProvider.includes("refreshCommercialAccess"),
  "AuthProvider refreshes access after runtime suspension",
);

if (process.exitCode) {
  console.error("\nCommercial access frontend checkpoint FAILED");

  process.exit(process.exitCode);
}

console.log();

console.log("Commercial access frontend checkpoint PASSED");
