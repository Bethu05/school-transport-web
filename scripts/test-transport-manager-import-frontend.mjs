import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const permissions = read("src/auth/frontend-permissions.ts");

const api = read("src/users/users.api.ts");

const page = read("src/users/UsersAccessPage.tsx");

const dialog = read("src/users/TransportManagerImportDialog.tsx");

const checks = [
  [
    permissions.includes("USERS_IMPORT_TRANSPORT_MANAGERS:") &&
      permissions.includes('"users.import_transport_managers"'),
    "frontend Transport Manager import permission",
  ],

  [
    api.includes('"/users/import/transport-managers"'),
    "Transport Manager import API endpoint",
  ],

  [page.includes("Import Transport Managers"), "Users & Access import action"],

  [
    page.includes("FRONTEND_PERMISSIONS.USERS_IMPORT_TRANSPORT_MANAGERS"),
    "Transport Manager import permission gate",
  ],

  [dialog.includes('headers.includes("tenant_code")'), "tenant_code rejected"],

  [dialog.includes('headers.includes("tenant_id")'), "tenant_id rejected"],

  [
    dialog.includes("temporaryPassword"),
    "one-time temporary password result displayed",
  ],

  [
    dialog.includes("importTransportManagers("),
    "Transport Manager import request wired",
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

console.log("Transport Manager CSV import frontend checkpoint PASSED");
