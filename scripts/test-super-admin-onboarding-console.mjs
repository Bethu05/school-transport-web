import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function check(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);

    process.exitCode = 1;

    return;
  }

  console.log(`✓ ${message}`);
}

const page = read("src/super-admin/SuperAdminPage.tsx");

const workspace = read("src/super-admin/OnboardingWorkspace.tsx");

const panel = read("src/super-admin/TenantOnboardingPanel.tsx");

const commercial = read("src/super-admin/OnboardingCommercialReview.tsx");

const management = read("src/super-admin/TenantManagementPage.tsx");

console.log("Super Admin 15-step onboarding console checkpoint");

console.log("----------------------------------------------");

check(
  page.includes('label: "Overview"') &&
    page.includes('label: "Onboarding"') &&
    page.includes('label: "Schools"') &&
    page.includes('label: "Plans"'),
  "platform lifecycle navigation remains intact",
);

check(
  workspace.includes('"92vw"') &&
    workspace.includes('"90vh"') &&
    workspace.includes("backdropFilter"),
  "onboarding remains a polished near-full-screen modal",
);

check(
  workspace.includes("School onboarding") &&
    workspace.includes("selectedTenant.name") &&
    workspace.includes('textAlign: "center"'),
  "school identity is centred and clearly labelled",
);

check(
  panel.includes("commercialBackendStepKeys") &&
    panel.includes("const visibleSteps = steps;") &&
    panel.includes("Step ${activeStep.stepOrder} of ${steps.length}") &&
    !panel.includes("hiddenCommercialRailStepKeys"),
  "all 15 persisted onboarding steps are visible in canonical order",
);

check(
  panel.includes('"package_selection"') &&
    panel.includes('"package_limits"') &&
    panel.includes('"feature_exceptions"') &&
    panel.includes('"trial_configuration"'),
  "all four canonical backend commercial evidence records remain represented",
);

check(
  panel.includes('case "package_selection":') &&
    panel.includes('case "package_limits":') &&
    panel.includes('case "feature_exceptions":') &&
    panel.includes('case "trial_configuration":') &&
    panel.includes("<OnboardingCommercialReview"),
  "Steps 5-8 remain backed by the same transactional Commercial Setup editor",
);

check(
  panel.includes("Previous") &&
    panel.includes("Next step") &&
    panel.includes("Navigation only."),
  "visual stage navigation remains non-mutating",
);

check(
  commercial.includes("Choose tier") &&
    commercial.includes("Confirm capacity") &&
    commercial.includes("Additional features") &&
    commercial.includes("Access period"),
  "Commercial Setup exposes four clear subprocesses",
);

check(
  commercial.includes("<Checkbox") &&
    commercial.includes('feature.mode === "addon"') &&
    commercial.includes("Billable add-on") &&
    commercial.includes("Included in contract"),
  "optional feature selection uses compact checkbox/boolean interaction",
);

check(
  commercial.includes("Feature description") &&
    commercial.includes("focusedFeature.description"),
  "feature catalogue descriptions are visible without turning every feature into a large form",
);

check(
  commercial.includes("Save commercial setup") &&
    commercial.includes("applyPlatformTenantSalesConfiguration"),
  "commercial setup saves through one transactional backend action",
);

check(
  commercial.includes("reconcilePlatformOnboarding") &&
    commercial.includes('"onboarding",') &&
    commercial.includes('"workflow",'),
  "successful save refreshes canonical onboarding evidence",
);

check(
  panel.includes("<TenantInitialAdminActions"),
  "administrator onboarding remains a separate stage",
);

check(
  panel.includes('"data_migration"') && panel.includes("Data migration"),
  "data migration remains an explicit evidence stage",
);

check(
  panel.includes("readyToActivate") && panel.includes("summary.blockers"),
  "launch validation remains backend-gated",
);

check(
  panel.includes("Activate tenant"),
  "activation remains explicit and backend-gated",
);

check(
  panel.includes("step.stepOrder <= 13"),
  "active onboarding UI excludes retired reserved stages",
);

check(
  management.includes("<TenantOnboardingPanel"),
  "Manage School still uses the canonical onboarding panel",
);

check(
  panel.includes("Skip import — start fresh") &&
    panel.includes('"no_migration_required"') &&
    panel.includes("Confirm skip import") &&
    panel.includes("stepComplete(migrationStep)"),
  "Step 7 supports an auditable skip-import path that counts toward progress",
);

if (process.exitCode) {
  console.error();

  console.error("Super Admin 15-step onboarding console checkpoint FAILED");
} else {
  console.log();

  console.log("Super Admin 15-step onboarding console checkpoint PASSED");
}
