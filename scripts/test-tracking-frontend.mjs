import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function check(condition, label) {
  if (!condition) {
    throw new Error(`✗ ${label}`);
  }

  console.log(`✓ ${label}`);
}

const realtime = read("src/tracking/tracking.realtime.ts");

const page = read("src/tracking/TrackingPage.tsx");

const app = read("src/App.tsx");

console.log();
console.log("Live Tracking frontend checkpoint");

console.log("---------------------------------");

check(
  realtime.includes("'/tracking'") || realtime.includes("/tracking`"),
  "Socket.IO tracking namespace wired",
);

check(
  realtime.includes("getAccessToken"),
  "realtime connection uses authenticated JWT",
);

check(
  realtime.includes("tenantId"),
  "realtime connection sends tenant context",
);

check(
  page.includes("'vehicle.location.updated'"),
  "vehicle location event wired",
);

check(page.includes("'trip.stop.arrived'"), "stop-arrival event wired");

check(page.includes("'trip.stop.departed'"), "stop-departure event wired");

check(
  page.includes("FRONTEND_PERMISSIONS.VEHICLES_READ"),
  "tenant-wide tracking UI requires fleet-read permission",
);

check(
  page.includes("vehicle.registrationNumber"),
  "vehicle registration used instead of raw UUID",
);

check(
  !page.includes("{item.location.vehicleId}"),
  "raw vehicle UUID not rendered",
);

check(page.includes("Realtime connected"), "connection status visible");

check(app.includes("<TrackingPage />"), "Tracking page connected to router");

console.log();
console.log("Live Tracking frontend checkpoint PASSED");
