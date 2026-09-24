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

const app = read("src/App.tsx");
const shell = read("src/app/AppShell.tsx");
const tenantRouting = read("src/tenancy/tenant-routing.ts");
const settings = read("src/settings/SettingsPage.tsx");

console.log("Tenant-context routing checkpoint");
console.log("---------------------------------");

check(
  tenantRouting.includes("`/tenant/${encodeURIComponent(tenantSlug)}`"),
  "tenant URL builder uses explicit tenant namespace",
);

for (const path of [
  "/tenant/:tenantSlug",
  "/tenant/:tenantSlug/tracking",
  "/tenant/:tenantSlug/guardians",
  "/tenant/:tenantSlug/notifications",
  "/tenant/:tenantSlug/schools",
  "/tenant/:tenantSlug/settings",
  "/tenant/:tenantSlug/users-access",
]) {
  check(app.includes(`path="${path}"`), `canonical route exists: ${path}`);
}

check(
  app.includes("tenantMembership.slug !== tenantSlug"),
  "tenant slug cannot switch verified tenant authority",
);

check(
  app.includes('path="/guardians"') && app.includes('section="guardians"'),
  "legacy Guardians URL redirects through tenant context",
);

check(
  app.includes('path="/notifications"') &&
    app.includes('section="notifications"'),
  "legacy Notifications URL redirects through tenant context",
);

check(
  app.includes('path="/schools"') && app.includes('section="schools"'),
  "legacy Schools URL redirects through tenant context",
);

check(
  app.includes('path="/settings"') && app.includes('section="settings"'),
  "legacy Settings URL redirects through tenant context",
);

check(
  app.includes('path="/users-access"') &&
    app.includes('section="users-access"'),
  "legacy Users & Access URL redirects through tenant context",
);

check(
  shell.includes("buildTenantPath") &&
    shell.includes('item.path === "/guardians"') &&
    shell.includes('item.path === "/notifications"') &&
    shell.includes('item.path === "/schools"') &&
    shell.includes('item.path === "/settings"') &&
    shell.includes('item.path === "/users-access"'),
  "sidebar resolves tenant-wide modules through tenant slug",
);

check(
  shell.includes("buildSchoolPath") &&
    shell.includes('item.path === "/students"') &&
    shell.includes('item.path === "/drivers"'),
  "school-operational routing remains separate and intact",
);

check(
  settings.includes("buildTenantPath") && settings.includes('"users-access"'),
  "Settings links to canonical tenant Users & Access page",
);

console.log();
console.log("Tenant-context routing checkpoint PASSED");
