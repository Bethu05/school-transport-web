import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function check(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }

  console.log(`✓ ${message}`);
}

const api = read("src/trips/series/trip-series.api.ts");

const page = read("src/trips/series/TripSeriesPage.tsx");

const students = read("src/trips/series/TripSeriesStudentsDialog.tsx");

const app = read("src/App.tsx");

const shell = read("src/app/AppShell.tsx");

const permissions = read("src/auth/frontend-permissions.ts");

const presets = read("src/auth/dev-login-presets.ts");

console.log();
console.log("Recurring Trips frontend checkpoint");
console.log("-----------------------------------");

check(api.includes('"/trip-series"'), "Trip Series API wired");

check(api.includes("/students"), "Series Student API wired");

check(api.includes("/generate"), "Generate Trip API wired");

check(
  page.includes("activeSchool?.id"),
  "Recurring Trips is school-context aware",
);

check(page.includes("seatCapacity"), "Vehicle capacity is visible");

check(page.includes("Generate Trip"), "Generate Trip action rendered");

check(
  page.includes("scheduleTrip"),
  "generated draft can use normal scheduling lifecycle",
);

check(
  students.includes("Boarding stop"),
  "Student recurring booking includes stop selection",
);

check(
  app.includes('path="/school/:tenantSlug/:schoolSlug/trip-series"'),
  "canonical school Recurring Trips route exists",
);

check(
  shell.includes('label: "Recurring Trips"'),
  "Recurring Trips navigation exists",
);

check(
  shell.includes('item.path === "/trip-series"'),
  "Recurring Trips navigation follows school context",
);

check(
  permissions.includes('TRIPS_MANAGE_RIDERS: "trips.manage_riders"'),
  "manifest management uses effective rider permission",
);

check(
  presets.includes("VITE_DEV_STAFF_EMAIL"),
  "Staff / Chaperone development login preset exists",
);

console.log();
console.log("Recurring Trips frontend checkpoint PASSED");
