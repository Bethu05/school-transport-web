import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  "src/dashboard/staff/passenger-actions.ts",
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { passengerActions } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);

const pickup = {
  assignmentType: "pickup",
  assignedTripStopId: "assigned",
  status: "waiting",
};
const dropoff = { ...pickup, assignmentType: "dropoff" };

assert.equal(passengerActions(pickup, "scheduled", "assigned").canBoard, false);
assert.equal(passengerActions(pickup, "boarding", "").boardEnabled, false);
assert.equal(passengerActions(pickup, "boarding", "other").boardEnabled, false);
assert.equal(passengerActions(pickup, "boarding", "assigned").boardEnabled, true);
assert.equal(passengerActions(pickup, "boarding", "").canMarkNoShow, true);
assert.equal(passengerActions(dropoff, "boarding", "other").boardEnabled, true);
assert.equal(passengerActions(dropoff, "boarding", "other").canMarkNoShow, false);
assert.equal(passengerActions({ ...dropoff, status: "boarded" }, "boarding", "assigned").canDropOff, false);
assert.equal(passengerActions({ ...dropoff, status: "boarded" }, "in_progress", "other").dropOffEnabled, false);
assert.equal(passengerActions({ ...dropoff, status: "boarded" }, "in_progress", "assigned").dropOffEnabled, true);
assert.equal(passengerActions({ ...pickup, status: "boarded" }, "in_progress", "other").dropOffEnabled, true);
assert.equal(passengerActions({ ...pickup, status: "dropped_off" }, "in_progress", "assigned").canDropOff, false);

console.log("Passenger action tests passed.");
