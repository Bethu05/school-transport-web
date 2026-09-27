import { readFileSync } from "node:fs";

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");
const map = readFileSync("src/tracking/LiveTrackingMap.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

console.log("");
console.log("Control Room active-trip checkpoint");
console.log("-----------------------------------");

check(
  page.includes("listTripsPage"),
  "Control Room discovers dated trips through the existing Trips API",
);

check(
  page.includes("FRONTEND_PERMISSIONS.TRIPS_READ"),
  "active-trip discovery respects trips.read",
);

check(page.includes("tracking-active"), "active-trip query has its own cache");

check(
  page.includes("refetchInterval: 5_000"),
  "operational trip state refreshes every five seconds",
);

check(
  page.includes(`trip.status === "in_progress"`),
  "only in-progress trips become active Control Room context",
);

check(
  page.includes("defaultOperationalTrip?.vehicleId"),
  "assigned vehicle can be selected before GPS arrives",
);

check(
  page.includes("selectedOperationalTrip?.routeId"),
  "dated trip supplies canonical route before GPS arrives",
);

check(
  page.includes("selectedTrackedVehicleCandidate.location.tripId") &&
    page.includes("selectedOperationalTrip.id"),
  "historical GPS cannot become current selected-trip GPS",
);

check(
  page.includes("operationalTrackedVehicles") &&
    page.includes("activeTripForVehicle"),
  "historical GPS is removed from active-trip map rendering",
);

check(page.includes("Awaiting first GPS signal"), "pre-GPS state is explicit");

check(
  page.includes("plannedRoute={canonicalPlannedRoute}") &&
    page.includes("selectedRouteStopMapMarkers"),
  "route and stops can open the map before bus GPS",
);

check(
  map.includes("markers.length === 0 && !plannedRoute"),
  "Mapbox accepts route-only rendering",
);

check(
  map.includes("lastPlannedRouteKeyRef") &&
    map.includes("plannedRoute.coordinates") &&
    map.includes("map.fitBounds"),
  "route-only map frames canonical geometry",
);

check(
  page.includes(`socket.on("vehicle.location.updated"`),
  "GPS movement remains WebSocket-driven",
);

console.log("");
console.log("Control Room active-trip checkpoint PASSED");
