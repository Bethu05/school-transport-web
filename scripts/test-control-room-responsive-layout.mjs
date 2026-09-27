import { readFileSync } from "node:fs";

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");
const map = readFileSync("src/tracking/LiveTrackingMap.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

console.log("");
console.log("Responsive Control Room checkpoint");
console.log("----------------------------------");

check(
  page.includes("data-control-room-workspace"),
  "Control Room has a dedicated viewport workspace",
);

check(
  page.includes("getBoundingClientRect().top") &&
    page.includes("window.innerHeight"),
  "workspace measures actual remaining viewport height",
);

check(
  page.includes(`lg: "258px minmax(0, 1fr)"`),
  "desktop fleet sidebar remains narrow",
);

check(
  page.includes(`lg: "56px minmax(0, 1fr)"`),
  "desktop signal bar remains compact",
);

check(
  page.includes("data-control-room-sidebar"),
  "desktop active-trip sidebar is present",
);

check(
  page.includes("data-control-room-topbar"),
  "desktop fleet signal bar is present",
);

check(
  page.includes("data-control-room-mobile-overlay"),
  "mobile map overlay is present",
);

check(
  page.includes(`xs: "none"`) && page.includes(`lg: "flex"`),
  "desktop operational panels collapse away on small screens",
);

check(
  page.includes(`height="100%"`),
  "map fills all remaining Control Room space",
);

check(
  map.includes("height?: number | string"),
  "map accepts responsive full-height sizing",
);

check(
  page.includes("activeTripSummaries"),
  "sidebar is driven by active operational trips",
);

check(
  page.includes("Awaiting GPS"),
  "active trips without first GPS remain visible",
);

check(
  page.includes("Follow Bus") && page.includes("Stop Following"),
  "follow controls remain available",
);

check(
  !page.includes("GPS accuracy") &&
    !page.includes(">Latitude<") &&
    !page.includes(">Longitude<"),
  "diagnostic clutter is absent from normal Control Room",
);

console.log("");
console.log("Responsive Control Room checkpoint PASSED");
