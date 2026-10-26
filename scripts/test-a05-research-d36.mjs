import test from "node:test";
import { buildInterviewAssignment, buildInterviewPlan, PLANNED_SLOTS, RESEARCH_PROTOCOL_VERSION } from "./a05-research-assignment.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QUESTIONS, QUESTION_SET_VERSION } from "../projects/kidp/life-design-lab/a05/questions.mjs";

// Research candidate contracts only: no scoring, network, browser writes or user data.
const load = name => JSON.parse(readFileSync(new URL("../docs/" + name, import.meta.url), "utf8"));
const base = load("A05_D35_INTERVIEW_CANDIDATES_20261026.json");
const overlay = load("A05_D36_REVISE_CANDIDATES_20261026.json");
const allIds = new Set(QUESTIONS.map(q => q.id));
const expectedRevisions = base.items.filter(q => q.editorialStatus === "REVISE");
const expectedBlockers = base.items.filter(q => q.editorialStatus === "BLOCK");

test("D-36 is an isolated, unapproved overlay over unchanged D-35", () => {
  assert.equal(base.researchVersion, "A05-R-2.0.0-alpha.1");
  assert.equal(base.sourceVersion, QUESTION_SET_VERSION);
  assert.equal(overlay.schema, "A05-REVISE-OVERLAY-1");
  assert.equal(overlay.baseResearchVersion, base.researchVersion);
  assert.equal(overlay.researchVersion, "A05-R-2.0.0-alpha.2-overlay");
  assert.equal(overlay.status, "RESEARCH_ONLY_UNAPPROVED");
  assert.equal(overlay.entries.length, 13);
  assert.deepEqual(overlay.entries.map(x => x.id).sort(),
    expectedRevisions.map(x => x.id).sort());
  assert.equal(base.items.length, 30);
  assert.equal(base.items.reduce((n, x) => n + x.variants.length, 0), 37);
});

test("all permission safeguards prohibit publication, scoring and data collection", () => {
  for (const flag of ["scoringAllowed", "productionUseAllowed", "autosaveAllowed",
    "personalDataCollectionApproved", "oldResultsComparable"]) {
    assert.equal(overlay.permissions[flag], false, flag);
  }
  assert.equal(base.policy.scoringAllowed, false);
  assert.equal(base.policy.storedAssessmentCompatible, false);
});

test("every revised question has exactly two well-formed, direction-correct alternatives", () => {
  let total = 0;
  for (const entry of overlay.entries) {
    const source = QUESTIONS.find(q => q.id === entry.id);
    assert.ok(source, entry.id);
    const original = base.items.find(q => q.id === entry.id);
    assert.equal(original?.editorialStatus, "REVISE", entry.id);
    assert.equal(entry.editorialStatus, "REVISE");
    assert.equal(entry.variants.length, 2);
    assert.deepEqual(entry.variants.map(v => v.code), ["A", "B"]);
    assert.equal(new Set(entry.variants.map(v => v.negative + "\u0000" + v.positive)).size,
      2, entry.id + " contains two identical alternatives");
    for (const option of entry.variants) {
      for (const text of [option.negative, option.positive]) {
        assert.ok(typeof text === "string" && text.trim().length >= 8, entry.id);
        assert.doesNotMatch(text, /[<>]/);
      }
      assert.notEqual(option.negative, option.positive, entry.id);
      const visual = source.direction === 1 ?
        [option.negative, option.positive] : [option.positive, option.negative];
      assert.deepEqual([option.left, option.right], visual, entry.id);
      const old = original.variants[0];
      assert.notDeepEqual([option.negative, option.positive],
        [old.negative, old.positive], entry.id + " must add an alternative");
      total++;
    }
  }
  assert.equal(total, 26);
});

test("P0 eight and P1 five cover all thirteen outstanding REVISE items", () => {
  const counts = Object.fromEntries(["P0", "P1", "P2"].map(key =>
    [key, overlay.entries.filter(e => e.priority === key).length]));
  assert.deepEqual(counts, { P0: 8, P1: 5, P2: 0 });
  assert.deepEqual(overlay.entries.filter(x => x.priority === "P0").map(x => x.id).sort(),
    ["A06", "B06", "C02", "C06", "D04", "E02", "E03", "E06"].sort());
  assert.equal(expectedBlockers.length, 7);
  assert.equal(base.items.filter(x => x.editorialStatus === "TRIAL").length, 10);
  assert.equal(expectedBlockers.length + counts.P0, 15);
});

test("overlap pointers are well formed, non-self and interview probes exist", () => {
  for (const entry of overlay.entries) {
    assert.ok(typeof entry.constructHypothesis === "string" &&
      entry.constructHypothesis.length > 4, entry.id);
    assert.ok(typeof entry.interviewProbe === "string" &&
      entry.interviewProbe.length > 10, entry.id);
    assert.ok(Array.isArray(entry.overlapCandidates), entry.id);
    assert.equal(new Set(entry.overlapCandidates).size, entry.overlapCandidates.length, entry.id);
    for (const other of entry.overlapCandidates) {
      assert.ok(allIds.has(other) && other !== entry.id, entry.id + " -> " + other);
    }
  }
  assert.ok(overlay.entries.find(x => x.id === "E06").overlapCandidates.includes("E03"));
  assert.ok(overlay.entries.find(x => x.id === "D04").overlapCandidates.includes("A06"));
});

