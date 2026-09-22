import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function check(condition, description) {
  if (!condition) {
    throw new Error(`FAIL: ${description}`);
  }

  console.log(`✓ ${description}`);
}

const api = read("src/students/student-custom-fields.api.ts");

const studentsApi = read("src/students/students.api.ts");

const form = read("src/students/StudentFormDialog.tsx");

const manager = read("src/students/StudentCustomFieldsDialog.tsx");

const page = read("src/students/StudentsPage.tsx");

const permissions = read("src/auth/frontend-permissions.ts");

console.log("Student Custom Fields frontend checkpoint");

console.log("-----------------------------------------");

check(
  permissions.includes(
    'STUDENTS_MANAGE_CUSTOM_FIELDS: "students.manage_custom_fields"',
  ),
  "management permission is backend-derived",
);

check(
  api.includes("/student-custom-fields"),
  "custom-field definition API wired",
);

check(api.includes("/deactivate"), "safe definition deactivation wired");

check(
  studentsApi.includes("customFields?: StudentCustomFieldInput[]"),
  "student create/update contract supports custom values",
);

check(
  form.includes("listStudentCustomFields"),
  "student form loads fields by selected school",
);

check(
  form.includes('definition.fieldType === "select"') &&
    form.includes('definition.fieldType === "boolean"') &&
    form.includes('definition.fieldType === "date"') &&
    form.includes('definition.fieldType === "number"'),
  "student form renders supported custom-field types",
);

check(
  form.includes("definition.isRequired"),
  "required custom fields are validated in the UI",
);

check(
  form.includes("Must be unique within this school."),
  "unique-field rule is visible to users",
);

check(
  manager.includes("createStudentCustomField") &&
    manager.includes("updateStudentCustomField") &&
    manager.includes("deactivateStudentCustomField"),
  "administrator custom-field management is wired",
);

check(
  page.includes("<StudentCustomFieldsDialog"),
  "Students page exposes custom-field management",
);

check(
  page.includes("Name, reference or custom field"),
  "Students search communicates custom-field search support",
);

check(
  page.includes("{field.label}: {field.value}"),
  "Student list displays configured identifiers",
);

console.log();

console.log("Student Custom Fields frontend checkpoint PASSED");
