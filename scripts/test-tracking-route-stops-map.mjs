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
console.log("Selected route stops map checkpoint");
console.log("-----------------------------------");

check(
  page.includes("listRouteStops"),
  "tracking page reuses the existing ordered route-stops API",
);

check(
  /queryKey\s*:\s*\[[\s\S]*?["']route-stops["']/.test(page),
  "selected route stops have their own query cache",
);

check(
  page.includes("selectedRouteStopMapMarkers"),
  "selected route renders all ordered stop markers",
);

check(
  page.includes("routeStop.stopOrder") && page.includes("routeStop.stopName"),
  "route stop order and human-readable name are shown",
);

check(
  /routeStop\.stopId\s*===\s*selectedNextStopId/.test(page),
  "realtime next stop is matched to the selected route by stop identity",
);

check(
  /emphasis\s*:\s*isNextStop/.test(page),
  "next stop receives explicit map emphasis",
);

check(
  page.includes("selectedRouteStopIds.has(nextStop.stopId)"),
  "selected next stop is not duplicated by realtime fallback markers",
);

check(
  page.includes("operationalStopMapMarkers"),
  "realtime next-stop fallback remains available",
);

check(
  map.includes('emphasis?: "next-stop"'),
  "map marker contract supports next-stop emphasis",
);

check(
  map.includes('"tracking-map-stop--next"'),
  "Mapbox marker updates next-stop emphasis without rebuilding the map",
);

check(
  css.includes(".tracking-map-stop--next .tracking-map-stop__pin"),
  "next stop has distinct visual styling",
);

console.log();
console.log("Selected route stops map checkpoint PASSED");