test("combined editorial candidates total 63 but do not imply 63 questionnaire items", () => {
  assert.equal(QUESTIONS.length, 30);
  assert.equal(base.items.length, 30);
  assert.equal(new Set(base.items.map(x => x.id)).size, 30);
  assert.equal(overlay.entries.length, 13);
  const combined = base.items.reduce((n, x) => n + x.variants.length, 0) +
    overlay.entries.reduce((n, x) => n + x.variants.length, 0);
  assert.equal(combined, 63);
  assert.deepEqual(overlay.entries.filter(e => e.id.startsWith("E")).map(e => e.id).sort(),
    ["E02", "E03", "E06"]);
  assert.equal(base.responseFormat.E05IndependentResearchOnly.scoringAllowed, false);
});

test("D-37 schedule rejects invalid slots and non-research candidate inputs", () => {
  assert.equal(PLANNED_SLOTS, 12);
  assert.equal(RESEARCH_PROTOCOL_VERSION, "A05-R-PROTOCOL-1");
  for (const slot of [0, 13, 1.5, null, "1", NaN]) {
    assert.throws(() => buildInterviewAssignment(base, overlay, slot), RangeError);
  }
  assert.throws(() => buildInterviewAssignment({ ...base,
    policy: { ...base.policy, scoringAllowed: true } }, overlay, 1));
  assert.throws(() => buildInterviewAssignment(base, { ...overlay,
    permissions: { ...overlay.permissions, personalDataCollectionApproved: true } }, 1));
});

test("D-37 all twelve interview slots have exactly thirty unscored core items", () => {
  const plans = buildInterviewPlan(base, overlay);
  assert.equal(plans.length, 12);
  for (const [index, plan] of plans.entries()) {
    assert.equal(plan.slot, index + 1);
    assert.equal(plan.protocol, RESEARCH_PROTOCOL_VERSION);
    assert.equal(plan.status, "UNAPPROVED_SCHEDULE_ONLY");
    assert.equal(plan.core.length, 30);
    assert.deepEqual(plan.core.map(x => x.id), QUESTIONS.map(x => x.id));
    assert.equal(plan.focus.length, 4);
    assert.equal(new Set(plan.focus.map(x => x.id)).size, 4);
    assert.equal(plan.permissions.scoringAllowed, false);
    assert.equal(plan.permissions.savingAllowed, false);
    assert.equal(plan.permissions.personalDataCollectionApproved, false);
    assert.equal(plan.permissions.productionUseAllowed, false);
    for (const row of plan.core) {
      assert.ok(row.left && row.right);
      assert.ok(["BLOCK", "REVISE", "TRIAL"].includes(row.editorialStatus));
      const candidate = [...base.items.find(x => x.id === row.id).variants,
        ...(overlay.entries.find(x => x.id === row.id)?.variants || [])]
        .find(v => v.code === row.variantCode);
      assert.equal(row.left, candidate.left, row.id);
      assert.equal(row.right, candidate.right, row.id);
    }
  }
});

test("D-37 blocked A/B and revised D31/A/B are exactly balanced over 12 slots", () => {
  const plans = buildInterviewPlan(base, overlay);
  for (const item of base.items) {
    const labels = plans.map(plan =>
      plan.core.find(q => q.id === item.id).variantCode);
    const counts = label => labels.filter(value => value === label).length;
    if (item.editorialStatus === "BLOCK") {
      assert.equal(counts("A"), 6, item.id);
      assert.equal(counts("B"), 6, item.id);
    } else if (item.editorialStatus === "REVISE") {
      assert.equal(counts("D31"), 4, item.id);
      assert.equal(counts("A"), 4, item.id);
      assert.equal(counts("B"), 4, item.id);
    } else {
      assert.ok(labels.every(x => x === "D31"), item.id);
    }
  }
});

test("D-37 follow-up schedule balances 3 P0 and 1 P1 per slot", () => {
  const plans = buildInterviewPlan(base, overlay);
  const p0 = base.items.filter(item => item.editorialStatus === "BLOCK" ||
    overlay.entries.find(x => x.id === item.id)?.priority === "P0").map(x => x.id);
  const p1 = overlay.entries.filter(x => x.priority === "P1").map(x => x.id);
  assert.equal(p0.length, 15);
  assert.equal(p1.length, 5);
  for (const plan of plans) {
    assert.equal(plan.focus.filter(x => p0.includes(x.id)).length, 3);
    assert.equal(plan.focus.filter(x => p1.includes(x.id)).length, 1);
    for (const focus of plan.focus) {
      const primary = plan.core.find(x => x.id === focus.id);
      assert.equal(focus.primaryCode, primary.variantCode);
      assert.notEqual(focus.comparisonCode, primary.variantCode);
      assert.equal(focus.comparisonOnly, true);
      assert.ok(focus.left && focus.right);
    }
  }
  for (const id of [...p0, ...p1]) {
    const appearances = plans.filter(plan =>
      plan.focus.some(f => f.id === id)).length;
    assert.ok(appearances >= 2 && appearances <= 3, id + " appearances=" + appearances);
  }
});

test("D-37 independent E05 has counterbalanced before/after timing, no scoring", () => {
  const plans = buildInterviewPlan(base, overlay);
  assert.equal(plans.filter(x => x.e05Independent.timing === "before-core").length, 6);
  assert.equal(plans.filter(x => x.e05Independent.timing === "after-core").length, 6);
  // Variant wording and independent-question timing must not be confounded.
  for (const code of ["A", "B"]) {
    for (const timing of ["before-core", "after-core"]) {
      assert.equal(plans.filter(plan =>
        plan.core.find(row => row.id === "E05").variantCode === code &&
        plan.e05Independent.timing === timing).length, 3, code + "/" + timing);
    }
  }
  for (const plan of plans) {
    assert.deepEqual(plan.e05Independent.questions.map(x => x.id), ["E05-M", "E05-T"]);
    assert.equal(plan.permissions.scoringAllowed, false);
  }
});
