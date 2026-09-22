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

const api = read(
  "src/super-admin/platform.api.ts",
);

const editor = read(
  "src/super-admin/PlanEditor.tsx",
);

const featureLimits = read(
  "src/super-admin/TenantFeatureLimits.tsx",
);

console.log(
  "Plan capacity defaults + commercial reason checkpoint",
);
console.log(
  "------------------------------------------------------",
);

check(
  api.includes(
    "PlatformPlanCapacityDefaults",
  ) &&
    api.includes(
      "capacityDefaults: PlatformPlanCapacityDefaults",
    ),
  "plan detail exposes centrally configured capacity defaults",
);

check(
  api.includes(
    "setPlatformPlanCapacityDefaults",
  ) &&
    api.includes(
      "/capacity-defaults",
    ),
  "plan capacity default mutation is wired",
);

check(
  editor.includes(
    "PlanCapacityDefaultsEditor",
  ),
  "Plan Editor includes package capacity configuration",
);

check(
  editor.includes(
    'label: "Schools"',
  ) &&
    editor.includes(
      'label: "Students"',
    ) &&
    editor.includes(
      'label: "Buses"',
    ) &&
    editor.includes(
      'label: "Drivers"',
    ),
  "all four package capacity dimensions are editable",
);

check(
  editor.includes(
    "No package capacity defaults have been set yet",
  ),
  "unconfigured packages are shown explicitly rather than inventing defaults",
);

check(
  featureLimits.includes(
    'label="Commercial reason"',
  ) &&
    featureLimits.includes(
      "commercialReason.length < 3",
    ),
  "tenant feature exceptions require a commercial reason",
);

check(
  api.includes(
    "notes: string;",
  ),
  "frontend API contract requires feature exception reason",
);

console.log();
console.log(
  "Plan capacity defaults + commercial reason checkpoint PASSED",
);
