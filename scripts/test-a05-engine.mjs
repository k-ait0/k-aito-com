"use strict";
/**
 * Local-first A05 domain regression. No npm install, no GitHub Actions needed.
 * Run from the repository root:
 *   node --test scripts/test-a05-engine.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  AXES, QUESTIONS, QUESTION_SET_VERSION,
  canonicalQuestionManifest, questionSetHash
} from "../projects/kidp/life-design-lab/a05/questions.mjs";
import { GROUPS, TYPES } from "../projects/kidp/life-design-lab/a05/types.mjs";
import {
  resolveAxis, scoreAssessment, validateQuestions, validateAnswers,
  makeSnapshot, newDraft, classifySnapshot, SCORING_VERSION
} from "../projects/kidp/life-design-lab/a05/engine.mjs";

const AXIS_IDS = "ABCDE";
const hash = await questionSetHash();

function fixture(typeNumber, wealth = "neutral") {
  const index = typeNumber - 1;
  const group = Math.floor(index / 4);
  const within = index % 4;
  const signs = [
    group >= 2 ? 1 : -1,
    group % 2 ? 1 : -1,
    within >= 2 ? 1 : -1,
    within % 2 ? 1 : -1,
    wealth === "time" ? 1 : wealth === "money" ? -1 : 0
  ];
  return Object.fromEntries(QUESTIONS.map(q => {
    const sign = signs[AXIS_IDS.indexOf(q.axis)];
    return [q.id, sign === 0 ? 4 : 4 + sign * 3 * q.direction];
  }));
}

function snapshotOf(typeNumber, wealth = "time", withRaw = false) {
  const draft = newDraft("test-" + typeNumber + "-" + wealth, hash);
  draft.answers = fixture(typeNumber, wealth);
  return makeSnapshot(draft, hash, withRaw);
}

test("30 questions; six per axis; unique IDs; SHA-256 real hash", () => {
  assert.equal(validateQuestions(), undefined);
  assert.equal(QUESTIONS.length, 30);
  assert.equal(new Set(QUESTIONS.map(q => q.id)).size, 30);
  for (const axis of AXES) {
    assert.equal(QUESTIONS.filter(q => q.axis === axis.id).length, 6);
  }
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.ok(canonicalQuestionManifest().includes("A01"));
  assert.equal(typeof QUESTION_SET_VERSION, "string");
  assert.equal(typeof SCORING_VERSION, "string");
});

test("RGBY group order: G1 blue, G2 green, G3 red, G4 yellow", () => {
  assert.deepEqual(GROUPS.map(g => g.letter), ["B", "G", "R", "Y"]);
  assert.deepEqual(TYPES.map(t => t.id), Array.from({ length: 16 },
    (_, i) => "T" + String(i + 1).padStart(2, "0")));
});

for (let type = 1; type <= 16; type++) {
  for (const wealth of ["money", "time"]) {
    test("32 derived cases: T" + String(type).padStart(2, "0") + "/" + wealth, () => {
      const result = scoreAssessment(fixture(type, wealth));
      assert.equal(result.typeId, "T" + String(type).padStart(2, "0"));
      assert.equal(result.wealth, wealth);
      assert.equal(result.classification, "classified");
    });
  }
  test("neutral variant keeps the basic type T" + String(type).padStart(2, "0"), () => {
    const result = scoreAssessment(fixture(type));
    assert.equal(result.typeId, "T" + String(type).padStart(2, "0"));
    assert.equal(result.wealth, "neutral");
  });
}

test("all midpoint answers withhold basic type, keep E neutral", () => {
  const answers = Object.fromEntries(QUESTIONS.map(q => [q.id, 4]));
  const result = scoreAssessment(answers);
  assert.equal(result.typeId, null);
  assert.equal(result.wealth, "neutral");
  assert.ok(result.axes.every(x => x.n === 6 && x.sum === 0));
});

test("unanswerable null differs from middle, and E withholds", () => {
  const answers = Object.fromEntries(QUESTIONS.map(q => [q.id, null]));
  const result = scoreAssessment(answers);
  assert.equal(result.classification, "withheld");
  assert.equal(result.wealth, "withheld");
  assert.ok(result.axes.every(x => x.n === 0 && x.value === null));
});

test("three valid A answers withhold; four valid A answers provisionally classify", () => {
  const answers = fixture(11, "time");
  QUESTIONS.filter(q => q.axis === "A").slice(0, 3)
    .forEach(q => { answers[q.id] = null; });
  assert.equal(scoreAssessment(answers).typeId, null);
  const fourth = QUESTIONS.find(q => q.id === "A01");
  answers[fourth.id] = 4 + 3 * fourth.direction;
  assert.equal(scoreAssessment(answers).typeId, "T11");
  assert.equal(scoreAssessment(answers).classification, "provisional");
});

test("exact plus and minus 20 are provisional, not classified", () => {
  assert.equal(resolveAxis(5, 3).value, 20);
  assert.equal(resolveAxis(5, 3).status, "provisional");
  assert.equal(resolveAxis(5, -3).value, -20);
  assert.equal(resolveAxis(5, -3).status, "provisional");
  assert.equal(resolveAxis(6, 4).status, "classified");
});

test("E exact +/-20 is neutral and does not alter T11", () => {
  for (const sign of [1, -1]) {
    const answers = fixture(11);
    const e = QUESTIONS.filter(q => q.axis === "E");
    answers[e[0].id] = 4 + sign * 3 * e[0].direction;
    answers[e[5].id] = null;
    const result = scoreAssessment(answers);
    assert.equal(result.axes[4].n, 5);
    assert.equal(result.wealth, "neutral");
    assert.equal(result.typeId, "T11");
  }
});

test("left/right reversal with complemented answer does not change scores", () => {
  const questions = QUESTIONS.map(q => ({ ...q }));
  const answers = fixture(11, "time");
  const original = scoreAssessment(answers);
  questions[0].direction = -questions[0].direction;
  answers[questions[0].id] = 8 - answers[questions[0].id];
  assert.deepEqual(scoreAssessment(answers, questions), original);
});

test("question presentation order does not change the classification", () => {
  const answers = fixture(11, "time");
  assert.deepEqual(scoreAssessment(answers, [...QUESTIONS].reverse()), scoreAssessment(answers));
});

test("reject out-of-range and unknown answers; do not mutate caller data", () => {
  const good = fixture(11, "time");
  const before = JSON.stringify(good);
  scoreAssessment(good);
  assert.equal(JSON.stringify(good), before);
  assert.throws(() => scoreAssessment({ ...good, A01: 8 }));
  assert.throws(() => scoreAssessment({ ...good, Z99: 7 }));
  assert.throws(() => validateAnswers({ ...good, A01: "7" }));
  assert.throws(() => validateQuestions([...QUESTIONS.slice(1), QUESTIONS[1]]));
});

test("incomplete answers cannot become a finalized snapshot", () => {
  const draft = newDraft("incomplete-test", hash);
  draft.answers = fixture(11);
  delete draft.answers.A01;
  assert.throws(() => makeSnapshot(draft, hash, false));
});

test("current snapshots verify and retain raw only by explicit choice", () => {
  const withoutRaw = snapshotOf(11, "time", false);
  const withRaw = snapshotOf(11, "time", true);
  assert.equal(classifySnapshot(withoutRaw, hash), "verified");
  assert.equal(classifySnapshot(withRaw, hash), "verified");
  assert.equal(Object.hasOwn(withoutRaw, "rawAnswers"), false);
  assert.equal(Object.hasOwn(withRaw, "rawAnswers"), true);
  assert.equal(withRaw.result.typeId, "T11");
  assert.equal(withRaw.presentation.group, "G3");
});

test("old scoring version is preserved as legacy, never recalculated", () => {
  const prior = snapshotOf(11);
  prior.versions.scoring = "S-OLD";
  assert.equal(classifySnapshot(prior, hash), "legacy");
});

test("type/axis/group/hash tampering is quarantined", () => {
  const wrongSum = snapshotOf(11);
  wrongSum.result.axes[0].sum = -18;
  assert.equal(classifySnapshot(wrongSum, hash), "quarantined");

  const wrongGroup = snapshotOf(11);
  wrongGroup.presentation.group = "G1";
  assert.equal(classifySnapshot(wrongGroup, hash), "quarantined");

  const wrongRaw = snapshotOf(11, "time", true);
  wrongRaw.rawAnswers.A01 = 1;
  assert.equal(classifySnapshot(wrongRaw, hash), "quarantined");

  const wrongHash = snapshotOf(11);
  wrongHash.questionHash = "0".repeat(64);
  assert.equal(classifySnapshot(wrongHash, hash), "quarantined");
});


test("tampered current display name, explanation and theme are quarantined", () => {
  for (const field of ["name", "summary", "emoji", "action", "tint"]) {
    const item = snapshotOf(11, "time", false);
    item.presentation[field] += " (altered)";
    assert.equal(classifySnapshot(item, hash), "quarantined", field);
  }
});

test("legacy records with invalid internal structure are quarantined, not trusted", () => {
  const item = snapshotOf(11, "time", false);
  item.versions.scoring = "S-LEGACY";
  assert.equal(classifySnapshot(item, hash), "legacy");

  item.result.axes[0].n = -1;
  assert.equal(classifySnapshot(item, hash), "quarantined");
  item.result.axes[0].n = 6;

  item.result.typeId = "T99";
  assert.equal(classifySnapshot(item, hash), "quarantined");
});

test("snapshot validation is independent of JSON object property order", () => {
  const item = snapshotOf(11, "time", true);
  item.result = {
    wealth: item.result.wealth,
    classification: item.result.classification,
    typeId: item.result.typeId,
    axes: item.result.axes.map(a => ({
      status: a.status,
      direction: a.direction,
      value: a.value,
      sum: a.sum,
      n: a.n,
      id: a.id
    }))
  };
  assert.equal(classifySnapshot(item, hash), "verified");
});


test("incomplete and invalid responses are tagged VALIDATION_ERROR", () => {
  const badAnswer = { ...fixture(11, "time"), A01: 9 };
  assert.throws(() => scoreAssessment(badAnswer), {
    name: "AssessmentValidationError",
    code: "VALIDATION_ERROR"
  });

  const draft = newDraft("validation-test", hash);
  draft.answers = fixture(11);
  delete draft.answers.A01;
  assert.throws(() => makeSnapshot(draft, hash, false), {
    name: "AssessmentValidationError",
    code: "VALIDATION_ERROR"
  });
});

test("D-55 reject stale type/content drafts before final scoring or presentation",()=>{
  const base=newDraft("synthetic-stale-version",hash);
  base.answers=fixture(11,"time");
  assert.doesNotThrow(()=>makeSnapshot(base,hash,false));
  for(const version of ["question","scoring","type","content"]){
    const old=structuredClone(base);
    old.versions[version]="old-"+version+"-version";
    assert.throws(()=>makeSnapshot(old,hash,false),/Unsupported or corrupted draft/,
      "must not finalize a "+version+"-version draft with today's engine");
  }
});
