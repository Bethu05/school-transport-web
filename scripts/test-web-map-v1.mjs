import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(condition, label) {
  if (!condition) {
    throw new Error(`✗ ${label}`);
  }

  console.log(`✓ ${label}`);
}

const page = read("src/tracking/TrackingPage.tsx");
const map = read("src/tracking/LiveTrackingMap.tsx");
const realtime = read("src/tracking/tracking.realtime.ts");

console.log("");
console.log("Web Map V1 regression");
console.log("---------------------");

check(
  page.includes("FRONTEND_PERMISSIONS.CONTROL_ROOM_READ"),
  "Control Room remains permission gated",
);

check(
  page.includes('feature.key === "control_room.live_map"'),
  "Live Fleet Map remains entitlement gated",
);

check(
  page.includes('trip.status === "in_progress"'),
  "only operational trips drive the live map",
);

check(
  page.includes("getLatestTrackingLocations"),
  "HTTP GPS snapshot remains available",
);

check(
  page.includes("getTrackingTripMap"),
  "Control Room loads frozen Trip map",
);

check(
  page.includes('"tracking-trip-map"'),
  "Trip map query is Trip scoped",
);

check(
  !page.includes("getRouteGeometry") &&
    !page.includes("listRouteStops"),
  "operational map does not use mutable Route template",
);

check(
  map.includes("TRACKING_PLANNED_ROUTE_SOURCE"),
  "frozen planned road route layer exists",
);

check(
  map.includes("TRACKING_REMAINING_ROUTE_SOURCE"),
  "remaining road route layer exists",
);

check(
  map.includes("ref={containerRef}"),
  "Mapbox container is permanently mounted",
);

check(
  !/if\s*\(\s*markers\.length\s*===\s*0\s*&&\s*!plannedRoute\s*\)\s*\{\s*return\s*\(/m.test(
    map,
  ),
  "pre-GPS state cannot prevent Mapbox initialisation",
);

check(
  map.includes("data-tracking-map-empty-state"),
  "empty state renders over mounted map",
);

check(
  map.includes("animateMarkerPosition"),
  "vehicle movement remains animated",
);

check(
  map.includes("followMarkerKey"),
  "Follow Bus remains available",
);

check(
  realtime.includes("VITE_REALTIME_URL") &&
    realtime.includes("/tracking"),
  "realtime tracking namespace remains configured",
);

check(
  realtime.includes('transports: ["websocket"]'),
  "tracking remains WebSocket driven",
);

console.log("");
console.log("✓ WEB MAP V1 REGRESSION GREEN");
