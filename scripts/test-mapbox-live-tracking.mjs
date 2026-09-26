import { readFileSync } from "node:fs";

const map = readFileSync("src/tracking/LiveTrackingMap.tsx", "utf8");

const css = readFileSync("src/tracking/live-tracking-map.css", "utf8");

function check(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`✓ ${message}`);
}

console.log("");
console.log("Mapbox Live Tracking checkpoint");
console.log("--------------------------------");

check(map.includes('from "mapbox-gl"'), "Live Tracking imports Mapbox GL JS");

check(
  map.includes("new MapboxMap({"),
  "Live Tracking constructs a real Mapbox Map",
);

check(!map.includes("maplibre-gl"), "Live Tracking no longer imports MapLibre");

check(
  map.includes('import "mapbox-gl/dist/mapbox-gl.css"'),
  "Mapbox CSS is bundled",
);

check(
  map.includes("VITE_MAPBOX_ACCESS_TOKEN"),
  "Mapbox token comes from Vite configuration",
);

check(map.includes("VITE_MAPBOX_STYLE"), "Mapbox style is configurable");

check(
  map.includes("mapbox://styles/mapbox/streets-v12"),
  "Mapbox Streets v12 is the migration default",
);

check(
  map.includes("accessToken: MAPBOX_ACCESS_TOKEN"),
  "Map constructor receives Mapbox access token",
);

check(
  map.includes("style: MAPBOX_STYLE"),
  "Map constructor receives configured Mapbox style",
);

check(
  map.includes("requestAnimationFrame"),
  "vehicle GPS movement remains smoothly animated",
);

check(
  map.includes("updateVehicleHeading"),
  "vehicle heading remains realtime-driven",
);

check(
  map.includes("new NavigationControl"),
  "map navigation controls remain enabled",
);

check(
  map.includes("tracking-planned-route"),
  "canonical road route source remains available",
);

check(
  map.includes("tracking-remaining-route"),
  "remaining-route source remains available",
);

check(
  map.includes("tracking-live-trails"),
  "GPS breadcrumb source remains available",
);

check(
  map.includes("tracking-live-connections"),
  "next-stop connector source remains available",
);

check(
  css.includes(".mapboxgl-ctrl-group"),
  "Mapbox control styling is present",
);

check(
  css.includes(".mapboxgl-popup-content"),
  "Mapbox popup styling is present",
);

check(!css.includes(".maplibregl-"), "MapLibre CSS selectors are removed");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("");
console.log("Mapbox Live Tracking checkpoint PASSED");
