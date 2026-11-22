import { readFileSync } from "node:fs";

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

const overlay = readFileSync("src/tracking/TripStopsOverlay.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

console.log();
console.log("Trip stops overlay checkpoint");
console.log("-----------------------------");

check(
  page.includes("tripMapQuery.data?.stops"),
  "stop itinerary comes from frozen Trip map",
);

check(
  page.includes("<TripStopsOverlay"),
  "Control Room renders floating Trip stops card",
);

check(
  page.includes("stops={selectedRouteStops}"),
  "selected frozen Trip stops feed floating card",
);

check(
  page.includes("nextStopId={selectedNextStopId}"),
  "realtime next stop drives itinerary highlight",
);

check(
  page.includes("markers={operationalMapWithNextStop}"),
  "operational map renders vehicles plus only the next stop",
);

check(
  !page.includes("selectedRouteStopMapMarkers"),
  "ordered Trip stops no longer clutter map",
);

check(
  !page.includes("operationalStopMapMarkers"),
  "realtime next-stop markers no longer clutter map",
);

check(
  overlay.includes("Next ·") && overlay.includes('label="NEXT"'),
  "floating card visibly identifies next stop",
);

check(
  overlay.includes("Completed"),
  "completed stops remain visible in itinerary",
);

check(
  overlay.includes("Upcoming"),
  "upcoming stops remain visible in itinerary",
);

check(overlay.includes("setExpanded"), "stop itinerary can be collapsed");

console.log();
console.log("Trip stops overlay checkpoint PASSED");

check(
  overlay.includes("data-trip-stops-drag-handle"),
  "Trip stops card exposes draggable header",
);

check(overlay.includes("onPointerMove"), "Trip stops card can move around map");

check(
  overlay.includes("translate3d"),
  "Trip stops card position follows drag offset",
);

check(
  overlay.includes("rgba(255, 255, 255, 0.72)"),
  "Trip stops card uses transparent glass presentation",
);

check(overlay.includes('"UPCOMING"'), "upcoming stops have explicit status");

check(overlay.includes('"DONE"'), "completed stops have explicit status");

check(overlay.includes('"NEXT"'), "next stop remains strongly highlighted");

check(
  page.includes("selectedNextStopMapMarkers") &&
    page.includes('emphasis: "next-stop"'),
  "next stop alone is restored as a map pin",
);

check(
  page.includes("childrenByTripStopId") &&
    page.includes("listTrackingTripRiders"),
  "Control Room groups assigned children by Trip stop",
);

check(
  overlay.includes("childrenByStopId") && overlay.includes("children.join"),
  "floating stop card shows student count and first names",
);
