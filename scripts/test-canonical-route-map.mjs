import { readFileSync } from "node:fs";

const api = readFileSync("src/tracking/route-geometry.api.ts", "utf8");

const map = readFileSync("src/tracking/LiveTrackingMap.tsx", "utf8");

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

check(
  api.includes("/routes/${routeId}/geometry"),
  "frontend reads canonical route geometry API",
);

check(
  api.includes("[number, number][]"),
  "GeoJSON longitude/latitude coordinates are strongly typed",
);

check(
  page.includes("FRONTEND_PERMISSIONS.ROUTES_READ"),
  "canonical route fetch respects route-read permission",
);

/**
 * Do not depend on Prettier choosing single or double quotes.
 * We care that route-geometry is part of a queryKey.
 */
check(
  /queryKey\s*:\s*\[[\s\S]*?["']route-geometry["']/.test(page),
  "canonical route geometry has its own query cache",
);

check(
  page.includes("selectedTrackedVehicle") && page.includes(".routeId"),
  "route geometry follows the selected tracked vehicle",
);

check(
  page.includes("canonicalPlannedRoute"),
  "ready canonical geometry is transformed for the map",
);

check(
  /plannedRoute\s*=\s*\{/.test(page),
  "planned route is supplied to LiveTrackingMap",
);

check(
  map.includes("TRACKING_PLANNED_ROUTE_SOURCE"),
  "Mapbox has a dedicated canonical route source",
);

check(
  map.includes("tracking-planned-route-casing"),
  "planned route renders with a contrast casing",
);

check(
  map.includes("tracking-planned-route-line"),
  "planned route renders as a dedicated road line",
);

check(
  map.includes("plannedRoute.coordinates"),
  "Mapbox consumes canonical geometry coordinates directly",
);

check(
  map.includes("TRACKING_TRAILS_SOURCE"),
  "actual GPS breadcrumb remains a separate layer",
);

check(
  map.includes("TRACKING_CONNECTIONS_SOURCE"),
  "next-stop connector remains a separate layer",
);

console.log("");
console.log("Canonical planned-route map checkpoint PASSED");
