import { readFileSync } from "node:fs";

const api = readFileSync(
  "src/dashboard/staff/staff-start-authorization.api.ts",
  "utf8",
);

const page = readFileSync("src/dashboard/staff/StaffDashboard.tsx", "utf8");

function check(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("");
console.log("Chaperone Start Authorization frontend checkpoint");
console.log("-----------------------------------------------");

check(
  api.includes("/me/staff/trip/start-authorization"),
  "relationship-scoped lookup wired",
);

check(
  api.includes("/me/staff/trip/start-authorization/approve"),
  "approve endpoint wired",
);

check(
  api.includes("/me/staff/trip/start-authorization/reject"),
  "reject endpoint wired",
);

check(
  page.includes(`manifest?.staffRole === "chaperone"`),
  "authorization polling restricted to Chaperone",
);

check(
  page.includes(`manifest.staffRole === "chaperone"`),
  "approval UI restricted to Chaperone",
);

check(
  page.includes(`manifest.tripStatus === "boarding"`),
  "approval UI restricted to boarding",
);

check(
  page.includes("refetchInterval: 3_000"),
  "Driver request auto-refresh enabled",
);

check(page.includes("Approve start"), "Approve control rendered");

check(
  page.includes("Waiting for the Driver to request trip start approval."),
  "waiting state rendered",
);

console.log("");
console.log("Chaperone Start Authorization frontend checkpoint PASSED");
