import test from "node:test";
import assert from "node:assert/strict";
import {BANK} from "./a05-d208-research-sampler.mjs";
import {createInterviewPlan,renderInterviewKit} from "./a05-d237-build-cognitive-interview-kit.mjs";
const P0=new Set(["C31-32","C35-36","E49-50"]);
test("D237 24 slots cover all priority pairs and balance the remaining 15 pairs 8 times",()=>{
 const plan=createInterviewPlan();
 assert.equal(plan.schema,"A05-D237-COGNITIVE-INTERVIEW-PLAN-1");
 assert.equal(plan.status,"BLANK_RESEARCH_SLOTS_NOT_RECRUITED");
 assert.equal(plan.slots.length,24);
 assert.equal(plan.counts.enrolledPeople,0);
 assert.equal(plan.counts.completedInterviews,0);
 assert.equal(Object.keys(plan.pairExposure).length,18);
 for(const id of P0)assert.equal(plan.pairExposure[id],24);
 for(const [pair,count] of Object.entries(plan.pairExposure))
  if(!P0.has(pair))assert.equal(count,8,pair);
 for(const slot of plan.slots){
  assert.equal(slot.pairIds.length,8);
  assert.equal(new Set(slot.pairIds).size,8);
  assert.equal(slot.allQuestionIds.length,16);
  assert.equal(new Set(slot.allQuestionIds).size,16);
  assert.ok([...P0].every(x=>slot.pairIds.includes(x)));
 }
});
test("D237 candidate order counterbalanced and negative control always last",()=>{
 const p=createInterviewPlan();
 assert.deepEqual(p.slots.map(x=>x.candidateOrder[0]).reduce((acc,x)=>{
  acc[x]=(acc[x]||0)+1;return acc;},{}),{"C36-R1":12,"C36-R2":12});
 for(const s of p.slots){
  assert.equal(s.candidateOrder[2],"C36-R3");
  assert.ok(s.candidateOrder.includes("C36-R1")&&s.candidateOrder.includes("C36-R2"));
 }
});
test("D237 sheets include exact original item wording, independent probes and private-record caution",()=>{
 const full=renderInterviewKit();
 assert.equal(full,renderInterviewKit());
 for(const x of BANK.items.filter(q=>["A05-V1-31","A05-V1-32","A05-V1-35","A05-V1-36","A05-V1-49","A05-V1-50"].includes(q.bank_id)))
  assert.ok(full.includes(x.stem),"Missing original "+x.bank_id);
 for(const id of ["B_AUTONOMY","B_CONNECTION","C_FUTURE","C_PRESENT","C36-R1","C36-R2","C36-R3"])
  assert.ok(full.includes(id));
 for(const slot of createInterviewPlan().slots)assert.ok(full.includes("面接枠："+slot.slot));
 assert.ok(full.includes("同意"));
 assert.ok(full.includes("公開リポジトリ"));
 assert.ok(full.length>50000);
});
