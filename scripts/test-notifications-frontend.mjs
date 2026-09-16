import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

const api = read("src/notifications/notifications.api.ts");

const page = read("src/notifications/NotificationsPage.tsx");

const app = read("src/App.tsx");

console.log();
console.log("Notifications frontend checkpoint");
console.log("---------------------------------");

assert(
  api.includes("/me/notifications"),
  "current-user notification inbox wired",
);

assert(api.includes("nextCursor"), "notification cursor pagination supported");

assert(
  api.includes("/read") && api.includes("'PATCH'"),
  "mark-read endpoint wired",
);

assert(
  api.includes("/me/notification-preferences"),
  "notification preferences endpoint wired",
);

assert(
  page.includes("notifyBoarded") &&
    page.includes("notifyDroppedOff") &&
    page.includes("notifyTripUpdates"),
  "all guardian preference controls exposed",
);

assert(page.includes("Mark read"), "unread notification action exposed");

assert(
  page.includes("cursorHistory"),
  "notification pagination navigation present",
);

assert(
  page.includes("active guardian profile"),
  "relationship-derived preference access is handled",
);

assert(
  !page.includes("FRONTEND_PERMISSIONS"),
  "Notifications does not invent role/permission authorization",
);

assert(
  !api.includes("createNotification"),
  "unsupported notification creation not invented",
);

assert(
  !api.includes("deleteNotification"),
  "unsupported notification deletion not invented",
);

assert(
  app.includes("<NotificationsPage />"),
  "Notifications page connected to router",
);

console.log();
console.log("Notifications frontend checkpoint PASSED");
