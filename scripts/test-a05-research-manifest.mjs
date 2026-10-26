import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QUESTIONS, QUESTION_SET_VERSION } from "../projects/kidp/life-design-lab/a05/questions.mjs";

// Research-only candidate bank, intentionally isolated from production
// scoring and browser storage. Run: node --test scripts/test-a05-research-manifest.mjs
const load = file => readFileSync(new URL("../docs/" + file, import.meta.url), "utf8");
const manifest = JSON.parse(load("A05_D35_INTERVIEW_CANDIDATES_20261026.json"));
const text31 = load("A05_D31_FULL_QUESTION_REVIEW_20261025.md");
const text33 = load("A05_D33_ITEM_AUDIT_AND_VALIDATION_PLAN_20261026.md");
const text34 = load("A05_D34_BLOCKER_REWRITE_COMPARISON_20261026.md");

function tableRows(markdown, pattern) {
  return new Map([...markdown.matchAll(pattern)].map(match => [match[1], match]));
}
const initial = tableRows(text31, /^\| ([A-E]0[1-6]) \| (.+?) \| (.+?) \| (通常|左右反転) \|$/gm);
const status = tableRows(text33, /^\| ([A-E]0[1-6]) \| (BLOCK|REVISE|TRIAL) \|/gm);
const rewriteTable = text34.split("## 2.")[1]?.split("## 3.")[0];
assert.ok(rewriteTable, "D-34 question rewrite table must exist");
const alternatives = tableRows(rewriteTable, /^\| (A04|A05|B02|C04|D03|E04|E05) \| (.+?) \| (.+?) \|$/gm);
const blockers = ["A04", "A05", "B02", "C04", "D03", "E04", "E05"];
function pair(text) {
  const out = text.split(/\s*／\s*/);
  assert.equal(out.length, 2, "must have exactly two choices: " + text);
  return out;
}

test("explicit unapproved research-only and privacy boundary", () => {
  assert.equal(manifest.schema, "A05-INTERVIEW-CANDIDATES-1");
  assert.equal(manifest.status, "RESEARCH_ONLY_UNAPPROVED");
  assert.equal(manifest.sourceVersion, QUESTION_SET_VERSION);
  assert.match(manifest.researchVersion, /^A05-R-/);
  for (const key of ["scoringAllowed", "productionUseAllowed", "storedAssessmentCompatible",
    "personalDataCollectionApproved", "autosaveAllowed"]) {
    assert.equal(manifest.policy[key], false, key + " must remain disabled");
  }
  assert.equal(manifest.policy.questionBankVersionIsUnchanged, true);
});

test("thirty exact production IDs preserve alternating A-E source order", () => {
  assert.equal(manifest.items.length, 30);
  assert.deepEqual(manifest.items.map(x => x.id), QUESTIONS.map(x => x.id));
  assert.deepEqual(manifest.items.map(x => x.sourcePosition),
    QUESTIONS.map((_, i) => i + 1));
  for (const q of QUESTIONS) {
    const entry = manifest.items.find(x => x.id === q.id);
    assert.equal(entry.axis, q.axis);
    assert.equal(entry.direction, q.direction);
    assert.equal(initial.get(q.id)?.[4], q.direction === 1 ? "通常" : "左右反転");
  }
});

test("D-33 statuses preserve exactly seven editorial blockers", () => {
  assert.equal(initial.size, 30);
  assert.equal(status.size, 30);
  assert.equal(alternatives.size, 7);
  assert.deepEqual(manifest.items.filter(x => x.editorialStatus === "BLOCK").map(x => x.id),
    QUESTIONS.filter(q => blockers.includes(q.id)).map(q => q.id));
  const counts = Object.fromEntries(["BLOCK", "REVISE", "TRIAL"].map(name =>
    [name, manifest.items.filter(x => x.editorialStatus === name).length]));
  assert.deepEqual(counts, { BLOCK: 7, REVISE: 13, TRIAL: 10 });
  for (const item of manifest.items) {
    assert.equal(item.editorialStatus, status.get(item.id)?.[2]);
  }
});

test("all 37 bipolar variants match their source documents", () => {
  let seen = 0;
  for (const item of manifest.items) {
    const expected = blockers.includes(item.id)
      ? [["A", alternatives.get(item.id)?.[2]], ["B", alternatives.get(item.id)?.[3]]]
      : [["D31", initial.get(item.id)?.[3]]];
    assert.equal(item.variants.length, expected.length, item.id);
    for (const [index, [code, label]] of expected.entries()) {
      const candidate = item.variants[index];
      assert.equal(candidate.code, code, item.id);
      assert.deepEqual([candidate.negative, candidate.positive], pair(label), item.id);
      const [negative, positive] = pair(label);
      assert.deepEqual([candidate.left, candidate.right],
        item.direction === 1 ? [negative, positive] : [positive, negative], item.id);
      for (const text of [candidate.negative, candidate.positive]) {
        assert.ok(typeof text === "string" && text.trim().length >= 3, item.id);
      }
      seen++;
    }
  }
  assert.equal(seen, 37);
});

test("concept-overlap links are valid without self references", () => {
  const ids = new Set(manifest.items.map(x => x.id));
  for (const item of manifest.items) {
    assert.ok(Array.isArray(item.overlaps), item.id);
    assert.equal(new Set(item.overlaps).size, item.overlaps.length, item.id);
    for (const related of item.overlaps) {
      assert.ok(ids.has(related) && related !== item.id,
        item.id + " overlap must reference another known question");
    }
  }
  assert.ok(manifest.items.find(x => x.id === "E05").overlaps.includes("E04"));
  assert.ok(manifest.items.find(x => x.id === "A04").overlaps.includes("D04"));
});

test("E05 independent option is research-only and cannot become bipolar score", () => {
  const alternate = manifest.responseFormat.E05IndependentResearchOnly;
  assert.equal(alternate.code, "C");
  assert.equal(alternate.scoringAllowed, false);
  assert.deepEqual(alternate.questions.map(x => x.id), ["E05-M", "E05-T"]);
  assert.deepEqual(alternate.questions.map(x => x.domain), ["money", "time"]);
  assert.deepEqual(alternate.choices, [1, 2, 3, 4, 5, 6, 7]);
  const e05 = manifest.items.find(x => x.id === "E05");
  assert.deepEqual(e05.variants.map(x => x.code), ["A", "B"]);
  for (const variant of e05.variants) {
    assert.doesNotMatch(variant.negative + variant.positive, /3万円|3時間/);
  }
});

test("interview metadata does not imply completed human research", () => {
  assert.equal(manifest.interview.consentRequired, true);
  assert.equal(manifest.interview.proposedParticipantsMin, 8);
  assert.equal(manifest.interview.proposedParticipantsMax, 12);
  assert.match(manifest.interview.allowedReporting, /opt-in/);
  assert.deepEqual(manifest.responseFormat.bipolar.choices, [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(manifest.responseFormat.bipolar.neutral, 4);
  assert.equal(manifest.responseFormat.bipolar.notApplicable, null);
});
