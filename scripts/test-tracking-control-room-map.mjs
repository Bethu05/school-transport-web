import { readFileSync } from "node:fs";

const map = readFileSync("src/tracking/LiveTrackingMap.tsx", "utf8");

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

const trackingState = readFileSync("src/tracking/tracking-state.ts", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

check(map.includes("GeoJSONSource"), "Mapbox uses dynamic GeoJSON sources");

check(
  map.includes("tracking-live-trails"),
  "GPS breadcrumb has a dedicated map layer",
);

check(
  map.includes("tracking-live-connections"),
  "next-stop connector has a dedicated map layer",
);

check(map.includes("followMarkerKey"), "map supports Follow Bus mode");

check(map.includes("onMarkerClickRef.current"), "bus markers are selectable");

check(
  /\.slice\(\s*-40\s*\)/s.test(trackingState),
  "GPS breadcrumb history is bounded",
);

check(
  page.includes("operationalTrails"),
  "operations page sends GPS history to the map",
);

check(
  !/const\s+operationalConnections\s*=/.test(page),
  "operations map avoids misleading straight bus-to-stop connector",
);

check(page.includes("Follow Bus"), "operator has a Follow Bus control");

check(
  page.includes("Stop Following"),
  "operator can release Follow Bus camera mode",
);

check(page.includes("setSelectedVehicleId("), "operator can select a vehicle");

check(
  page.includes('role="button"'),
  "vehicle cards remain keyboard-selectable",
);

console.log("");
console.log("Tracking control-room map checkpoint PASSED");
