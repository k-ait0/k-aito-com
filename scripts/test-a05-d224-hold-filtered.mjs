import test from "node:test";
import assert from "node:assert/strict";
import {drawResearchHoldFilteredManifest,isCoreScoringCandidate,D224_VERSION} from "./a05-d224-hold-filtered-sampler.mjs";
import {drawResearchManifest} from "./a05-d208-research-sampler.mjs";
const blocked=new Set(["A05-V1-31","A05-V1-32","A05-V1-36"]);
test("D224 is deterministic, explicitly unapproved, and excludes the C holds only",()=>{
 const m=drawResearchHoldFilteredManifest("D224-contract");
 assert.deepEqual(m,drawResearchHoldFilteredManifest("D224-contract"));
 assert.equal(m.schema,D224_VERSION);
 assert.equal(m.mode,"RESEARCH_ONLY");
 assert.equal(m.scoringApproved,false);
 assert.deepEqual(m.holdExcluded,[...blocked].sort());
 assert.equal(m.questions.length,30);
 assert.equal(m.questions.filter(q=>q.scoring_role==="NONSCORING_AUXILIARY").length,2);
 assert.ok(m.questions.every(q=>!blocked.has(q.id)));
 assert.equal(isCoreScoringCandidate("A05-V1-31"),false);
 assert.equal(isCoreScoringCandidate("A05-V1-32"),false);
 assert.equal(isCoreScoringCandidate("A05-V1-36"),false);
 assert.equal(isCoreScoringCandidate("A05-V1-35"),true);
 assert.equal(isCoreScoringCandidate("A05-V1-49"),false);
 assert.throws(()=>isCoreScoringCandidate("ABSENT"));
});
test("D224 retains 30 positions, exact axis counts, no adjacent same axis and independent E semantics across 512 seeds",()=>{
 const frequency=new Map();
 for(let i=0;i<512;i++){
  const seed="D224-seed-"+i;
  const m=drawResearchHoldFilteredManifest(seed);
  const base=drawResearchManifest(seed);
  const ids=m.questions.map(q=>q.id);
  assert.equal(ids.length,30);
  assert.equal(new Set(ids).size,30);
  for(const [axis,n] of Object.entries({A:7,B:7,C:7,D:7,E:2})){
   assert.equal(m.questions.filter(q=>q.axis===axis).length,n);
  }
  for(let j=1;j<30;j++)assert.notEqual(m.questions[j-1].axis,m.questions[j].axis);
  for(let j=0;j<30;j++){
   if(m.questions[j].axis!=="C")assert.equal(m.questions[j].id,base.questions[j].id);
  }
  for(const q of m.questions.filter(q=>q.axis==="C")){
   assert.ok(!blocked.has(q.id));
   frequency.set(q.id,(frequency.get(q.id)||0)+1);
  }
 }
 assert.equal(frequency.size,9);
 for(const n of frequency.values())assert.ok(n>300&&n<480,"eligible C item coverage "+n);
});
