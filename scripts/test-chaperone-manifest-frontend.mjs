import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

console.log();
console.log("Chaperone manifest frontend checkpoint");
console.log("--------------------------------------");

const api = read("src/dashboard/staff/staff-passengers.api.ts");

const page = read("src/dashboard/staff/StaffDashboard.tsx");

const dashboard = read("src/dashboard/DashboardPage.tsx");

assert(
  api.includes('"/me/staff/trip/riders"'),
  "assigned Staff manifest API wired",
);

assert(
  api.includes('"/board"') || api.includes('"board"'),
  "boarding API wired",
);

assert(api.includes('"no-show"'), "no-show API wired");

assert(
  api.includes('"Idempotency-Key"'),
  "passenger mutations use idempotency keys",
);

assert(
  page.includes("assignedStopName"),
  "manifest grouped around assigned stops",
);

assert(page.includes("Boarded"), "Boarded action rendered");

assert(page.includes("Missed"), "Missed action rendered");

assert(
  page.includes('passenger.assignmentType === "pickup"'),
  "pickup register actions are direction-aware",
);

assert(page.includes("summary.boarded"), "boarded summary rendered");

assert(page.includes("summary.missed"), "missed summary rendered");

assert(
  dashboard.includes('case "staff":'),
  "staff role routed to dedicated dashboard",
);

assert(
  dashboard.includes("<StaffDashboard />"),
  "staff dashboard component mounted",
);

assert(
  !page.includes("TRIPS_MANAGE_RIDER_EVENTS"),
  "Staff UI does not depend on tenant-wide rider-event permission",
);

console.log();
console.log("Chaperone manifest frontend checkpoint PASSED");
