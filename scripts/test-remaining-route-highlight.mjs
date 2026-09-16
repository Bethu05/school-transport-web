import { readFileSync } from "node:fs";

import { sliceRouteBetweenPoints } from "../src/tracking/route-segment.ts";

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

const map = readFileSync("src/tracking/LiveTrackingMap.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

// ============================================================
// REAL GEOMETRY BEHAVIOUR
// ============================================================

const route = [
  [36.8, -1.3],
  [36.81, -1.3],
  [36.81, -1.29],
  [36.82, -1.29],
];

const result = sliceRouteBetweenPoints(
  route,
  {
    longitude: 36.805,
    latitude: -1.3001,
  },
  {
    longitude: 36.815,
    latitude: -1.2899,
  },
);

check(result !== null, "remaining route can be sliced from canonical geometry");

check(
  result.length >= 4,
  "road bends are preserved between vehicle and next stop",
);

check(
  result.some(
    ([longitude, latitude]) =>
      Math.abs(longitude - 36.81) < 0.000001 &&
      Math.abs(latitude - -1.3) < 0.000001,
  ),
  "first canonical road corner is preserved",
);

check(
  result.some(
    ([longitude, latitude]) =>
      Math.abs(longitude - 36.81) < 0.000001 &&
      Math.abs(latitude - -1.29) < 0.000001,
  ),
  "second canonical road corner is preserved",
);

// ============================================================
// APPLICATION WIRING
// ============================================================

check(
  /sliceRouteBetweenPoints/.test(page),
  "operations page projects bus and stop onto canonical route",
);

check(
  /selectedTrackedVehicle\.location\.latitude/.test(page) &&
    /selectedTrackedVehicle\.location\.longitude/.test(page),
  "remaining route begins from realtime bus position",
);

check(
  /selectedTrackedVehicle\.location\.nextStop\.latitude/.test(page) &&
    /selectedTrackedVehicle\.location\.nextStop\.longitude/.test(page),
  "remaining route targets authoritative next stop",
);

check(
  /remainingRoute=\{remainingRouteHighlight\}/.test(page),
  "remaining road segment is supplied to LiveTrackingMap",
);

check(
  /tracking-remaining-route/.test(map),
  "remaining road segment has dedicated GeoJSON source",
);

check(
  /tracking-remaining-route-casing/.test(map),
  "remaining road segment has contrast casing",
);

check(
  /tracking-remaining-route-line/.test(map),
  "remaining road segment has dedicated visible line",
);

check(
  /remainingRouteSource\?\.setData/.test(map),
  "remaining road segment updates without rebuilding map",
);

check(
  /\[plannedRoute,\s*remainingRoute,\s*trails,\s*connections,\s*mapReady\]/s.test(
    map,
  ),
  "remaining road segment reacts to realtime position changes",
);

console.log("");
console.log("Road-following remaining-route checkpoint PASSED");
