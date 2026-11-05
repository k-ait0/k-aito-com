import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BC_PILOT_SCHEMA, validateBCPilotBank, scoreBCPilot
} from "../projects/kidp/life-design-lab/a05/bc-pilot-engine.mjs";
import { QUESTIONS, QUESTION_SET_VERSION } from "../projects/kidp/life-design-lab/a05/questions.mjs";
import { TYPES } from "../projects/kidp/life-design-lab/a05/types.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const bank = JSON.parse(read("docs/A05_D87_BC_PILOT_20261105.json"));
const pairs = bank => bank.facets.map(f => [f.id, bank.items.filter(q => q.facet === f.id)]);
function fromFixture(fixture) {
  const answers = {};
  for (const [id, questions] of pairs(bank)) {
    const values = fixture.by_facet[id];
    questions.forEach((q, i) => { answers[q.id] = values[i]; });
  }
  return answers;
}
const means = result => Object.fromEntries(result.scales.map(s => [s.id, s.mean]));

test("D88 bank uses D87 canonical 12 items, 4 independent 3-item facets", () => {
  assert.equal(BC_PILOT_SCHEMA, "A05-BC-PILOT-0.1-draft");
  assert.equal(bank.schema, BC_PILOT_SCHEMA);
  assert.equal(bank.source_question_version, QUESTION_SET_VERSION);
  assert.equal(validateBCPilotBank(bank), bank);
  assert.equal(bank.items.length, 12);
  assert.deepEqual(bank.facets.map(f => f.id), ["self", "related", "future", "present"]);
  assert.deepEqual(pairs(bank).map(([, items]) => items.length), [3, 3, 3, 3]);
  assert.equal(new Set(bank.items.map(q => q.id)).size, 12);
});

test("D88 all four D87 synthetic fixture means match exactly", () => {
  assert.equal(bank.fixtures.length, 4);
  for (const fixture of bank.fixtures) {
    const result = scoreBCPilot(bank, fromFixture(fixture));
    assert.deepEqual(means(result), fixture.expected, fixture.id);
    assert.equal(result.typeId, null);
    assert.equal(result.groupId, null);
    assert.equal(result.classificationStatus, "WITHHELD");
    assert.equal(result.measurementValidity, "UNVALIDATED");
    assert.equal(result.oldTypeCompatible, false);
    assert.equal(result.storagePolicy, "MEMORY_ONLY");
    assert.equal(result.selectedCount, 12);
  }
});

test("D88 independent scales distinguish both-high from both-low and opposed patterns", () => {
  const [high, low, opposed] = bank.fixtures;
  assert.deepEqual(means(scoreBCPilot(bank, fromFixture(high))), {
    self: 7, related: 7, future: 7, present: 7
  });
  assert.deepEqual(means(scoreBCPilot(bank, fromFixture(low))), {
    self: 1, related: 1, future: 1, present: 1
  });
  assert.deepEqual(means(scoreBCPilot(bank, fromFixture(opposed))), {
    self: 7, related: 1, future: 1, present: 7
  });
});

test("D88 null and omitted differ, and neither silently becomes midpoint 4", () => {
  const none = scoreBCPilot(bank, {});
  assert.equal(none.selectedCount, 0);
  assert.equal(none.completeAll, false);
  assert.ok(none.scales.every(s => s.mean === null && s.unselected === 3 && s.cannotJudge === 0));
  const incomplete = scoreBCPilot(bank, fromFixture(bank.fixtures[3]));
  assert.equal(incomplete.completeAll, false);
  assert.equal(incomplete.scales[0].mean, null);
  assert.equal(incomplete.scales[0].cannotJudge, 1);
  assert.equal(incomplete.scales[0].unselected, 0);
  assert.equal(incomplete.scales[1].mean, 4);
  const omitted = fromFixture(bank.fixtures[0]);
  delete omitted["B-S03"];
  const score = scoreBCPilot(bank, omitted);
  assert.equal(score.selectedCount, 11);
  assert.equal(score.scales[0].unselected, 1);
  assert.equal(score.scales[0].mean, null);
  assert.equal(score.scales[1].mean, 7);
});

test("D88 valid integers only; reject unknown keys and invalid answer containers", () => {
  const valid = fromFixture(bank.fixtures[0]);
  for (const bad of [0, -1, 8, 3.5, "7", undefined, NaN, Infinity, true, {}]) {
    assert.throws(() => scoreBCPilot(bank, {...valid, "B-S01": bad}), TypeError);
  }
  for (const bad of [null, [], "hello", 4, Object.create({inherited: 1})])
    assert.throws(() => scoreBCPilot(bank, bad), TypeError);
  assert.throws(() => scoreBCPilot(bank, {UNKNOWN: 4}), TypeError);
  assert.throws(() => scoreBCPilot({...bank, items: bank.items.slice(1)}, valid), TypeError);
  assert.throws(() => scoreBCPilot({...bank, schema: "A05-Q-1.0.0-draft"}, valid), TypeError);
});

test("D88 model is immutable at result level and never issues old type IDs", () => {
  assert.equal(QUESTIONS.length, 30);
  assert.equal(TYPES.length, 16);
  for (const fixture of bank.fixtures) {
    const result = scoreBCPilot(bank, fromFixture(fixture));
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.scales));
    assert.ok(result.scales.every(Object.isFrozen));
    assert.equal(result.typeId, null);
    assert.equal(result.groupId, null);
    assert.notEqual(result.schema, QUESTION_SET_VERSION);
  }
});

test("D88 preview is isolated, noindex, same-origin question GET only; no persistence", () => {
  const html = read("projects/kidp/life-design-lab/a05/bc-pilot-preview.html");
  const js = read("projects/kidp/life-design-lab/a05/bc-pilot-preview.mjs");
  const engine = read("projects/kidp/life-design-lab/a05/bc-pilot-engine.mjs");
  assert.match(html, /name="robots" content="noindex,nofollow"/);
  assert.match(html, /id="questions"/);
  assert.match(html, /id="load-preset"/);
  assert.match(html, /id="reset"/);
  assert.match(html, /未承認/);
  assert.match(html, /保存・外部送信/);
  assert.match(js, /fetch\(path, \{ credentials: "omit", cache: "no-store" \}\)/);
  assert.match(js, /A05_D87_BC_PILOT_20261105.json/);
  assert.match(js, /scoreBCPilot/);
  for (const forbidden of [
    "localStorage", "sessionStorage", "indexedDB", "sendBeacon",
    "XMLHttpRequest", "navigator.serviceWorker", "innerHTML",
    "https://", "http://", "./engine.mjs", "./storage.mjs", "./types.mjs"
  ]) assert.equal([html, js, engine].some(s => s.includes(forbidden)), false, forbidden);
});
