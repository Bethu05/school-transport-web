import { readFileSync } from "node:fs";

const panel = readFileSync("src/super-admin/TenantOnboardingPanel.tsx", "utf8");

function check(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`✓ ${message}`);
}

console.log("Platform onboarding five-phase checkpoint");
console.log("-----------------------------------------");

for (const label of [
  "Application & Verification",
  "Tenant & Commercial Setup",
  "Administrator & Data",
  "Launch Readiness",
  "Activation & Handover",
]) {
  check(panel.includes(`label: "${label}"`), `phase exists: ${label}`);
}

for (const key of [
  "application_registration",
  "approval_queue",
  "verification",
  "tenant_provisioning",
  "package_selection",
  "package_limits",
  "feature_exceptions",
  "trial_configuration",
  "account_setup",
  "data_migration",
  "launch_validation",
  "activation",
  "onboarding_summary",
]) {
  check(
    panel.includes(`"${key}"`),
    `operational canonical step retained internally: ${key}`,
  );
}

check(
  panel.includes("phases.map((phase, phaseIndex)") &&
    !panel.includes("activePhase.steps.map((step)"),
  "five phases form the only visible onboarding rail",
);

check(
  panel.includes("Phase ${activePhaseIndex + 1} of ${phases.length}"),
  "header reports phase progress rather than canonical step count",
);

check(
  panel.includes(".filter((step) => step.stepOrder <= 13)"),
  "production UI excludes Demo-only canonical records 14-15",
);

check(
  !panel.includes('"demo_data_reset"') &&
    !panel.includes('"demo_journey_simulation"'),
  "Demo-only backend records are not mapped into production-visible phases",
);

check(
  panel.includes("completionStepKeys") &&
    panel.includes("onboardingPhaseStatus"),
  "phase status derives from persisted canonical evidence",
);

check(
  panel.includes("previousPhase") &&
    panel.includes("nextPhase") &&
    panel.includes("Next phase"),
  "navigation moves between five visible phases",
);

if (process.exitCode) {
  console.error();
  console.error("FIVE-PHASE ONBOARDING CHECKPOINT FAILED");
  process.exit(process.exitCode);
}

console.log();
console.log("FIVE-PHASE ONBOARDING CHECKPOINT PASSED");
