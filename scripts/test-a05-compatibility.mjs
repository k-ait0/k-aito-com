import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TYPES, GROUPS, TYPE_VERSION, CONTENT_VERSION } from
  "../projects/kidp/life-design-lab/a05/types.mjs";
import { QUESTIONS, QUESTION_SET_VERSION } from
  "../projects/kidp/life-design-lab/a05/questions.mjs";
import { COMPATIBILITY_VERSION, SOURCE_TYPE_VERSION, SOURCE_CONTENT_VERSION,
  EVIDENCE_STATUS, COMPATIBILITY_PAIRS, COMPATIBILITY_AXES,
  getTypeAxisProfile, getCompatibilityPair } from
  "../projects/kidp/life-design-lab/a05/compatibility.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("C01 registry is exactly 136 unique unordered pairs, including 16 diagonals", () => {
  assert.equal(COMPATIBILITY_PAIRS.length, 136);
  assert.equal(new Set(COMPATIBILITY_PAIRS.map(p => p.id)).size, 136);
  assert.equal(COMPATIBILITY_PAIRS.filter(p => p.sameType).length, 16);
  assert.equal(COMPATIBILITY_PAIRS.filter(p => !p.sameType).length, 120);
  const expected = [];
  for (let i = 0; i < TYPES.length; i++)
    for (let j = i; j < TYPES.length; j++)
      expected.push(TYPES[i].id + "-" + TYPES[j].id);
  assert.deepEqual(COMPATIBILITY_PAIRS.map(p => p.id), expected);
});

test("C01 axes are exact type-registry directions, not inferred respondent values", () => {
  assert.deepEqual(COMPATIBILITY_AXES.map(a => a.id), ["A", "B", "C", "D"]);
  assert.deepEqual(getTypeAxisProfile("T01"), { A: -1, B: -1, C: -1, D: -1 });
  assert.deepEqual(getTypeAxisProfile("T02"), { A: -1, B: -1, C: -1, D: 1 });
  assert.deepEqual(getTypeAxisProfile("T05"), { A: -1, B: 1, C: -1, D: -1 });
  assert.deepEqual(getTypeAxisProfile("T09"), { A: 1, B: -1, C: -1, D: -1 });
  assert.deepEqual(getTypeAxisProfile("T16"), { A: 1, B: 1, C: 1, D: 1 });
  for (const pair of COMPATIBILITY_PAIRS) {
    assert.equal(pair.agreements.length + pair.differences.length, 4);
    assert.deepEqual([...pair.agreements.map(x => x.axis),
      ...pair.differences.map(x => x.axis)].sort(), ["A", "B", "C", "D"]);
    const a = getTypeAxisProfile(pair.typeIds[0]);
    const b = getTypeAxisProfile(pair.typeIds[1]);
    for (const match of pair.agreements) assert.equal(a[match.axis], b[match.axis]);
    for (const diff of pair.differences) assert.notEqual(a[diff.axis], b[diff.axis]);
  }
  assert.equal(getCompatibilityPair("T01", "T01").agreements.length, 4);
  assert.equal(getCompatibilityPair("T01", "T16").differences.length, 4);
  assert.equal(getCompatibilityPair("T02", "T11").agreements.length, 1);
  assert.equal(getCompatibilityPair("T02", "T11").agreements[0].axis, "B");
});

test("C01 pair lookup is symmetric and read-only", () => {
  for (const a of TYPES) for (const b of TYPES) {
    const pair = getCompatibilityPair(a.id, b.id);
    assert.equal(pair, getCompatibilityPair(b.id, a.id));
    assert.ok(Object.isFrozen(pair));
    assert.ok(Object.isFrozen(pair.typeIds));
    assert.ok(Object.isFrozen(pair.agreements));
    assert.ok(Object.isFrozen(pair.differences));
    assert.ok(Object.isFrozen(pair.evidence));
    assert.ok(Object.isFrozen(pair.conversationPrompts));
  }
  for (const invalid of [null, undefined, "", "T00", "T17", "t01", 1, {}, []])
    assert.throws(() => getCompatibilityPair("T01", invalid), TypeError);
});

test("C01 has no pair-specific scientific validation, compatibility scores or ranks", () => {
  assert.equal(EVIDENCE_STATUS, "NO_DIRECT_A05_PAIR_VALIDATION");
  for (const pair of COMPATIBILITY_PAIRS) {
    assert.equal(pair.evidence.directPairValidation, false);
    assert.equal(pair.evidence.status, EVIDENCE_STATUS);
    assert.equal(pair.evidence.researchReview, "PENDING");
    assert.deepEqual(pair.evidence.literatureIds, []);
    assert.equal(pair.interpretationKind, "EDITORIAL_RULE_BASED_HYPOTHESIS");
    assert.equal(pair.score, null);
    assert.equal(pair.rank, null);
    assert.equal("successProbability" in pair, false);
    assert.ok(pair.conversationPrompts.length >= 1);
    assert.ok(pair.conversationPrompts.length <= 3);
  }
  const bDiff = getCompatibilityPair("T01", "T05").differences;
  assert.equal(bDiff.length, 1);
  assert.equal(bDiff[0].axis, "B");
  assert.match(bDiff[0].constructCaution, /未検証/);
});

test("C01 pins draft source versions and leaves questionnaire/scoring untouched", () => {
  assert.equal(COMPATIBILITY_VERSION, "A05-COMPAT-C01-0.1.0-editorial");
  assert.equal(SOURCE_TYPE_VERSION, TYPE_VERSION);
  assert.equal(SOURCE_CONTENT_VERSION, CONTENT_VERSION);
  assert.equal(TYPE_VERSION, "A05-T-1.0.0-draft");
  assert.equal(CONTENT_VERSION, "A05-C-1.0.0-draft");
  assert.equal(QUESTION_SET_VERSION, "A05-Q-1.0.0-draft");
  assert.equal(QUESTIONS.length, 30);
  assert.equal(TYPES.length, 16);
  assert.equal(GROUPS.length, 4);
});

test("C01 preview is noindex and does not persist, transmit or ask survey questions", () => {
  const paths = [
    "projects/kidp/life-design-lab/a05/compatibility-preview.html",
    "projects/kidp/life-design-lab/a05/compatibility-preview.mjs",
    "projects/kidp/life-design-lab/a05/compatibility.mjs"
  ];
  const sources = paths.map(read);
  assert.match(sources[0], /name="robots" content="noindex,nofollow"/);
  assert.match(sources[0], /id="type-a"/);
  assert.match(sources[0], /id="type-b"/);
  assert.match(sources[0], /未承認/);
  for (const forbidden of [
    "localStorage", "sessionStorage", "indexedDB", "fetch(",
    "XMLHttpRequest", "sendBeacon", "navigator.serviceWorker",
    "innerHTML", "http://", "https://"
  ]) assert.equal(sources.some(s => s.includes(forbidden)), false, forbidden);
});
