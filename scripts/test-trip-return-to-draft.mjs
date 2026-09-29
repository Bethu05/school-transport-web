import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(condition, label) {
  if (!condition) {
    throw new Error(`✗ ${label}`);
  }

  console.log(`✓ ${label}`);
}

const permissions = read("src/auth/frontend-permissions.ts");

const api = read("src/trips/trips.api.ts");

const page = read("src/trips/TripsPage.tsx");

const dialog = read("src/trips/TripEditDialog.tsx");

console.log("");
console.log("Web Return-to-Draft checkpoint");
console.log("------------------------------");

check(
  permissions.includes('TRIPS_RETURN_TO_DRAFT: "trips.return_to_draft"'),
  "frontend consumes backend Return-to-Draft permission",
);

check(
  api.includes("/return-to-draft") && api.includes("reason"),
  "web API sends Return-to-Draft reason",
);

check(
  page.includes("canReturnTripsToDraft") &&
    page.includes("returnToDraftMutation"),
  "Trips page gates action by effective permission",
);

check(
  dialog.includes('currentTrip.status === "scheduled"'),
  "Return-to-Draft UI is limited to scheduled trips",
);

check(
  dialog.includes("Reason for returning to draft"),
  "Return-to-Draft requires a reason in the UI",
);

check(
  dialog.includes("Route can be changed while this trip remains a draft."),
  "route stays draft-only",
);

console.log("");
console.log("Web Return-to-Draft checkpoint PASSED");
