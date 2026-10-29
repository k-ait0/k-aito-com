import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMPATIBILITY_PAIRS, getCompatibilityPair } from
  "../projects/kidp/life-design-lab/a05/compatibility.mjs";
import {
  EVIDENCE_CONTRACT_VERSION, EVIDENCE_SOURCE_STATUS,
  EVIDENCE_SOURCE_RECORDS, EVIDENCE_AXIS_REGISTER, EVIDENCE_DECISIONS,
  CLAIM_KINDS, reviewClaimPermission, reviewPairEvidence,
  inspectResearchCandidate
} from "../projects/kidp/life-design-lab/a05/compatibility-evidence.mjs";

test("C02 starts with zero verified literature and all human/release gates blocked", () => {
  assert.equal(EVIDENCE_CONTRACT_VERSION, "A05-COMPAT-C02-0.1.0-draft");
  assert.equal(EVIDENCE_SOURCE_STATUS, "NO_SOURCES_REVIEWED");
  assert.deepEqual(EVIDENCE_SOURCE_RECORDS, []);
  assert.ok(Object.isFrozen(EVIDENCE_SOURCE_RECORDS));
  assert.equal(EVIDENCE_DECISIONS.bAxisMode, "PENDING_HUMAN_DECISION");
  assert.equal(EVIDENCE_DECISIONS.original136WorkbookReconciliation, "NOT_DONE");
  assert.equal(EVIDENCE_DECISIONS.researchParticipantAuthorization, "BLOCKED_G1_PENDING");
  assert.equal(EVIDENCE_DECISIONS.researchOperationalAcceptance, "BLOCKED_D42_PENDING");
  assert.equal(EVIDENCE_DECISIONS.productionPublication, "BLOCKED");
});

test("C02 registers all five provisional axes; E is excluded and B is unresolved", () => {
  assert.deepEqual(EVIDENCE_AXIS_REGISTER.map(x => x.id), ["A", "B", "C", "D", "E"]);
  assert.deepEqual(EVIDENCE_AXIS_REGISTER.map(x => x.includedInC01PairLabels),
    [true, true, true, true, false]);
  for (const axis of EVIDENCE_AXIS_REGISTER) {
    assert.equal(axis.a05ConstructValidation, "NOT_ESTABLISHED");
    assert.equal(axis.literatureReview, "PENDING");
    assert.deepEqual(axis.sourceIds, []);
    assert.ok(Object.isFrozen(axis));
  }
  assert.match(EVIDENCE_AXIS_REGISTER[1].caveat, /B1\/B2\/B3/);
  assert.match(EVIDENCE_AXIS_REGISTER[4].caveat, /使用していません/);
});

test("C02 permits only non-predictive editorial labels and dialogue prompts in preview", () => {
  const allowed = [
    CLAIM_KINDS.DRAFT_LABEL_COMPARISON, CLAIM_KINDS.CONVERSATION_PROMPT
  ];
  for (const kind of Object.values(CLAIM_KINDS)) {
    const permission = reviewClaimPermission(kind, ["A", "B", "C", "D"]);
    assert.equal(permission.editorialPreviewAllowed, allowed.includes(kind), kind);
    assert.equal(permission.productionAllowed, false);
    assert.equal(permission.scientificSupportEstablished, false);
    assert.deepEqual(permission.sourceIds, []);
    assert.ok(Object.isFrozen(permission));
    assert.ok(Object.isFrozen(permission.cautions));
  }
  assert.match(reviewClaimPermission(CLAIM_KINDS.CONVERSATION_PROMPT, ["B"])
    .cautions.join(" "), /二極|両立/);
  assert.match(reviewClaimPermission(CLAIM_KINDS.DRAFT_LABEL_COMPARISON, ["E"])
    .cautions.join(" "), /使用していません/);
  assert.throws(() => reviewClaimPermission("SCIENTIFICALLY_PROVEN", []), TypeError);
  assert.throws(() => reviewClaimPermission(CLAIM_KINDS.CONVERSATION_PROMPT, ["Z"]), TypeError);
  assert.throws(() => reviewClaimPermission(CLAIM_KINDS.CONVERSATION_PROMPT, "B"), TypeError);
});

