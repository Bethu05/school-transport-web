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

check(map.includes("from 'leaflet'"), "Leaflet map engine wired");

check(map.includes("openstreetmap.org"), "OpenStreetMap tile layer wired");

check(map.includes("fitBounds"), "map automatically fits multiple vehicles");

check(map.includes("map.setView"), "single vehicle receives focused map view");

check(map.includes("accuracyMeters"), "GPS accuracy overlay supported");

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
  guardian.includes("activeTripIds,"),
  "Guardian realtime effect tracks authorised trip dependency",
);

check(css.includes(".tracking-map-marker"), "live bus marker styling present");

console.log();
console.log("Tracking map frontend checkpoint PASSED");
