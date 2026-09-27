import { readFileSync } from "node:fs";

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

console.log("");
console.log("Control Room Live Fleet Map entitlement checkpoint");
console.log("--------------------------------------------------");

check(
  /const\s*\{[^}]*features[^}]*\}\s*=\s*useAuth\(\)/s.test(page),
  "Control Room consumes effective tenant features",
);

check(
  page.includes(`feature.key === "control_room.live_map"`),
  "premium map uses stable commercial feature key",
);

check(
  page.includes("feature.enabled"),
  "effective backend entitlement controls map availability",
);

check(
  page.includes("const liveFleetMapEnabled = features.some("),
  "Live Fleet Map entitlement is resolved once",
);

check(
  /liveFleetMapEnabled\s*\?\s*\([\s\S]*?<LiveTrackingMap/.test(page),
  "LiveTrackingMap mounts only when entitlement is enabled",
);

check(
  page.includes("data-control-room-live-map-locked"),
  "map-disabled Control Room has an explicit non-map state",
);

check(
  page.includes("Live trips, GPS health, journey progress, next stops"),
  "map-disabled state preserves smart transport operations messaging",
);

check(
  !/enabled:\s*Boolean\([^\n]*liveFleetMapEnabled/.test(page),
  "commercial map entitlement does not disable operational data queries",
);

const followControlCount =
  page.match(/data-control-room-follow-bus/g)?.length ?? 0;

check(
  followControlCount === 2,
  "desktop and mobile Follow Bus controls remain defined",
);

check(
  (
    page.match(
      /liveFleetMapEnabled\s*\?\s*\(\s*<Button\s+data-control-room-follow-bus/g,
    ) ?? []
  ).length === 2,
  "desktop and mobile Follow Bus controls require Live Fleet Map entitlement",
);

check(
  /if\s*\(\s*!liveFleetMapEnabled\s*\)[\s\S]*?setFollowVehicleId\(null\)/.test(
    page,
  ),
  "removing Live Fleet Map entitlement releases Follow Bus state",
);

check(
  page.includes("Optional Live Map feature") &&
    page.includes("Smart operations remain active"),
  "map-disabled Control Room presents Live Fleet Map as an optional feature",
);

console.log("");
console.log("Control Room Live Fleet Map entitlement checkpoint PASSED");
