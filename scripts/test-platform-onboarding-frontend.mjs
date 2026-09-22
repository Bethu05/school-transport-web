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

console.log("Platform 15-step onboarding frontend checkpoint");

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
  panel.includes("15-step onboarding control centre") &&
    panel.includes("workflow.steps") &&
    panel.includes("step.stepOrder") &&
    panel.includes("step.stepName"),
  "all canonical backend steps are rendered from persisted workflow state",
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
    panel.includes("Record migration complete") &&
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
  panel.includes("step.stepOrder >= 14") &&
    panel.includes("Docker Demo tooling"),
  "Steps 14-15 remain visibly isolated as Docker Demo tooling",
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
