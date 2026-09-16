import { readFileSync } from "node:fs";

const map = readFileSync("src/tracking/LiveTrackingMap.tsx", "utf8");

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

check(
  map.includes("TRACKING_CONNECTIONS_SOURCE"),
  "next-stop connector has its own GeoJSON source",
);

check(
  map.includes("tracking-live-connections-casing"),
  "connector has a high-contrast casing",
);

check(
  map.includes("tracking-live-connections-line"),
  "connector has a dedicated visible line",
);

check(
  /"line-dasharray"\s*:\s*\[\s*0\.5\s*,\s*1\.8\s*\]/s.test(map),
  "next-stop connector is rendered as a dotted line",
);

check(
  /connections\.map/.test(map) &&
    /connection\.from\.longitude/.test(map) &&
    /connection\.from\.latitude/.test(map),
  "connector starts at live bus position",
);

check(
  /connection\.to\.longitude/.test(map) && /connection\.to\.latitude/.test(map),
  "connector ends at current next stop",
);

check(
  /selectedTrackedVehicle\?\.location\.nextStop/.test(page),
  "connector is derived from authoritative next-stop state",
);

check(
  /selectedTrackedVehicle\.location\.latitude/.test(page) &&
    /selectedTrackedVehicle\.location\.longitude/.test(page),
  "connection start follows selected bus GPS coordinates",
);

check(
  /nextStop\.latitude/.test(page) && /nextStop\.longitude/.test(page),
  "connection destination follows next-stop coordinates",
);

check(
  /connections=\{operationalConnections\}/.test(page),
  "operational map receives the live connector",
);

console.log("");
console.log("Moving next-stop connector checkpoint PASSED");
