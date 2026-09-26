import { readFileSync } from "node:fs";

const api = readFileSync("src/dashboard/driver/driver-me.api.ts", "utf8");

const page = readFileSync("src/dashboard/driver/DriverDashboard.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }

  console.log(`PASS: ${message}`);
}

console.log("");
console.log("Driver Start Authorization frontend checkpoint");
console.log("----------------------------------------------");

check(
  api.includes("/me/driver/trip/start-authorization"),
  "Driver reads current start authorization",
);

check(
  api.includes("/me/driver/trip/start-authorization/request"),
  "Driver can request start authorization",
);

check(
  api.includes("ready_to_depart"),
  "Driver request supplies explicit reason code",
);

check(
  page.includes("getMyStartAuthorization"),
  "Driver dashboard loads authorization state",
);

check(
  page.includes("requestMyStartAuthorization"),
  "Driver dashboard requests authorization",
);

check(
  page.includes("refetchInterval: 3_000"),
  "Start authorization refreshes automatically",
);

check(
  page.includes("refetchInterval: 5_000"),
  "Driver assigned trip refreshes automatically",
);

check(
  page.includes('authorizationStatus !== "approved"'),
  "Direct trip start is blocked until approved",
);

check(
  page.includes("Start requested. Waiting for approval."),
  "Pending approval is visible to Driver",
);

check(
  page.includes("Start approved. You may now start the trip."),
  "Approved state is visible to Driver",
);

check(page.includes("Request start again"), "Rejected request can be retried");

console.log("");
console.log("Driver Start Authorization frontend checkpoint PASSED");
