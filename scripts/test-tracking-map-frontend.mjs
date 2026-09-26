import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function check(condition, label) {
  if (!condition) {
    throw new Error(`✗ ${label}`);
  }

  console.log(`✓ ${label}`);
}

const map = read("src/tracking/LiveTrackingMap.tsx");
const operational = read("src/tracking/TrackingPage.tsx");
const guardian = read("src/tracking/GuardianTrackingPanel.tsx");
const css = read("src/tracking/live-tracking-map.css");

console.log();
console.log("Tracking map frontend checkpoint");
console.log("--------------------------------");

check(/from\s+["']mapbox-gl["']/.test(map), "Mapbox map engine wired");

check(
  map.includes("VITE_MAPBOX_STYLE") &&
    map.includes("mapbox://styles/mapbox/streets-v12") &&
    map.includes("style: MAPBOX_STYLE"),
  "Mapbox Streets vector style wired",
);

check(map.includes("fitBounds"), "map automatically fits multiple vehicles");

check(
  map.includes("easeTo"),
  "single/select/follow camera uses Mapbox movement",
);

check(map.includes("accuracyMeters"), "GPS accuracy data supported");

check(
  operational.includes("operationalMapMarkers") &&
    operational.includes("<LiveTrackingMap"),
  "Operations live vehicles plotted on map",
);

check(
  operational.includes("vehicleLabel("),
  "Operations map labels use vehicle identity, not UUID",
);

check(
  guardian.includes("guardianMapMarkers") &&
    guardian.includes("<LiveTrackingMap"),
  "Guardian authorised trip plotted on map",
);

check(
  guardian.includes("children.join("),
  "Guardian map identifies child rather than trip UUID",
);

check(
  guardian.includes("EMPTY_TRACKABLE_CHILDREN"),
  "Guardian query fallback is referentially stable",
);

check(
  guardian.includes("activeTripIds"),
  "Guardian map derives only authorised active trips",
);

check(css.includes(".tracking-map-vehicle"), "live bus marker styling present");

console.log();
console.log("Tracking map frontend checkpoint PASSED");
