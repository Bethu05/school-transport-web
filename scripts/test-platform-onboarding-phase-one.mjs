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

console.log("Onboarding Phase 1 presentation checkpoint");
console.log("------------------------------------------");

check(
  panel.includes('activePhase.key === "application_verification"'),
  "Phase 1 has a consolidated application workspace",
);

check(
  panel.includes("Application review") &&
    panel.includes("Application status") &&
    panel.includes("Verification status"),
  "application summary is compact and presentation-oriented",
);

check(
  panel.includes('label="Verification notes / rejection reason"') &&
    panel.includes("minRows={3}"),
  "verification notes use a compact review control",
);

check(
  panel.includes("Approve school") && panel.includes("Reject application"),
  "approval decision remains explicit",
);

check(
  panel.includes('activePhase.key !== "application_verification"'),
  "raw reconciliation controls are removed from Phase 1",
);

check(
  panel.includes('activePhase.key !== "application_verification" &&'),
  "canonical step evidence is hidden from the Phase 1 presentation",
);

if (process.exitCode) {
  console.error();
  console.error("PHASE 1 PRESENTATION CHECKPOINT FAILED");
  process.exit(process.exitCode);
}

console.log();
console.log("PHASE 1 PRESENTATION CHECKPOINT PASSED");
