import { readFileSync } from "node:fs";

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

const panel = readFileSync("src/tracking/TrackingProgressPanel.tsx", "utf8");

const realtime = readFileSync("src/tracking/tracking.realtime.ts", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

check(
  /routeDistanceMeters\s*:\s*number\s*\|\s*null/.test(realtime),
  "realtime contract carries canonical route distance",
);

check(
  /etaDistanceMeters\s*:\s*number/.test(realtime),
  "realtime contract carries authoritative ETA distance",
);

check(
  /const\s+distance\s*=\s*nextStop\.etaDistanceMeters/.test(panel),
  "UI uses backend-selected distance",
);

check(
  /etaDistanceSource\s*===\s*["']route_geometry["']/.test(panel),
  "UI identifies road geometry distance",
);

check(/Road distance/.test(panel), "route distance is labelled Road distance");

check(
  /Direct fallback/.test(panel),
  "straight-line fallback is explicitly identified",
);

check(
  /Distance source:/.test(panel),
  "UI exposes distance source for diagnosis",
);

check(
  !/const\s+operationalConnections\s*=/.test(page),
  "Admin map no longer creates straight bus-to-stop line",
);

check(
  !/connections=\{operationalConnections\}/.test(page),
  "straight line is no longer passed to MapLibre",
);

check(
  /plannedRoute=\{canonicalPlannedRoute\}/.test(page),
  "canonical road geometry remains displayed",
);

check(
  /nextStop\.latitude/.test(page) && /nextStop\.longitude/.test(page),
  "next-stop marker remains visible",
);

console.log("");
console.log("Route-distance UI checkpoint PASSED");
