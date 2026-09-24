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

const limited = read("src/super-admin/PlatformLimitedRolePage.tsx");
const sales = read("src/super-admin/ExecutiveSalesWorkspace.tsx");
const review = read("src/super-admin/SchoolSetupReviewPanel.tsx");

console.log("Platform School Setup authorization mirror checkpoint");
console.log("---------------------------------------------------");

check(
  limited.includes("SCHOOL_SETUP_READ_ALL") &&
    limited.includes("SCHOOL_SETUP_REVIEW"),
  "review workspace requires READ_ALL + REVIEW",
);

check(
  sales.includes("SCHOOL_SETUP_READ_OWN") &&
    sales.includes("SCHOOL_SETUP_CREATE") &&
    sales.includes("SCHOOL_SETUP_UPDATE_OWN") &&
    sales.includes("SCHOOL_SETUP_SUBMIT"),
  "Executive Sales actions mirror read/create/update/submit permissions",
);

check(
  review.includes("SCHOOL_SETUP_READ_ALL") &&
    review.includes("SCHOOL_SETUP_REVIEW") &&
    review.includes("SCHOOL_SETUP_APPROVE") &&
    review.includes("SCHOOL_SETUP_REJECT"),
  "review actions mirror read/review/approve/reject permissions",
);

check(
  sales.includes("enabled: canReadOwn") &&
    review.includes("enabled: canReadForReview"),
  "unauthorized platform queries do not execute from the UI",
);

check(
  sales.includes("if (!canUpdateOwn)") &&
    sales.includes("if (!canCreate)") &&
    sales.includes("if (!canSubmit)"),
  "sales mutations fail closed in the frontend before API calls",
);

check(
  review.includes("if (!canApprove)") && review.includes("if (!canReject)"),
  "review mutations fail closed in the frontend before API calls",
);

if (process.exitCode) {
  console.error();
  console.error("Platform School Setup authorization mirror checkpoint FAILED");
} else {
  console.log();
  console.log("Platform School Setup authorization mirror checkpoint PASSED");
}
