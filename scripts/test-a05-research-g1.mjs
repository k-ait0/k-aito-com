import test from "node:test";
import { proposeRetentionDeadlines, RETENTION_PROPOSAL_STATE } from "./a05-research-retention-proposal.mjs";
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

const options = JSON.parse(readFileSync(
  new URL("../docs/A05_D39_G1_DECISION_OPTIONS_20261026.json", import.meta.url), "utf8"
));

test("D-39 decisions remain proposals; all twelve source G1 decisions remain pending", () => {
  assert.equal(options.schema, "A05-D39-G1-DECISION-OPTIONS-1");
  assert.equal(options.status, "PROPOSALS_ONLY_ALL_G1_PENDING");
  assert.equal(options.decisionCount, 8);
  assert.equal(options.decisions.length, 8);
  assert.equal(new Set(options.decisions.map(x => x.id)).size, 8);
  assert.ok(options.decisions.every(x => x.decisionStatus === "PROPOSED_NOT_DECIDED"));
  assert.ok(options.decisions.every(x => x.selectedByAuthority === null &&
    x.approvalEvidence === null));
  assert.ok(source.operationalDecisions.every(x => x.status === "PENDING"));
  assert.equal(source.finalSignoff.state, "PENDING");
  assert.equal(inspectG1Readiness(source).authorized, false);
  for (const id of options.decisions.map(x => x.id)) {
    assert.ok(source.operationalDecisions.some(x => x.id === id), id);
  }
});

test("D-39 two alternatives exist for each priority topic without fabricated signoff", () => {
  for (const item of options.decisions) {
    assert.deepEqual(item.options.map(x => x.code), ["A", "B"], item.id);
    assert.equal(item.preferredOption, "A", item.id);
    assert.ok(item.recommendation.length > 12, item.id);
    assert.ok(item.options.every(x => x.advantages.length > 0 && x.risks.length > 0));
    assert.ok(item.decisionRequired.length >= 4);
  }
  const covered = [...options.decisions.map(x => x.id), ...options.unresolvedOtherG1Ids].sort();
  assert.deepEqual(covered, G1_REQUIRED_IDS.slice().sort());
  assert.equal(options.interviewRecruitmentAuthorized, false);
  assert.equal(options.responseCollectionAuthorized, false);
  assert.equal(options.publicationAuthorized, false);
});

test("D-39 proposed deletion windows require session-date anchors and remain unapproved", () => {
  assert.equal(options.retentionProposals.anchor, "participant-session-date");
  assert.equal(options.retentionProposals.notApproved, true);
  assert.deepEqual(options.retentionProposals.records.map(x => x.limitDays), [14, 30, 90]);
  assert.ok(options.retentionProposals.records.every(x =>
    x.dependsOn === "session-date" && x.approvalRequired === true));
  assert.equal(options.retentionProposals.audioVideoDefault, "DO_NOT_COLLECT");
  assert.equal(proposeRetentionDeadlines("2026-10-26").state, RETENTION_PROPOSAL_STATE);
  const dates = proposeRetentionDeadlines("2026-10-26");
  assert.deepEqual(dates.deadlines, {
    contact: "2026-11-09",
    pseudonymLink: "2026-11-25",
    rawNotes: "2027-01-24"
  });
  assert.equal(dates.authorized, false);
  assert.equal(dates.storageOrDeletionPerformed, false);
  assert.equal(dates.withdrawalMatchingPossibleAfterLinkDeadline, false);
});

test("D-39 uses calendar-day arithmetic including leap year and rejects invalid dates", () => {
  const leap = proposeRetentionDeadlines("2028-02-28");
  assert.deepEqual(leap.deadlines, {
    contact: "2028-03-13",
    pseudonymLink: "2028-03-29",
    rawNotes: "2028-05-28"
  });
  for (const invalid of ["2026-02-29", "2026-13-01", "2026-00-01",
    "2026-02-30", "2026-1-1", "", 42, null]) {
    assert.throws(() => proposeRetentionDeadlines(invalid), /Expected date-only|Invalid calendar date/, String(invalid));
  }
});
