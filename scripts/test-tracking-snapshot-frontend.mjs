import { readFileSync } from "node:fs";

import {
  mergeVehicleLocation,
  mergeVehicleLocations,
} from "../src/tracking/tracking-state.ts";

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

const api = readFileSync("src/tracking/tracking-snapshot.api.ts", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

function location(vehicleId, timestamp, latitude) {
  return {
    tenantId: "tenant-1",
    vehicleId,
    gpsDeviceId: "GPS-1",
    tripId: null,
    routeId: null,
    arrivedStop: null,
    departedStop: null,
    nextStop: null,
    latitude,
    longitude: 36.8,
    speedKph: 40,
    heading: 90,
    accuracyMeters: 4,
    recordedAt: new Date(timestamp).toISOString(),
    recordedAtEpochMs: timestamp,
    receivedAt: new Date(timestamp).toISOString(),
  };
}

// ============================================================
// API WIRING
// ============================================================

check(
  api.includes('"/tracking/locations/latest"'),
  "frontend reads latest tracking snapshot endpoint",
);

check(
  page.includes("getLatestTrackingLocations"),
  "tracking page hydrates latest locations",
);

check(
  /void\s+hydrateLatestLocations\(\)/.test(page),
  "snapshot hydration starts after realtime authorization",
);

// ============================================================
// PAGE REFRESH
// ============================================================

const snapshotLocation = location("vehicle-1", 1_000, -1.28);

const hydrated = mergeVehicleLocations({}, [snapshotLocation]);

check(
  hydrated["vehicle-1"]?.location.recordedAtEpochMs === 1_000,
  "page-load snapshot immediately creates vehicle state",
);

check(
  hydrated["vehicle-1"]?.trail.length === 1,
  "snapshot seeds the initial map breadcrumb point",
);

// ============================================================
// RACE PROTECTION
// ============================================================

const liveLocation = location("vehicle-1", 2_000, -1.27);

const realtimeState = mergeVehicleLocation(hydrated, liveLocation);

const oldSnapshotArrivesLate = mergeVehicleLocations(realtimeState, [
  snapshotLocation,
]);

check(
  oldSnapshotArrivesLate["vehicle-1"].location.recordedAtEpochMs === 2_000,
  "older snapshot cannot overwrite newer realtime GPS",
);

check(
  oldSnapshotArrivesLate["vehicle-1"].location.latitude === -1.27,
  "bus cannot jump backwards when snapshot response arrives late",
);

// ============================================================
// TRAIL
// ============================================================

check(
  realtimeState["vehicle-1"].trail.length === 2,
  "realtime packet continues trail from snapshot position",
);

console.log("");
console.log("Initial tracking snapshot frontend checkpoint PASSED");
