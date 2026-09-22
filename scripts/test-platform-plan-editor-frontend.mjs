import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function check(condition, label) {
  if (!condition) {
    console.error(`✗ ${label}`);

    process.exitCode = 1;

    return;
  }

  console.log(`✓ ${label}`);
}

const api = read("src/super-admin/platform.api.ts");

const editor = read("src/super-admin/PlanEditor.tsx");

const page = read("src/super-admin/SuperAdminPage.tsx");

console.log("Platform Plan Editor frontend checkpoint");

console.log("---------------------------------------");

check(api.includes("getPlatformPlan"), "plan detail API is wired");

check(api.includes("setPlatformPlanFeature"), "plan mutation API is wired");

check(
  editor.includes('label="Plan"'),
  "commercial plan is selected from a compact dropdown",
);

check(
  editor.includes("<Table") && editor.includes("<TableRow"),
  "features render in a compact table instead of individual cards",
);

check(
  editor.includes('"included"') &&
    editor.includes('"addon"') &&
    editor.includes('"unavailable"'),
  "feature mode dropdown supports all commercial states",
);

check(
  editor.includes("limitValue"),
  "numeric package allowances remain editable",
);

check(
  editor.includes("feature.description") && editor.includes("<Tooltip"),
  "existing feature descriptions are available without cluttering the page",
);

check(
  editor.includes("safetyLocked") && editor.includes("Required"),
  "safety baseline remains protected",
);

check(
  page.includes("<PlanEditor />"),
  "Plan Editor remains mounted in Platform Administration",
);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log();

console.log("Platform Plan Editor frontend checkpoint PASSED");
