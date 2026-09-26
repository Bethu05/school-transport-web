import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

/**
 * Source-formatting must never affect behavioural source checks.
 *
 * Prettier is free to wrap JSX prose across multiple lines, so all
 * human-readable text assertions use normalized whitespace.
 */
function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

const permissions = read("src/auth/frontend-permissions.ts");
const api = read("src/guardians/guardians.api.ts");
const page = read("src/guardians/GuardiansPage.tsx");
const dialog = read("src/guardians/GuardianImportDialog.tsx");

const normalizedDialog = normalizeWhitespace(dialog);

const checks = [
  [
    permissions.includes('GUARDIANS_IMPORT: "guardians.import"'),
    "frontend guardians.import permission",
  ],

  [api.includes('"/guardians/import"'), "Guardian import API endpoint"],

  [page.includes("Import CSV"), "Guardians page Import CSV action"],

  [
    page.includes("FRONTEND_PERMISSIONS.GUARDIANS_IMPORT"),
    "Guardian import permission gate",
  ],

  [
    normalizedDialog.includes("The CSV cannot select another tenant."),
    "tenant-boundary UI message",
  ],

  [dialog.includes('headers.includes("tenant_code")'), "tenant_code rejection"],

  [dialog.includes('headers.includes("tenant_id")'), "tenant_id rejection"],

  [
    dialog.includes("importGuardians(tenantId"),
    "authenticated tenant used for import request",
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
console.log("Guardian CSV import frontend checkpoint PASSED");
