import { readFileSync } from "node:fs";

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

const map = readFileSync("src/tracking/LiveTrackingMap.tsx", "utf8");

const css = readFileSync("src/tracking/live-tracking-map.css", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

console.log();
console.log("Control Room Map UX V1 checkpoint");
console.log("--------------------------------");

check(
  page.includes("activeTripSummaries") && page.includes("selectTrackedVehicle"),
  "multiple active trips remain selectable",
);

check(
  page.includes("selectedNextStopOrder"),
  "ordered route progression is derived from authoritative next stop",
);

check(
  page.includes('"completed-stop"') &&
    page.includes('"next-stop"') &&
    page.includes('"upcoming-stop"'),
  "route stops distinguish completed, next and upcoming states",
);

check(
  map.includes('emphasis?: "next-stop" | "completed-stop" | "upcoming-stop"'),
  "map marker contract carries stop progression state",
);

check(
  map.includes("tracking-map-stop--completed") &&
    map.includes("tracking-map-stop--upcoming"),
  "Mapbox stop markers update progression without map recreation",
);

check(
  css.includes(".tracking-map-stop--completed") &&
    css.includes(".tracking-map-stop--upcoming"),
  "completed and upcoming stops have dedicated visual treatment",
);

check(
  map.includes('markers.some((marker) => marker.kind !== "stop")'),
  "route-only framing ignores stop pins before first GPS",
);

check(
  map.includes("const fleetMarkers = markers.filter(") &&
    map.includes('(marker) => marker.kind !== "stop"'),
  "fleet overview camera frames buses rather than route-stop pins",
);

check(
  map.includes("animateMarkerPosition") && map.includes("updateVehicleHeading"),
  "smooth bus movement and heading remain intact",
);

check(
  page.includes("Follow Bus") && page.includes("Stop Following"),
  "Follow Bus controls remain intact",
);

console.log();
console.log("Control Room Map UX V1 checkpoint PASSED");
