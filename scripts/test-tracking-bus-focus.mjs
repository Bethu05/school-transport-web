import { readFileSync } from "node:fs";

const map = readFileSync("src/tracking/LiveTrackingMap.tsx", "utf8");

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

// ------------------------------------------------------------
// Map contract
// ------------------------------------------------------------

check(
  /focusMarkerKey\?\s*:\s*string\s*\|\s*null/.test(map),
  "map exposes an explicit one-time focus target",
);

check(
  /lastFocusedMarkerKeyRef\s*=\s*useRef<\s*string\s*\|\s*null\s*>/.test(map),
  "map remembers the last explicitly focused vehicle",
);

check(
  /focusMarkerKey[\s\S]{0,160}!={1,2}[\s\S]{0,80}lastFocusedMarkerKeyRef\.current/.test(
    map,
  ),
  "selection focus is guarded against repeated GPS recentering",
);

check(
  /markerRefs\.current\.get\(\s*focusMarkerKey\s*\)/.test(map),
  "focus resolves the selected live marker",
);

check(
  /center\s*:\s*focusedMarker\.getLngLat\(\)[\s\S]{0,180}zoom\s*:\s*Math\.max\(\s*map\.getZoom\(\)\s*,\s*15\s*\)/.test(
    map,
  ),
  "selected bus is centred and zoomed",
);

// ------------------------------------------------------------
// Follow Bus must remain stronger than one-time focus.
// ------------------------------------------------------------

const followIndex = map.indexOf("if (followMarkerKey)");
const focusIndex = map.indexOf("ONE-TIME SELECTED BUS FOCUS");

check(
  followIndex !== -1 && focusIndex !== -1 && followIndex < focusIndex,
  "Follow Bus camera mode takes precedence over one-time focus",
);

check(
  /center\s*:\s*followedMarker\.getLngLat\(\)[\s\S]{0,180}zoom\s*:\s*Math\.max\(\s*map\.getZoom\(\)\s*,\s*15\s*\)/.test(
    map,
  ),
  "Follow Bus keeps the followed vehicle centred at operational zoom",
);

// ------------------------------------------------------------
// TrackingPage selection integration.
// ------------------------------------------------------------

check(
  /focusMarkerKey\s*=\s*\{\s*selectedVehicleId\s*\}/.test(page),
  "explicit vehicle selection is passed to the map focus target",
);

check(
  /function\s+selectTrackedVehicle\s*\(\s*vehicleId\s*:\s*string\s*\)/.test(
    page,
  ),
  "page centralises vehicle selection behavior",
);

check(
  /setFollowVehicleId\s*\(\s*\(\s*current\s*\)\s*=>[\s\S]{0,120}current\s*===\s*null\s*\?\s*null\s*:\s*vehicleId/.test(
    page,
  ),
  "active Follow Bus transfers to a newly selected vehicle",
);

check(
  /selectTrackedVehicle\(\s*markerKey\s*\)/.test(page),
  "clicking a map bus selects and focuses that vehicle",
);

const cardSelections =
  page.match(/selectTrackedVehicle\(\s*vehicle\.id\s*\)/g) ?? [];

check(
  cardSelections.length >= 2,
  "mouse and keyboard vehicle-card selection use the same focus behavior",
);

// Existing fleet-fit behavior must remain for initial load.
check(
  /map\.fitBounds\s*\(/.test(map),
  "initial fleet-fit behavior remains available",
);

console.log("");
console.log("Tracking bus focus checkpoint PASSED");
