import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QUESTIONS, QUESTION_SET_VERSION } from "../projects/kidp/life-design-lab/a05/questions.mjs";
import { SCORING_VERSION } from "../projects/kidp/life-design-lab/a05/engine.mjs";
import { TYPES, TYPE_VERSION, CONTENT_VERSION } from "../projects/kidp/life-design-lab/a05/types.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const data = JSON.parse(read("docs/A05_D73_ITEM_CONSTRUCT_CROSSWALK_20261026.json"));
const d57 = read("docs/A05_D57_QUESTION_EDITORIAL_MATRIX_20261026.md");
const d59 = read("docs/A05_D59_ITEM_AND_TYPE_COPY_PROPOSAL_20261026.md");
const packet = read("docs/A05_D73_EDITORIAL_DECISION_PACKET_20261026.md");
const rows = text => [...text.matchAll(/^\|\s*([A-E]0[1-6])\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm)];
const base = new Map(rows(d57).map(m => [m[1], { status: m[2].trim(), pair: m[3].trim() }]));
const overrides = new Map(rows(d59).map(m => [m[1], m[2].trim()]));

test("D73 has exactly one review entry for each current question, without approval", () => {
  assert.equal(data.schema, "A05-D73-EDITORIAL-CROSSWALK-1");
  assert.equal(data.status, "RESEARCH_DESIGN_NOT_APPROVED");
  assert.equal(QUESTIONS.length, 30);
  assert.equal(data.items.length, 30);
  const ids = data.items.map(item => item.id);
  assert.deepEqual(ids, [...ids].sort());
  assert.deepEqual(ids, QUESTIONS.map(q => q.id).sort());
  assert.equal(new Set(ids).size, 30);
  assert.deepEqual(data.items.reduce((all, item) => {
    all[item.editorialStatus] = (all[item.editorialStatus] || 0) + 1;
    return all;
  }, {}), { REVISE: 13, TRIAL: 10, BLOCK: 7 });
});

test("D73 original wording follows the frozen questionnaire's semantic polarity", () => {
  for (const item of data.items) {
    const q = QUESTIONS.find(q => q.id === item.id);
    assert.equal(item.axis, q.axis);
    const negative = q.direction === 1 ? q.left : q.right;
    const positive = q.direction === 1 ? q.right : q.left;
    assert.deepEqual(item.current, { negative, positive }, item.id);
    assert.notEqual(item.current.negative, item.current.positive, item.id);
  }
});

test("D73 candidate wording has exact D57/D59 provenance and no untracked copy", () => {
  assert.equal(base.size, 30);
  assert.equal(overrides.size, 8);
  assert.deepEqual([...overrides.keys()].sort(),
    ["A01","A04","A05","A06","B02","B05","D02","D03"].sort());
  const sources = { D57: 0, D59: 0 };
  for (const item of data.items) {
    const original = base.get(item.id);
    assert.ok(original, item.id);
    assert.equal(item.editorialStatus, original.status, item.id);
    const source = overrides.has(item.id) ? "D59" : "D57";
    assert.equal(item.candidate.source, source, item.id);
    sources[source]++;
    assert.equal(item.candidate.negative + "／" + item.candidate.positive,
      overrides.get(item.id) || original.pair, item.id);
    assert.ok(item.probe.length >= 3, item.id);
    assert.equal(item.adoption, "NOT_APPROVED", item.id);
  }
  assert.deepEqual(sources, { D57: 22, D59: 8 });
});

test("D73 construct gates cannot silently adopt A/B, or transform E into old wealth", () => {
  const counts = { HOLD_CONSTRUCT: 0, HOLD_E_DESIGN: 0, REVIEW_ONLY: 0 };
  for (const item of data.items) {
    const expected = "AB".includes(item.axis) ? "HOLD_CONSTRUCT" :
      item.axis === "E" ? "HOLD_E_DESIGN" : "REVIEW_ONLY";
    assert.equal(item.decisionGate, expected, item.id);
    counts[expected]++;
    assert.equal(item.competingWith.every(id =>
      id !== item.id && data.items.some(candidate => candidate.id === id)), true, item.id);
  }
  assert.deepEqual(counts, { HOLD_CONSTRUCT: 12, HOLD_E_DESIGN: 6, REVIEW_ONLY: 12 });
  assert.deepEqual(data.items.filter(x => x.editorialStatus === "BLOCK").map(x => x.id),
    ["A04","A05","B02","C04","D03","E04","E05"]);
  for (const item of data.items.filter(x => x.axis === "E"))
    assert.equal(item.decisionGate, "HOLD_E_DESIGN");
});

test("D73 records current versions and unapproved decisions without changing runtime", () => {
  assert.deepEqual(data.frozenVersions, {
    question: QUESTION_SET_VERSION, scoring: SCORING_VERSION,
    type: TYPE_VERSION, content: CONTENT_VERSION
  });
  assert.equal(TYPES.length, 16);
  assert.deepEqual(["A","B","C","D","E"].map(k => data.constructOptions[k].decision),
    ["PENDING","PENDING","PENDING","PENDING","PENDING"]);
  assert.equal(data.gates.constructDecision, "PENDING");
  assert.equal(data.gates.humanEditorialReview, "PENDING");
  for (const key of ["studyAuthorized","productionReleaseAuthorized","mergeAuthorized",
                     "existingRuntimeChanged","legacyRescoringAllowed"])
    assert.equal(data.gates[key], false, key);
  assert.match(packet, /BLOCK全7問/);
  assert.match(packet, /人間の編集責任者/);
  assert.match(packet, /既存データ変更はしない/);
});
