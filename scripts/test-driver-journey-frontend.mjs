import { readFileSync } from "node:fs";

const api = readFileSync("src/dashboard/driver/driver-me.api.ts", "utf8");

const dashboard = readFileSync(
  "src/dashboard/driver/DriverDashboard.tsx",
  "utf8",
);

const progress = readFileSync(
  "src/dashboard/driver/DriverJourneyProgressCard.tsx",
  "utf8",
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

assert(
  api.includes("'/me/driver/trip/progress'"),
  "Driver uses relationship-scoped journey progress endpoint",
);

assert(
  !api.includes("'/trips/'"),
  "Driver self-service API does not use generic trip routes",
);

const functionStart = api.indexOf("export function getMyJourneyProgress");

const functionEnd = api.indexOf("\n}", functionStart);

const functionBlock = api.slice(functionStart, functionEnd);

assert(
  !functionBlock.includes("tripId:"),
  "Journey progress request does not accept a client trip ID",
);

assert(
  dashboard.includes("<DriverJourneyProgressCard"),
  "Driver Dashboard renders Journey Progress",
);

assert(
  dashboard.includes("'my-driver-journey-progress'"),
  "Driver lifecycle invalidates Journey Progress",
);

assert(
  progress.includes("progress.completedStops") &&
    progress.includes("progress.totalStops"),
  "Journey Progress shows completed and total stops",
);

assert(
  progress.includes("progress.currentStop"),
  "Journey Progress shows the current stop",
);

assert(
  progress.includes("progress.nextStop"),
  "Journey Progress shows the next stop",
);

assert(
  progress.includes("<LinearProgress"),
  "Journey Progress contains a visual progress bar",
);

assert(
  progress.includes("progress.stops.map"),
  "Journey Progress renders the ordered stop list",
);

assert(
  progress.includes("refetchInterval"),
  "Journey Progress has a polling fallback before realtime wiring",
);

console.log("");
console.log("Driver Journey frontend checkpoint PASSED");
