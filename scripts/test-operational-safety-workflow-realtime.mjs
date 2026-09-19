import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const realtime = readFileSync("src/tracking/tracking.realtime.ts", "utf8");

const api = readFileSync(
  "src/operational-safety/operational-safety.api.ts",
  "utf8",
);

const panel = readFileSync(
  "src/operational-safety/OperationalSafetyPanel.tsx",
  "utf8",
);

for (const eventName of [
  "operational.safety.driver_reason_recorded",
  "operational.safety.acknowledged",
  "operational.safety.assessment_updated",
  "operational.safety.closed",
]) {
  assert.ok(
    realtime.includes(eventName),
    `missing realtime contract: ${eventName}`,
  );

  assert.ok(
    panel.includes(eventName),
    `missing dashboard listener: ${eventName}`,
  );
}

for (const field of [
  "driverReason",
  "handlingStatus",
  "acknowledgedAt",
  "studentSafetyStatus",
  "teacherNote",
  "closedAt",
]) {
  assert.ok(api.includes(field), `missing safety API workflow field: ${field}`);
}

assert.ok(
  panel.includes('event.handlingStatus !== "closed"'),
  "dashboard attention count must use human handling status",
);

assert.ok(
  panel.includes("refreshHumanWorkflow"),
  "workflow events must refetch canonical API state",
);

assert.ok(
  panel.includes("Staff note:"),
  "full safety card must expose authorised staff note",
);

console.log("Operational safety workflow realtime frontend checkpoint PASSED");
