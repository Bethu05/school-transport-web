import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function check(condition, description) {
  if (!condition) {
    console.error(`✗ ${description}`);

    process.exitCode = 1;

    return;
  }

  console.log(`✓ ${description}`);
}

const api = read("src/super-admin/platform.api.ts");

const panel = read("src/super-admin/TenantOnboardingPanel.tsx");

const management = read("src/super-admin/TenantManagementPage.tsx");

console.log("Platform five-phase onboarding frontend checkpoint");

console.log("-----------------------------------------------");

check(
  api.includes("PlatformOnboardingWorkflow") &&
    api.includes("PlatformOnboardingSummary"),
  "canonical onboarding workflow and summary are typed",
);

check(
  api.includes("/platform/onboarding/queue") &&
    api.includes("/platform/onboarding/tenants/${tenantId}"),
  "onboarding queue and tenant workflow reads are wired",
);

check(
  api.includes("/platform/onboarding/tenants/${tenantId}/summary"),
  "Super Admin launch-readiness summary is wired",
);

check(
  api.includes("/platform/onboarding/tenants/${tenantId}/approval") &&
    api.includes('method: "PUT"'),
  "school approval mutation is wired",
);

check(
  api.includes("/platform/onboarding/tenants/${tenantId}/reconcile") &&
    api.includes('method: "POST"'),
  "verified evidence reconciliation is wired",
);

check(
  api.includes("/steps/${stepKey}") &&
    api.includes("UpdatePlatformOnboardingStepInput"),
  "manual evidence step mutation is wired",
);

check(
  api.includes("/platform/onboarding/tenants/${tenantId}/activate") &&
    api.includes("activatePlatformOnboarding"),
  "Step 12 activation endpoint is wired",
);

check(
  panel.includes("workflow.steps") &&
    panel.includes("onboardingPhaseDefinitions") &&
    panel.includes("completionStepKeys") &&
    panel.includes("phases.map((phase, phaseIndex)") &&
    !panel.includes("activePhase.steps.map((step)"),
  "five visible phases remain driven by persisted canonical workflow evidence",
);

check(
  panel.includes("School verification & approval") &&
    panel.includes("Approve school") &&
    panel.includes("Reject application"),
  "approval and rejection controls are explicit",
);

check(
  panel.includes("Reconcile verified evidence"),
  "operator can explicitly reconcile verified evidence",
);

check(
  panel.includes('"data_migration"') &&
    panel.includes("Mark import complete") &&
    panel.includes("Confirm skip import") &&
    panel.includes("no_migration_required"),
  "Step 10 supports recorded migration evidence and valid no-migration cases",
);

check(
  panel.includes("readyToActivate") && panel.includes("Activate tenant"),
  "activation remains gated by backend readiness",
);

check(
  panel.includes("summary.blockers"),
  "remaining activation blockers are visible",
);

check(
  panel.includes("step.stepOrder <= 13"),
  "active onboarding UI excludes retired reserved stages",
);

check(
  !panel.includes("mark all complete") && !panel.includes("Mark all complete"),
  "UI does not provide a global onboarding bypass",
);

check(
  management.includes('title="Onboarding"') &&
    management.includes("<TenantOnboardingPanel") &&
    management.includes('"onboarding"'),
  "onboarding lives inside the existing Manage Tenant control centre",
);

if (process.exitCode) {
  console.error();

  console.error("Platform onboarding frontend checkpoint FAILED");
} else {
  console.log();

  console.log("Platform onboarding frontend checkpoint PASSED");
}
