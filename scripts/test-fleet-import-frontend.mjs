import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const permissions = read("src/auth/frontend-permissions.ts");
const vehiclesApi = read("src/vehicles/vehicles.api.ts");
const driversApi = read("src/drivers/drivers.api.ts");
const vehiclesPage = read("src/vehicles/VehiclesPage.tsx");
const driversPage = read("src/drivers/DriversPage.tsx");
const vehicleDialog = read("src/vehicles/VehicleImportDialog.tsx");
const driverDialog = read("src/drivers/DriverImportDialog.tsx");

const checks = [
  [
    permissions.includes('VEHICLES_IMPORT: "vehicles.import"'),
    "frontend vehicles.import permission",
  ],
  [
    permissions.includes('DRIVERS_IMPORT: "drivers.import"'),
    "frontend drivers.import permission",
  ],
  [vehiclesApi.includes('"/vehicles/import"'), "Vehicle import API endpoint"],
  [driversApi.includes('"/drivers/import"'), "Driver import API endpoint"],
  [
    vehiclesPage.includes("FRONTEND_PERMISSIONS.VEHICLES_IMPORT"),
    "Vehicle import permission gate",
  ],
  [
    driversPage.includes("FRONTEND_PERMISSIONS.DRIVERS_IMPORT"),
    "Driver import permission gate",
  ],
  [
    vehicleDialog.includes("headers.includes(forbidden)") &&
      vehicleDialog.includes('"school_code"') &&
      vehicleDialog.includes('"tenant_code"'),
    "Vehicle tenant/school CSV boundary",
  ],
  [
    driverDialog.includes("headers.includes(forbidden)") &&
      driverDialog.includes('"school_code"') &&
      driverDialog.includes('"tenant_code"'),
    "Driver tenant/school CSV boundary",
  ],
  [
    driverDialog.includes("Login access is") &&
      driverDialog.includes("provisioned separately"),
    "Driver import keeps login provisioning separate",
  ],
  [
    vehicleDialog.includes("schoolId,") && driverDialog.includes("schoolId,"),
    "Selected school bound to both imports",
  ],
];

let failed = false;

for (const [passed, label] of checks) {
  if (passed) {
    console.log(`✓ ${label}`);
  } else {
    console.error(`✗ ${label}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log();
console.log("Vehicle + Driver CSV import frontend checkpoint PASSED");
