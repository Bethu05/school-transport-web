import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function check(condition, description) {
  if (!condition) {
    throw new Error(`FAIL: ${description}`);
  }

  console.log(`✓ ${description}`);
}

const permissions = read("src/auth/frontend-permissions.ts");

const api = read("src/schools/schools.api.ts");

const page = read("src/schools/SchoolsPage.tsx");

const form = read("src/schools/SchoolFormDialog.tsx");

console.log("School edit frontend checkpoint");
console.log("-------------------------------");

check(
  permissions.includes('SCHOOLS_UPDATE: "schools.update"'),
  "schools.update frontend permission exists",
);

check(
  api.includes("export interface UpdateSchoolInput"),
  "Schools API defines update payload",
);

check(
  api.includes('method: "PATCH"') && api.includes("`/schools/${schoolId}`"),
  "Schools API PATCHes one school",
);

check(
  page.includes("FRONTEND_PERMISSIONS.SCHOOLS_UPDATE"),
  "School Edit visibility is permission based",
);

check(page.includes("updateSchool("), "Schools page calls updateSchool");

check(
  page.includes("setEditTarget(school)"),
  "existing school can be selected for editing",
);

check(
  form.includes('editing ? "Edit school" : "Add school"'),
  "school form supports create and edit modes",
);

check(form.includes('label="Short name"'), "short name is editable");

check(
  form.includes("Driver assignment is preserved") === false,
  "School form is independent from Driver editing",
);

check(!form.includes('label="Slug"'), "stable school slug is not editable");

check(
  form.includes('editing ? "Save changes"') ||
    form.includes('editing\n                ? "Save changes"'),
  "edit mode exposes Save changes",
);

console.log();
console.log("School edit frontend checkpoint PASSED");
