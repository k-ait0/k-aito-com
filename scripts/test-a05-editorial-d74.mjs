import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QUESTIONS, QUESTION_SET_VERSION } from "../projects/kidp/life-design-lab/a05/questions.mjs";
import { SCORING_VERSION } from "../projects/kidp/life-design-lab/a05/engine.mjs";
import { TYPES, TYPE_VERSION, CONTENT_VERSION } from "../projects/kidp/life-design-lab/a05/types.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const d73 = JSON.parse(read("docs/A05_D73_ITEM_CONSTRUCT_CROSSWALK_20261026.json"));
const d74 = JSON.parse(read("docs/A05_D74_AB_ALTERNATIVES_20261026.json"));
const packet = read("docs/A05_D74_AB_COMPARATIVE_REVIEW_20261026.md");

test("D74 alternatives cover A/B 12 IDs exactly once and remain tentative", () => {
  assert.equal(d74.schema, "A05-D74-AB-ALTERNATIVES-1");
  assert.deepEqual(d74.items.map(i => i.id),
    ["A01","A02","A03","A04","A05","A06","B01","B02","B03","B04","B05","B06"]);
  assert.equal(QUESTIONS.length, 30);
  assert.equal(TYPES.length, 16);
  assert.equal(d74.gate.humanSelection, "PENDING");
  for (const field of ["adoptionAuthorized","studyAuthorized","mergeAuthorized","productionReleaseAuthorized"])
    assert.equal(d74.gate[field], false, field);
  assert.equal(d74.gate.oldQuestionAndScoreVersionsUnchanged, true);
});

test("D74 L/M/current alternatives correspond to identical D73 IDs without silent edits", () => {
  for (const item of d74.items) {
    const ref = d73.items.find(x => x.id === item.id);
    assert.ok(ref, item.id);
    assert.equal(item.axis, ref.axis);
    assert.ok(["A","B"].includes(item.axis));
    assert.deepEqual(item.current, ref.current, item.id);
    assert.deepEqual(item.alternateM, ref.candidate, item.id);
    assert.equal(item.conceptTarget, "INCUMBENT_L_TEST_CANDIDATE");
    assert.equal(item.decision, "NOT_APPROVED", item.id);
    assert.equal(item.observedPsychometrics, false);
    assert.ok(item.candidateL.negative.length >= 8, item.id);
    assert.ok(item.candidateL.positive.length >= 8, item.id);
    assert.notEqual(item.candidateL.negative, item.candidateL.positive, item.id);
    assert.ok(item.candidateL.domain.length >= 4);
    assert.ok(item.comparativeRisk.length >= 8);
    assert.ok(item.explicitComparators.length >= 1);
    for (const linked of item.explicitComparators)
      assert.ok(d74.items.some(other => other.id === linked && other.id !== item.id), item.id);
    assert.notEqual(item.candidateL.negative + "／" + item.candidateL.positive,
      item.alternateM.negative + "／" + item.alternateM.positive, item.id);
    const pair = item.candidateL.negative + "／" + item.candidateL.positive;
    assert.ok(packet.includes("| " + item.id + " | " + pair + " |"), item.id);
  }
});

test("D74 BLOCK proposals never acquire implicit approval", () => {
  const blocked = d74.items.filter(i =>
    d73.items.find(ref => ref.id === i.id).editorialStatus === "BLOCK").map(i => i.id);
  assert.deepEqual(blocked, ["A04","A05","B02"]);
  assert.match(packet, /BLOCK全7問/);
  assert.match(packet, /改稿採用・研究・リリースは未承認/);
  for (const k of ["A","B"]) assert.equal(d73.constructOptions[k].decision, "PENDING");
  assert.deepEqual(d73.frozenVersions, {
    question: QUESTION_SET_VERSION, scoring: SCORING_VERSION,
    type: TYPE_VERSION, content: CONTENT_VERSION
  });
});
