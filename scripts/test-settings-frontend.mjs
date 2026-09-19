import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

function quotedValue(source, value) {
  return source.includes(`"${value}"`) || source.includes(`'${value}'`);
}

const app = readFileSync("src/App.tsx", "utf8");

const shell = readFileSync("src/app/AppShell.tsx", "utf8");

const permissions = readFileSync("src/auth/frontend-permissions.ts", "utf8");

const api = readFileSync("src/settings/settings.api.ts", "utf8");

const page = readFileSync("src/settings/SettingsPage.tsx", "utf8");

console.log("Settings frontend checkpoint");

console.log("----------------------------");

assert(
  quotedValue(permissions, "settings.read"),
  "settings.read frontend constant",
);

assert(
  quotedValue(permissions, "settings.update"),
  "settings.update frontend constant",
);

assert(
  app.includes("import { SettingsPage }"),
  "SettingsPage imported by application router",
);

assert(app.includes('path="/settings"'), "/settings route exists");

assert(app.includes("<SettingsPage />"), "/settings renders real SettingsPage");

assert(
  !app.includes('PlaceholderPage title="Settings"'),
  "Settings placeholder removed",
);

const settingsNavigationStart = shell.indexOf('label: "Settings"');

assert(settingsNavigationStart >= 0, "Settings navigation item exists");

const settingsNavigationEnd = shell.indexOf(
  "\n  {",
  settingsNavigationStart + 1,
);

const settingsNavigationBlock = shell.slice(
  settingsNavigationStart,
  settingsNavigationEnd >= 0 ? settingsNavigationEnd : shell.length,
);

assert(
  settingsNavigationBlock.includes("FRONTEND_PERMISSIONS.SETTINGS_READ"),
  "Settings navigation uses settings.read",
);

assert(
  !settingsNavigationBlock.includes("roles:"),
  "Settings navigation does not hard-code owner/admin roles",
);

assert(api.includes('"/settings"'), "Settings GET API endpoint wired");

assert(
  api.includes('"/settings/general"'),
  "Settings PATCH API endpoint wired",
);

assert(api.includes('method: "PATCH"'), "Settings update uses PATCH");

assert(
  page.includes("FRONTEND_PERMISSIONS.SETTINGS_READ"),
  "Settings page checks read permission",
);

assert(
  page.includes("FRONTEND_PERMISSIONS.SETTINGS_UPDATE"),
  "Settings page checks update permission",
);

for (const label of [
  "Organisation name",
  "Timezone",
  "Locale",
  "Date format",
  "Time format",
  "Week starts on",
]) {
  assert(quotedValue(page, label), `Settings field exists: ${label}`);
}

assert(page.includes("Save settings"), "Settings save action exists");

assert(
  page.includes("General settings saved successfully."),
  "Settings success feedback exists",
);

console.log("");

console.log("Settings frontend checkpoint PASSED");
