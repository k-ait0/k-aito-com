import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { AXES, QUESTIONS, QUESTION_SET_VERSION } from "../projects/kidp/life-design-lab/a05/questions.mjs";
import { SCORING_VERSION } from "../projects/kidp/life-design-lab/a05/engine.mjs";
import { TYPES, TYPE_VERSION, CONTENT_VERSION } from "../projects/kidp/life-design-lab/a05/types.mjs";
import { COMPATIBILITY_PAIRS, COMPATIBILITY_AXES, COMPATIBILITY_VERSION,
  getTypeAxisProfile } from "../projects/kidp/life-design-lab/a05/compatibility.mjs";

const read = path => readFileSync(new URL("../"+path,import.meta.url));
const json = path => JSON.parse(read(path).toString("utf8"));
const baseline = json("docs/A05_S1_BASELINE_MANIFEST_V01_20261029.json");
const crosswalk = json("docs/A05_D73_ITEM_CONSTRUCT_CROSSWALK_20261026.json");
const b85 = json("docs/A05_D85_B_MODE_COMPARISON_20261026.json");
const b86 = json("docs/A05_D86_TYPE_STRUCTURE_DECISION_20261026.json");
const g1 = json("docs/A05_D38_G1_APPROVAL_REGISTER_20261026.json");
const d42 = json("docs/A05_D42_30DAY_ACCEPTANCE_REGISTER_20261026.json");

test("S1-1 source freeze: Git blob fingerprints still match every source", () => {
  assert.equal(baseline.baselineFrozen,true);
  assert.equal(baseline.productionAllowed,false);
  assert.equal(baseline.humanPsychometricApproval,false);
  for (const [key,record] of Object.entries(baseline.sourceFiles)) {
    assert.ok(record.path);
    assert.match(record.gitBlobSha,/^[0-9a-f]{40}$/);
    const bytes = read(record.path);
    const digest = createHash("sha1")
      .update("blob "+bytes.length+"\0").update(bytes).digest("hex");
    assert.equal(digest,record.gitBlobSha,key+" drifted");
  }
});
test("S1-1 source versions and 30 editorial decisions pinned without adoption", () => {
  assert.deepEqual(baseline.versions,{
    question: QUESTION_SET_VERSION,
    scoring: SCORING_VERSION,
    type: TYPE_VERSION,
    content: CONTENT_VERSION,
    compatibility: COMPATIBILITY_VERSION
  });
  assert.equal(QUESTIONS.length,30);
  assert.equal(TYPES.length,16);
  assert.deepEqual(AXES.map(x=>x.id),["A","B","C","D","E"]);
  assert.deepEqual(baseline.axes.map(x=>x.id),AXES.map(x=>x.id));
  assert.equal(crosswalk.items.length,30);
  assert.deepEqual(baseline.reviewItems30.map(x=>x.id),crosswalk.items.map(x=>x.id));
  assert.deepEqual(baseline.reviewCounts,{BLOCK:7,REVISE:13,TRIAL:10});
  const counts={BLOCK:0,REVISE:0,TRIAL:0};
  for (const item of crosswalk.items) {
    counts[item.editorialStatus]++;
    assert.equal(item.adoption,"NOT_APPROVED");
    const original=baseline.reviewItems30.find(x=>x.id===item.id);
    assert.equal(original.status,item.editorialStatus);
  }
  assert.deepEqual(counts,baseline.reviewCounts);
  assert.equal(crosswalk.gates.productionReleaseAuthorized,false);
  assert.equal(crosswalk.gates.studyAuthorized,false);
});
test("S1-1 type profiles and all 136 unordered combinations unchanged", () => {
  assert.equal(COMPATIBILITY_PAIRS.length,136);
  assert.equal(new Set(COMPATIBILITY_PAIRS.map(x=>x.id)).size,136);
  assert.equal(COMPATIBILITY_PAIRS.filter(x=>x.sameType).length,16);
  assert.equal(baseline.types16.length,16);
  for (let i=0;i<TYPES.length;i++) {
    assert.equal(TYPES[i].id,baseline.types16[i].id);
    assert.equal(TYPES[i].name,baseline.types16[i].name);
    assert.equal(TYPES[i].group,Math.floor(i/4));
    const profile=getTypeAxisProfile(TYPES[i].id);
    for (const axis of ["A","B","C","D"]) {
      const definition=AXES.find(x=>x.id===axis);
      const label=profile[axis]===1?definition.positive:definition.negative;
      assert.equal(label,baseline.types16[i].profile[axis]);
    }
  }
});
test("S1-6 E remains auxiliary; all 136 pairs exclude E and lack match scores", () => {
  assert.deepEqual(COMPATIBILITY_AXES.map(a=>a.id),["A","B","C","D"]);
  assert.equal(baseline.bounds.auxiliaryAxisIds.join(","),"E");
  assert.equal(QUESTIONS.filter(x=>x.axis==="E").length,6);
  for (const pair of COMPATIBILITY_PAIRS) {
    assert.equal(pair.agreements.length+pair.differences.length,4);
    assert.equal(pair.agreements.some(x=>x.axis==="E"),false);
    assert.equal(pair.differences.some(x=>x.axis==="E"),false);
    assert.equal(pair.score,null);
    assert.equal(pair.rank,null);
    assert.equal(pair.evidence.directPairValidation,false);
  }
});
test("S1-6 real research and B mode decisions remain blocked", () => {
  assert.equal(b85.syntheticScenarios.length,8);
  assert.equal(b86.decision.formalWinner,"PENDING");
  assert.equal(g1.operationalDecisions.length,12);
  assert.equal(g1.operationalDecisions.every(x=>x.status==="PENDING"),true);
  assert.equal(d42.acceptanceChecks.length,16);
  assert.equal(d42.acceptanceChecks.every(x=>x.status==="PENDING"),true);
  assert.equal(g1.dataCollected,false);
  assert.equal(g1.interviewsConducted,0);
  assert.equal(d42.approval.state,"PENDING");
  assert.equal(baseline.evidenceHolds.researchG1.approvalCount,0);
  assert.equal(baseline.evidenceHolds.operationalD42.approvalCount,0);
});
