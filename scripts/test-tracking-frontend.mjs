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

const event = (name) =>
  new RegExp(`["'\`]${name.replaceAll(".", "\\.")}["'\`]`);

console.log();
console.log("Live Tracking frontend checkpoint");
console.log("---------------------------------");

check(
  realtime.includes("${REALTIME_BASE_URL}/tracking"),
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
  event("vehicle.location.updated").test(page),
  "vehicle location event wired",
);

check(event("trip.stop.arrived").test(page), "stop-arrival event wired");

check(event("trip.stop.departed").test(page), "stop-departure event wired");

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

check(
  page.includes('setConnectionStatus("connected")') ||
    page.includes("setConnectionStatus('connected')"),
  "realtime connection state becomes connected",
);

check(app.includes("<TrackingPage />"), "Tracking page connected to router");

console.log();
console.log("Live Tracking frontend checkpoint PASSED");
