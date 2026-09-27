import { readFileSync } from "node:fs";

const source = readFileSync(
  "src/super-admin/PlanEditor.tsx",
  "utf8",
);

function check(condition, label) {
  if (!condition) {
    console.error(`✗ ${label}`);
    process.exitCode = 1;
    return;
  }

  console.log(`✓ ${label}`);
}

console.log("Platform Plans product workspace");
console.log("--------------------------------");

check(
  source.includes("<ToggleButtonGroup") &&
    source.includes("visiblePlans.map"),
  "plans use the top package selector",
);

check(
  !source.includes('label="Plan"'),
  "old plan dropdown is removed",
);

check(
  source.includes("PlanCapacityDefaultsEditor") &&
    source.includes('"Schools"') &&
    source.includes('"Students"') &&
    source.includes('"Buses"') &&
    source.includes('"Drivers"'),
  "package card exposes all capacities",
);

check(
  source.includes("Core") &&
    source.includes("Add-ons") &&
    source.includes("Future Releases"),
  "features are grouped into commercial sections",
);

check(
  source.includes('value="included"') &&
    source.includes('value="addon"') &&
    source.includes('value="unavailable"'),
  "feature control supports Core, Add-on and Off",
);

check(
  source.includes("safetyLocked") &&
    source.includes("feature.isSafetyBaseline"),
  "safety baseline remains locked",
);

check(
  source.includes('feature.releaseStage === "future"'),
  "future releases use backend roadmap metadata",
);

check(
  source.includes("setPlatformPlanFeature"),
  "feature controls persist through the platform API",
);

check(
  !source.includes("<TableContainer"),
  "old feature table has been removed",
);

if (process.exitCode) {
  console.error();
  console.error("Checkpoint 3 FAILED");
  process.exit(process.exitCode);
}

console.log();
console.log("Checkpoint 3 PASSED");
