import { readFileSync } from "node:fs";

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

const map = readFileSync("src/tracking/LiveTrackingMap.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

const start = page.indexOf("const remainingRouteCoordinates");

const end = page.indexOf("const operationalTrails", start);

check(start >= 0 && end > start, "remaining-trip implementation found");

const block = page.slice(start, end);

check(
  block.includes("sliceRouteBetweenPoints"),
  "remaining trip follows frozen road geometry",
);

check(
  block.includes("canonicalPlannedRoute.coordinates.length - 1"),
  "remaining route targets final Trip coordinate",
);

check(
  block.includes("selectedTrackedVehicle.location.latitude") &&
    block.includes("selectedTrackedVehicle.location.longitude"),
  "remaining route begins at live vehicle position",
);

check(
  !block.includes("selectedTrackedVehicle.location.nextStop.latitude") &&
    !block.includes("selectedTrackedVehicle.location.nextStop.longitude"),
  "next stop no longer truncates remaining Trip route",
);

check(
  block.includes(":remaining-trip"),
  "remaining route identity is Trip-wide",
);

check(
  page.includes("remainingRoute={remainingRouteHighlight}"),
  "remaining Trip path is supplied to live map",
);

check(
  map.includes("TRACKING_REMAINING_ROUTE_SOURCE"),
  "map retains dedicated remaining-route source",
);

console.log();
console.log("Full remaining Trip route checkpoint PASSED");
