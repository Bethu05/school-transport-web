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

const api = read("src/trips/trips.api.ts");

const page = read("src/trips/TripsPage.tsx");

const dialog = read("src/trips/TripEditDialog.tsx");

console.log();
console.log("Trip draft workflow checkpoint");
console.log("------------------------------");

check(api.includes("routeId?: string;"), "trip updates accept routeId");

check(
  page.includes("class DraftSchedulingError"),
  "failed scheduling preserves draft context",
);

check(
  page.includes("setEditingTrip(\n                            error.draft"),
  "failed scheduling opens existing draft",
);

check(
  page.includes("'Drafts'") && page.includes("summary.drafts"),
  "Drafts have their own summary count",
);

const attentionStart = page.indexOf("function tripNeedsAttention");

const attentionEnd = page.indexOf("function tripCanBeEdited");

const attentionRule = page.slice(attentionStart, attentionEnd);

check(!attentionRule.includes("'draft'"), "draft alone is not Action required");

check(
  attentionRule.includes("!trip.vehicleId") &&
    attentionRule.includes("!trip.driverId"),
  "missing assignments still require attention",
);

check(
  dialog.includes("routes:") && dialog.includes("routeId:"),
  "edit dialog supports route selection",
);

check(
  dialog.includes("currentTrip.status ===\n        'draft'"),
  "route editing is limited to Draft",
);

check(
  dialog.includes("The service date cannot be in the past."),
  "past-date protection remains active",
);

console.log();
console.log("Trip draft workflow checkpoint PASSED");
