import { readFileSync } from "node:fs";

const map = readFileSync("src/tracking/LiveTrackingMap.tsx", "utf8");

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

console.log("");
console.log("Persistent Control Room map checkpoint");
console.log("--------------------------------------");

const containerIndex = map.indexOf("ref={containerRef}");

const emptyStateIndex = map.indexOf("data-tracking-map-empty-state");

check(containerIndex !== -1, "Mapbox container remains present");

check(emptyStateIndex !== -1, "empty state is rendered as an overlay");

check(
  containerIndex < emptyStateIndex,
  "Mapbox mounts before the empty-state overlay",
);

check(
  map.includes("markers.length === 0 && !plannedRoute"),
  "empty state still reacts to absence of operational map data",
);

check(map.includes("borderRadius: 0"), "actual map surface has square edges");

check(
  map.includes('borderRadius: "2px"'),
  "floating empty-state panel uses only 2px rounding",
);

check(
  page.includes("data-control-room-workspace"),
  "Control Room workspace remains explicit",
);

check(
  page.includes("0 18px 46px rgba(15, 23, 42, 0.13)"),
  "desktop Control Room uses floating shadow treatment",
);

check(page.includes("lg: 1"), "desktop Control Room rounding is reduced");

console.log("");
console.log("Persistent Control Room map checkpoint PASSED");
