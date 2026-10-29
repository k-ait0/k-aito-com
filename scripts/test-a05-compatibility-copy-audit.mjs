import test from "node:test";
import assert from "node:assert/strict";
import { TYPES } from "../projects/kidp/life-design-lab/a05/types.mjs";
import { COMPATIBILITY_PAIRS } from "../projects/kidp/life-design-lab/a05/compatibility.mjs";
import { EDITORIAL_PAIRS } from "../projects/kidp/life-design-lab/a05/compatibility-editorial.mjs";
import {
  COPY_AUDIT_VERSION, COPY_AUDIT_SUMMARY, COPY_REVIEW_QUEUE,
  COPY_REVIEW_STATES, inspectCopyText
} from "../projects/kidp/life-design-lab/a05/compatibility-copy-audit.mjs";

test("C05 audits every C01/C03 pair exactly once without changing the registry", () => {
  assert.equal(COPY_AUDIT_VERSION, "A05-COPY-C05-0.1.0-unapproved");
  assert.equal(COMPATIBILITY_PAIRS.length, 136);
  assert.equal(EDITORIAL_PAIRS.length, 136);
  assert.deepEqual(COPY_REVIEW_QUEUE.map(p => p.pairId),
    EDITORIAL_PAIRS.map(p => p.id));
  assert.equal(new Set(COPY_REVIEW_QUEUE.map(p => p.pairId)).size, 136);
  assert.equal(COPY_REVIEW_QUEUE.filter(x => x.typeIds[0] === x.typeIds[1]).length, 16);
  assert.equal(TYPES.length, 16);
});

test("C05 current editorial candidate text is automatically linted but never human approved", () => {
  assert.equal(COPY_AUDIT_SUMMARY.pairs, 136);
  assert.equal(COPY_AUDIT_SUMMARY.automatedFlaggedPairs, 0);
  assert.equal(COPY_AUDIT_SUMMARY.automatedClearPairs, 136);
  assert.equal(COPY_AUDIT_SUMMARY.copyTextsExamined,
    COPY_REVIEW_QUEUE.reduce((n, p) => n + p.copyTextsExamined, 0));
  assert.equal(COPY_AUDIT_SUMMARY.humanReviewedPairs, 0);
  assert.equal(COPY_AUDIT_SUMMARY.scientificValidatedPairs, 0);
  assert.equal(COPY_AUDIT_SUMMARY.publicationApprovedPairs, 0);
  assert.equal(COPY_AUDIT_SUMMARY.nativeNodeSuiteExecuted, false);
  assert.equal(COPY_AUDIT_SUMMARY.realBrowserSuiteExecuted, false);
  assert.equal(COPY_AUDIT_SUMMARY.productionPublication, "BLOCKED");
  for (const item of COPY_REVIEW_QUEUE) {
    assert.equal(item.automatedClear, true, item.pairId);
    assert.deepEqual(item.automatedFindings, []);
    assert.equal(item.humanReviewStatus, COPY_REVIEW_STATES.PENDING);
    assert.equal(item.humanReviewer, null);
    assert.equal(item.humanReviewedAt, null);
    assert.equal(item.researchClaimReviewed, false);
    assert.equal(item.BAxisStructureApproved, false);
    assert.equal(item.workbookV10Reconciled, false);
    assert.equal(item.nativeBrowserAccepted, false);
    assert.equal(item.scientificValidationEstablished, false);
    assert.equal(item.productionApproved, false);
    assert.ok(Object.isFrozen(item));
    assert.ok(Object.isFrozen(item.automatedFindings));
  }
});

test("C05 flags quantitative matches, bogus science, outcome predictions and essentialism", () => {
  const cases = [
    ["相性92点", "RATE_OR_SCORE"],
    ["80％一致します", "RATE_OR_SCORE"],
    ["恋愛成功率が高い", "RATE_OR_SCORE"],
    ["Sランク", "RATE_OR_SCORE"],
    ["最高の相性", "BEST_OR_WORST_MATCH"],
    ["相性が悪い", "BEST_OR_WORST_MATCH"],
    ["ベスト相性", "BEST_OR_WORST_MATCH"],
    ["必ず長続きする", "PREDICTED_RELATIONSHIP_OUTCOME"],
    ["結婚に向いている", "PREDICTED_RELATIONSHIP_OUTCOME"],
    ["科学的に証明された", "FAKE_RESEARCH_VALIDATION"],
    ["研究が実証した", "FAKE_RESEARCH_VALIDATION"],
    ["このタイプは必ず成功する", "UNJUSTIFIED_TYPE_ESSENTIALISM"]
  ];
  for (const [sample, expected] of cases) {
    const scanned = inspectCopyText(sample);
    assert.equal(scanned.automatedClear, false, sample);
    assert.ok(scanned.findings.includes(expected), sample);
    assert.equal(scanned.humanApproved, false);
    assert.equal(scanned.productionApproved, false);
    assert.ok(Object.isFrozen(scanned));
    assert.ok(Object.isFrozen(scanned.findings));
  }
  for (const value of [null, "", "  ", undefined, [], {}])
    assert.deepEqual(inspectCopyText(value).findings, ["EMPTY_COPY"]);
});

test("C05 non-predictive questions can pass automated lint without being approved", () => {
  const result = inspectCopyText("二人が大切にしたいことを、互いに確かめてみましょう。");
  assert.equal(result.automatedClear, true);
  assert.deepEqual(result.findings, []);
  assert.equal(result.humanApproved, false);
  assert.equal(result.productionApproved, false);
});
