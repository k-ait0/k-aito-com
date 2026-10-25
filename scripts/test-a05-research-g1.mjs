import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspectG1Readiness, G1_REQUIRED_IDS, G1_NONAUTHORIZATION } from "./a05-research-g1-gate.mjs";

const source = JSON.parse(readFileSync(
  new URL("../docs/A05_D38_G1_APPROVAL_REGISTER_20261026.json", import.meta.url), "utf8"
));
const clone = value => structuredClone(value);
const hypotheticalDecision = (record, index) => ({
  ...record,
  status: "DECIDED",
  decision: "Synthetic policy for structural testing " + index,
  evidenceRef: "test-only-review-record-" + index,
  approvedByRole: "test-only-role",
  approvedAt: "2000-01-01"
});

test("D-38 original twelve-decision register is PENDING and blocks all operations", () => {
  assert.equal(source.state, "DRAFT_NOT_APPROVED");
  assert.equal(source.operationalDecisions.length, 12);
  assert.deepEqual(source.operationalDecisions.map(x => x.id), G1_REQUIRED_IDS);
  assert.ok(source.operationalDecisions.every(x => x.status === "PENDING"));
  assert.equal(source.finalSignoff.state, "PENDING");
  assert.equal(source.dataCollected, false);
  assert.equal(source.interviewsConducted, 0);
  const verdict = inspectG1Readiness(source);
  assert.equal(verdict.state, G1_NONAUTHORIZATION);
  assert.equal(verdict.allDecisionsRecorded, false);
  assert.equal(verdict.manualReviewEligible, false);
  assert.equal(verdict.authorized, false);
  assert.equal(verdict.blockers.filter(x => x.includes("decision pending")).length, 12);
  assert.ok(verdict.blockers.includes("External human G1 sign-off pending"));
});

test("D-38 only mandatory human decisions can make a packet eligible for review", () => {
  const candidate = clone(source);
  candidate.operationalDecisions = candidate.operationalDecisions.map(hypotheticalDecision);
  const verdict = inspectG1Readiness(candidate);
  assert.equal(verdict.allDecisionsRecorded, true);
  assert.equal(verdict.manualReviewEligible, true);
  assert.equal(verdict.authorized, false);
  assert.equal(verdict.state, G1_NONAUTHORIZATION);
  assert.deepEqual(verdict.blockers, ["External human G1 sign-off pending"]);
  assert.equal(source.operationalDecisions[0].status, "PENDING",
    "original tracked register must remain unchanged");
});

test("D-38 absent evidence or responsible role prevents even manual-review readiness", () => {
  const candidate = clone(source);
  candidate.operationalDecisions = candidate.operationalDecisions.map(hypotheticalDecision);
  candidate.operationalDecisions[3].evidenceRef = null;
  candidate.operationalDecisions[5].approvedByRole = "";
  const verdict = inspectG1Readiness(candidate);
  assert.equal(verdict.allDecisionsRecorded, false);
  assert.equal(verdict.manualReviewEligible, false);
  assert.ok(verdict.blockers.some(x => x.includes("G1-04")));
  assert.ok(verdict.blockers.some(x => x.includes("G1-06")));
});

test("D-38 rejects missing or duplicate decision IDs", () => {
  const missing = clone(source);
  missing.operationalDecisions.pop();
  assert.equal(inspectG1Readiness(missing).authorized, false);
  assert.ok(inspectG1Readiness(missing).blockers.some(x => x.includes("G1-12")));

  const duplicated = clone(source);
  duplicated.operationalDecisions[11].id = "G1-11";
  assert.ok(inspectG1Readiness(duplicated).blockers.some(x => x.includes("duplicate")));
});

test("D-38 forged approval state cannot turn audit helper into research permission", () => {
  const candidate = clone(source);
  candidate.operationalDecisions = candidate.operationalDecisions.map(hypotheticalDecision);
  candidate.state = "APPROVED";
  candidate.finalSignoff.state = "APPROVED";
  candidate.finalSignoff.approverRole = "test-only-role";
  candidate.finalSignoff.approvalRecordRef = "fake-record";
  const verdict = inspectG1Readiness(candidate);
  assert.equal(verdict.authorized, false);
  assert.equal(verdict.manualReviewEligible, false);
  assert.ok(verdict.blockers.some(x => x.includes("Unexpected G1 record state")));
  assert.ok(verdict.blockers.some(x => x.includes("not permitted")));
});

test("D-38 forbidden activities and no-participant boundary fail closed", () => {
  const candidate = clone(source);
  candidate.forbiddenUntilExplicitApproval =
    candidate.forbiddenUntilExplicitApproval.filter(x => x !== "response-storage");
  candidate.dataCollected = true;
  candidate.interviewsConducted = 1;
  const verdict = inspectG1Readiness(candidate);
  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.some(x => x.includes("Forbidden-activity boundary")));
  assert.ok(verdict.blockers.some(x => x.includes("actual participation")));
});

test("D-38 parser rejects invalid, future or nonexistent registers", () => {
  for (const malformed of [null, undefined, [], 3, false, "ready", {}]) {
    const verdict = inspectG1Readiness(malformed);
    assert.equal(verdict.authorized, false);
    assert.equal(verdict.manualReviewEligible, false);
    assert.ok(verdict.blockers.length > 0);
  }
  const incorrect = clone(source);
  incorrect.schema = "UNRELATED-1";
  assert.ok(inspectG1Readiness(incorrect).blockers.some(x => x.includes("schema")));
});
