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
const progress = read("src/tracking/TrackingProgressPanel.tsx");
const map = read("src/tracking/LiveTrackingMap.tsx");
const operational = read("src/tracking/TrackingPage.tsx");
const guardian = read("src/tracking/GuardianTrackingPanel.tsx");

console.log();
console.log("Tracking progress frontend checkpoint");
console.log("-------------------------------------");

check(
  realtime.includes("VehicleLocationNextStop"),
  "realtime next-stop contract typed",
);

check(
  realtime.includes("etaSeconds") && realtime.includes("estimatedArrivalAt"),
  "ETA contract available to frontend",
);

check(
  realtime.includes("withinGeofence"),
  "next-stop geofence state available",
);

check(
  progress.includes("Next stop") || progress.includes("nextStop.stopName"),
  "next stop presented to user",
);

check(progress.includes("etaSeconds"), "ETA duration displayed");

check(
  progress.includes("estimatedArrivalAt"),
  "estimated arrival time displayed",
);

check(
  progress.includes("etaDistanceMeters") &&
    progress.includes("etaDistanceSource"),
  "backend-authoritative ETA distance displayed",
);

check(
  progress.includes("route_geometry"),
  "road distance source is identified when canonical geometry is used",
);

check(
  map.includes('"stop"') || map.includes("'stop'"),
  "map supports stop marker type",
);

check(
  operational.includes("operationalStopMapMarkers"),
  "Operations next stop plotted on map",
);

check(
  operational.includes("<TrackingProgressPanel"),
  "Operations ETA panel connected",
);

check(
  guardian.includes("guardianStopMapMarkers"),
  "Guardian authorised next stop plotted on map",
);

check(
  guardian.includes("<TrackingProgressPanel"),
  "Guardian ETA panel connected",
);

check(
  !progress.includes("tripStopId}") && !progress.includes("stopId}"),
  "raw tracking UUIDs not rendered",
);

console.log();
console.log("Tracking progress frontend checkpoint PASSED");
