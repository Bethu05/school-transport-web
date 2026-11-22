import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  "src/dashboard/staff/passenger-search.ts",
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { matchesPassengerSearch } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);

const passenger = {
  studentFirstName: "Jane",
  studentLastName: "Smith",
  studentExternalRef: "SCH-123",
};

assert.equal(matchesPassengerSearch(passenger, ""), true);
assert.equal(matchesPassengerSearch(passenger, "  jane   smith  "), true);
assert.equal(matchesPassengerSearch(passenger, "SMITH jane"), true);
assert.equal(matchesPassengerSearch(passenger, "sch-123"), true);
assert.equal(matchesPassengerSearch(passenger, "jane 123"), true);
assert.equal(matchesPassengerSearch(passenger, "jane other"), false);
assert.equal(matchesPassengerSearch({ ...passenger, studentExternalRef: null }, "123"), false);

console.log("Passenger search tests passed.");
