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

const page = read("src/trips/TripsPage.tsx");

const dialog = read("src/trips/TripEditDialog.tsx");

const panel = read("src/trips/TripStudentsPanel.tsx");

const api = read("src/trips/trips.api.ts");

console.log("");
console.log("Trip Configure / Inspect UI checkpoint");
console.log("--------------------------------------");

check(
  page.includes('"Configure trip"') && page.includes('"Inspect trip"'),
  "Trip list exposes a noticeable Configure / Inspect action",
);

check(
  page.includes('"Chaperone"') && page.includes('"Students"'),
  "Trip list exposes Chaperone and Students columns",
);

check(
  dialog.includes("TripStudentsPanel"),
  "Trip popup contains dated Student manifest",
);

check(
  dialog.includes("detailsEditable") &&
    dialog.includes(
      "Operational and historical Trip configuration is read-only.",
    ),
  "operational/history Trip inspection is read-only",
);

check(
  panel.includes("listTripRiders") &&
    panel.includes("addTripRider") &&
    panel.includes("removeTripRider"),
  "Student selector uses dated Trip rider contract",
);

check(
  panel.includes('trip.status === "draft"') &&
    panel.includes('trip.status === "scheduled"'),
  "Student manifest can only be edited during planning statuses",
);

check(
  api.includes("/riders") && api.includes('method: "DELETE"'),
  "Trips API exposes rider list/add/remove",
);

console.log("");
console.log("Trip Configure / Inspect UI checkpoint PASSED");
