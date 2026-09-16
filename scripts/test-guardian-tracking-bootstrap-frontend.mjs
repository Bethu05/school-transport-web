import { readFileSync } from "node:fs";

const api = readFileSync("src/tracking/guardian-tracking.api.ts", "utf8");

const panel = readFileSync("src/tracking/GuardianTrackingPanel.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

console.log();
console.log("Guardian tracking bootstrap frontend checkpoint");
console.log("----------------------------------------------");

check(
  /\/me\/children\/\$\{studentId\}\/tracking-bootstrap/.test(api),
  "Guardian uses relationship-scoped tracking bootstrap endpoint",
);

check(
  !api.includes("/tracking/locations/latest"),
  "Guardian does not use tenant-wide operational snapshot",
);

check(
  !api.includes("listVehicles"),
  "Guardian does not enumerate tenant vehicles",
);

check(
  /trackingBootstrap\?\.activeTrip/.test(api),
  "active trip comes from authorised Guardian bootstrap",
);

check(
  /latestLocation/.test(api) && /routeGeometry/.test(api),
  "bootstrap exposes last location and authorised route geometry",
);

check(
  panel.includes("subscribeToTrip"),
  "existing authorised realtime trip subscription remains in use",
);

check(
  /location\.tripId[\s\S]{0,180}activeTripIds\.includes/.test(panel),
  "realtime packets remain filtered to authorised trip ids",
);

check(
  /recordedAtEpochMs\s*>=\s*location\.recordedAtEpochMs/.test(panel),
  "older realtime packets cannot move the bus backwards",
);

check(
  /realtimeLocation\.recordedAtEpochMs\s*>=[\s\S]{0,100}bootstrapLocation\.recordedAtEpochMs/.test(
    panel,
  ),
  "newest of bootstrap and realtime location wins",
);

check(
  /\.slice\(\s*-40\s*\)/s.test(panel),
  "Guardian GPS breadcrumb is bounded",
);

check(
  panel.includes("sliceRouteBetweenPoints"),
  "Guardian remaining route uses canonical road geometry",
);

check(
  /plannedRoute=\{selectedPlannedRoute\}/.test(panel),
  "Guardian map receives authorised canonical route",
);

check(
  /remainingRoute=\{selectedRemainingRoute\}/.test(panel),
  "Guardian map receives remaining-road highlight",
);

check(
  /focusMarkerKey=\{selectedTripId\}/.test(panel),
  "Guardian bus selection supports one-time camera focus",
);

check(
  /followMarkerKey=\{followTripId\}/.test(panel),
  "Guardian map supports continuous Follow Bus mode",
);

check(
  panel.includes("Follow Bus") && panel.includes("Stop Following"),
  "Guardian can enable and release Follow Bus",
);

check(
  !panel.includes("getLatestTrackingLocations"),
  "Guardian panel does not import Admin tracking snapshot",
);

check(
  !panel.includes("getRouteGeometry"),
  "Guardian panel does not call tenant-wide route geometry endpoint",
);

console.log();
console.log("Guardian tracking bootstrap frontend checkpoint PASSED");
