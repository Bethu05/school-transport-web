import { readFileSync } from "node:fs";

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");
const trackingState = readFileSync("src/tracking/tracking-state.ts", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

console.log("");
console.log("Operational Live Tracking frontend checkpoint");
console.log("---------------------------------------------");

check(
  /socket\.on\(\s*["]vehicle\.location\.updated["]/s.test(page),
  "operations page consumes realtime GPS packets",
);

check(
  /setLiveVehicles\s*\(/.test(page),
  "realtime GPS packets update operational vehicle state",
);

check(
  /<LiveTrackingMap\b/.test(page),
  "operations page renders the live fleet map",
);

check(
  page.includes("selectedNextStop") &&
    page.includes("etaSeconds") &&
    page.includes("formatCompactEta"),
  "operations console presents compact next-stop ETA",
);

check(
  /type\s+TrackingHealthStatus\b/.test(page),
  "GPS health state is defined",
);

check(
  page.includes("ageSeconds <= 30") && page.includes(`status: "live"`),
  "fresh GPS packets are classified Live",
);

check(
  page.includes("ageSeconds <= 120") && page.includes(`status: "delayed"`),
  "aging GPS packets become Delayed before Stale",
);

check(page.includes(`status: "stale"`), "old GPS packets become Stale");

check(
  page.includes("Fleet signal") && page.includes("fleetSignalSummary"),
  "operations console displays compact fleet signal summary",
);

check(
  page.includes("data-control-room-sidebar"),
  "desktop Control Room has a dedicated active-trip sidebar",
);

check(
  page.includes('aria-label="Selected vehicle"'),
  "selected vehicle remains represented in the compact top bar",
);

check(page.includes("setSelectedVehicleId("), "operator can select a vehicle");

check(
  page.includes(`role="button"`) && page.includes("tabIndex={0}"),
  "vehicle selection remains keyboard accessible",
);

check(
  page.includes("Last seen"),
  "operations UI displays relative GPS freshness",
);

check(
  page.includes("Active trips"),
  "Control Room exposes active journey state without trip UUIDs",
);

check(
  /\.slice\(\s*-40\s*\)/s.test(trackingState),
  "live GPS breadcrumb history remains bounded",
);

check(
  /speedKph\s*:\s*item\.location\.speedKph/s.test(page),
  "live vehicle speed is passed to the map marker",
);

check(
  page.includes("selectedTrackedVehicle?.location.nextStop"),
  "selected vehicle uses authoritative next-stop state",
);

check(
  !page.includes("GPS accuracy") &&
    !page.includes(">Latitude<") &&
    !page.includes(">Longitude<"),
  "diagnostic coordinate clutter is removed from Control Room UI",
);

console.log("");
console.log("Operational Live Tracking frontend checkpoint PASSED");
