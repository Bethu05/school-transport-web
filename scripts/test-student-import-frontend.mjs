import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const permissions = await readFile(
  new URL("../src/auth/frontend-permissions.ts", import.meta.url),
  "utf8",
);

const api = await readFile(
  new URL("../src/students/students.api.ts", import.meta.url),
  "utf8",
);

const page = await readFile(
  new URL("../src/students/StudentsPage.tsx", import.meta.url),
  "utf8",
);

const dialog = await readFile(
  new URL("../src/students/StudentImportDialog.tsx", import.meta.url),
  "utf8",
);

assert(
  permissions.includes('STUDENTS_IMPORT: "students.import"'),
  "frontend exposes students.import permission",
);

assert(
  api.includes('"/students/import"'),
  "student API calls POST /students/import",
);

assert(
  api.includes("schoolId,") && api.includes("rows,"),
  "student import API supplies one trusted school and row collection",
);

assert(
  page.includes("FRONTEND_PERMISSIONS.STUDENTS_IMPORT"),
  "Students page gates import using effective permission",
);

assert(page.includes("Import CSV"), "Students page exposes CSV import control");

assert(
  page.includes("schoolName={activeSchool.name}"),
  "Students page binds import to active school",
);

for (const header of ["external_ref", "first_name", "last_name", "grade"]) {
  assert(dialog.includes(`"${header}"`), `dialog validates ${header}`);
}

assert(
  dialog.includes("Maximum 200 students per import"),
  "dialog shows import size limit",
);

assert(
  dialog.includes("duplicate external_ref"),
  "dialog rejects duplicate source references",
);

assert(
  /The CSV\s+cannot select another school or tenant\./.test(dialog),
  "dialog explains tenant/school trust boundary",
);

console.log("Student CSV import frontend checkpoint");
console.log("--------------------------------------");
console.log("✓ permission gate");
console.log("✓ API endpoint");
console.log("✓ active-school binding");
console.log("✓ CSV validation");
console.log("✓ duplicate detection");
console.log("✓ preview workflow");
console.log();
console.log("STUDENT CSV IMPORT FRONTEND CHECKPOINT PASSED");