test("C02 evidence review covers all 136 unordered pairs without promotion", () => {
  assert.equal(COMPATIBILITY_PAIRS.length, 136);
  for (const pair of COMPATIBILITY_PAIRS) {
    const review = reviewPairEvidence(...pair.typeIds);
    assert.equal(review.pairId, pair.id);
    assert.equal(review.sourceCompatibilityVersion, "A05-COMPAT-C01-0.1.0-editorial");
    assert.equal(review.directA05PairValidation, false);
    assert.equal(review.generalLiteratureReviewed, false);
    assert.equal(review.productionAllowed, false);
    assert.equal(review.editorialPreviewAllowed, true);
    assert.equal(review.originalWorkbookReconciled, false);
    assert.deepEqual(review.sourceIds, []);
    assert.ok(Object.isFrozen(review));
    assert.ok(Object.isFrozen(review.sourceIds));
    assert.equal(getCompatibilityPair(...pair.typeIds).score, null);
    assert.equal(getCompatibilityPair(...pair.typeIds).rank, null);
  }
  assert.equal(reviewPairEvidence("T11", "T02").pairId, "T02-T11");
  assert.deepEqual(reviewPairEvidence("T02", "T11"), reviewPairEvidence("T11", "T02"));
  assert.throws(() => reviewPairEvidence("T00", "T01"), TypeError);
});

const synthetic = Object.freeze({
  id: "LIT-001", title: "SYNTHETIC TEST RECORD — NOT A STUDY",
  authors: "Synthetic", year: 2020, doi: "10.0000/SYNTHETIC-DO-NOT-CITE",
  url: null, studyDesign: "LONGITUDINAL", population: "synthetic test data",
  relationshipContext: "ROMANTIC", constructs: "synthetic values",
  effectEstimate: null, uncertainty: null,
  reportingNote: "未報告（架空の契約テスト）",
  limitations: "Not a real study", causalInterpretation: "ASSOCIATION_ONLY",
  reviewStatus: "UNREVIEWED", directA05PairValidation: false
});

test("C02 bibliographic intake is only structural; even complete rows cannot be published", () => {
  const result = inspectResearchCandidate(synthetic);
  assert.equal(result.structurallyComplete, true);
  assert.equal(result.scientificallyVerified, false);
  assert.equal(result.publishable, false);
  assert.deepEqual(result.issues, []);
  assert.ok(Object.isFrozen(result.issues));
});

test("C02 rejects missing references, effect-reporting gaps and forged approvals", () => {
  for (const bad of [
    null, [], {},
    { ...synthetic, doi: null, url: "http://example.invalid" },
    { ...synthetic, effectEstimate: null, reportingNote: "none" },
    { ...synthetic, reviewStatus: "APPROVED" },
    { ...synthetic, directA05PairValidation: true },
    { ...synthetic, causalInterpretation: "PROVEN_CAUSAL" },
    { ...synthetic, uncertainty: undefined },
    { ...synthetic, id: "A05-PAIR-PROVEN" }
  ]) {
    const result = inspectResearchCandidate(bad);
    assert.equal(result.structurallyComplete, false);
    assert.equal(result.scientificallyVerified, false);
    assert.equal(result.publishable, false);
    assert.ok(result.issues.length >= 1);
  }
});

test("C02 has no I/O, browser storage, telemetry or automatic scientific claim upgrade", () => {
  const source = readFileSync(new URL(
    "../projects/kidp/life-design-lab/a05/compatibility-evidence.mjs",
    import.meta.url), "utf8");
  for (const forbidden of [
    "localStorage", "sessionStorage", "indexedDB", "fetch(",
    "XMLHttpRequest", "sendBeacon", "navigator.", "document.",
    "writeFile", "createFile", "http://", "https://"
  ]) assert.equal(source.includes(forbidden), false, forbidden);
  assert.match(source, /scientificallyVerified: false/);
  assert.match(source, /publishable: false/);
});
