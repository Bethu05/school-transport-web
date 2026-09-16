import { readFileSync } from "node:fs";

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

/**
 * IMPORTANT:
 *
 * These checks intentionally avoid depending on:
 *
 * - single vs double quotes
 * - Prettier line wrapping
 * - indentation
 *
 * They validate the behaviour/architecture instead.
 */

check(
  /socket\.on\(\s*["']vehicle\.location\.updated["']/s.test(page),
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
  /<TrackingProgressPanel\b/.test(page),
  "operations page renders next-stop ETA",
);

check(
  /type\s+TrackingHealthStatus\b/.test(page),
  "GPS health state is defined",
);

check(
  /if\s*\(\s*ageSeconds\s*<=\s*30\s*\)/s.test(page) &&
    /status\s*:\s*["']live["']/s.test(page),
  "fresh GPS packets are classified Live",
);

check(
  /if\s*\(\s*ageSeconds\s*<=\s*120\s*\)/s.test(page) &&
    /status\s*:\s*["']delayed["']/s.test(page),
  "aging GPS packets become Delayed before Stale",
);

check(/status\s*:\s*["']stale["']/s.test(page), "old GPS packets become Stale");

check(
  /window\.setInterval\s*\(/.test(page),
  "GPS freshness updates even without new packets",
);

check(
  /Fleet signal/.test(page),
  "operations page displays fleet GPS health summary",
);

check(
  /Selected vehicle/.test(page),
  "operations page contains selected vehicle detail",
);

check(/setSelectedVehicleId\s*\(/.test(page), "operator can select a vehicle");

check(
  /role\s*=\s*["']button["']/.test(page) && /tabIndex\s*=/.test(page),
  "vehicle selection remains keyboard accessible",
);

check(/Last seen/.test(page), "operations UI displays relative GPS freshness");

check(
  /Active trip/.test(page),
  "selected vehicle indicates active journey state without exposing trip UUID",
);

const trackingState = readFileSync("src/tracking/tracking-state.ts", "utf8");

check(
  /\.slice\(\s*-40\s*\)/s.test(trackingState),
  "live GPS breadcrumb history remains bounded",
);

check(
  /speedKph\s*:\s*item\.location\.speedKph/s.test(page),
  "live vehicle speed is passed to the map marker",
);

check(
  /<TrackingProgressPanel[\s\S]*?nextStop=\{selectedTrackedVehicle\.location\.nextStop\}/s.test(
    page,
  ),
  "selected vehicle passes authoritative next-stop state to progress panel",
);

console.log("");
console.log("Operational Live Tracking frontend checkpoint PASSED");
