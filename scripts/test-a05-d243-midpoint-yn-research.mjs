import test from "node:test";
import assert from "node:assert/strict";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {
 PROBES,VERSION,emptyYNState,analyzeMidpointResearch,nextYNBatch,summarizeYN
} from "./a05-d243-midpoint-yn-research.mjs";
const AXES=["A","B","C","D"],manifest=seed=>drawResearchHoldFilteredManifest(seed);
const all=(m,n)=>Object.fromEntries(m.questions.map(q=>[q.id,n]));
const core=(m,axis)=>m.questions.filter(q=>q.axis===axis);
const step=(s,offer,values)=>{for(const [i,item] of offer.questions.entries())s.responses[item.id]=values[i];return s;};
const axisOf=(report,axis)=>report.axes.find(x=>x.axis===axis);
function makeHeavy(m,axes=["B"],n4=5,nSkip=0){
 const bag=all(m,7);
 for(const axis of axes){
  const qs=core(m,axis);
  for(let i=0;i<n4;i++)bag[qs[i].id]=4;
  for(let i=n4;i<n4+nSkip;i++)bag[qs[i].id]=null;
 }
 return bag;
}
test("D243 probe inventory and exact research-only boundaries are independent of A05 types",()=>{
 assert.equal(PROBES.schema,"A05-D243-MIDPOINT-YN-PROBE-BANK-1");
 assert.equal(PROBES.policy.triggerCombinedMidpointOrSkippedAtLeast,5);
 assert.equal(PROBES.policy.holdAxisIfDirectionalResponsesBelow,4);
 assert.equal(PROBES.policy.maxIndependentYNPerSession,8);
 assert.equal(PROBES.policy.typeScoreEffect,"NONE");
 assert.deepEqual(PROBES.axes.map(x=>x.axis),AXES);
 const ids=PROBES.axes.flatMap(x=>x.initial.concat(x.context).map(q=>q.id));
 assert.equal(ids.length,16);
 assert.equal(new Set(ids).size,16);
 assert.ok(PROBES.axes.every(x=>x.initial[0].pole==="LEFT"&&x.initial[1].pole==="RIGHT"));
 assert.ok(ids.every(id=>id.startsWith("A05-D243-")));
});
test("D243 midpoint four is valid but distinct from null skipped; five combined triggers Y/N and holds core classification",()=>{
 const m=manifest("D243-case-01");
 const m5=makeHeavy(m,["B"],5,0),v5=analyzeMidpointResearch(m,m5),b5=axisOf(v5,"B");
 assert.equal(b5.midpointOnInitial,5);
 assert.equal(b5.skippedOnInitial,0);
 assert.equal(b5.directionalOnInitial,2);
 assert.equal(b5.numberOfAnswered,7);
 assert.equal(b5.status,"FEW_DIRECTIONAL");
 assert.equal(b5.independentYNRecommended,true);
 assert.equal(v5.numberOfCandidateTypes,2);
 const mixed=makeHeavy(m,["B"],3,2);
 const mix=axisOf(analyzeMidpointResearch(m,mixed),"B");
 assert.equal(mix.midpointOnInitial,3);
 assert.equal(mix.skippedOnInitial,2);
 assert.equal(mix.numberOfAnswered,5);
 assert.equal(mix.directionalOnInitial,2);
 assert.equal(mix.status,"FEW_DIRECTIONAL");
 assert.equal(mix.independentYNRecommended,true);
 const m4=makeHeavy(m,["B"],4,0);
 const b4=axisOf(analyzeMidpointResearch(m,m4),"B");
 assert.equal(b4.midpointOnInitial,4);
 assert.equal(b4.directionalOnInitial,3);
 assert.equal(b4.status,"FEW_DIRECTIONAL");
 assert.equal(b4.independentYNRecommended,false);
 const m3=makeHeavy(m,["B"],3,0);
 const b3=axisOf(analyzeMidpointResearch(m,m3),"B");
 assert.equal(b3.directionalOnInitial,4);
 assert.equal(b3.independentYNRecommended,false);
 assert.notEqual(b3.status,"FEW_DIRECTIONAL");
});
test("D243 all-1/all-7 are unchanged and no extra Y/N is needed",()=>{
 const m=manifest("D243-extremes");
 for(const [val,type] of [[1,"T01"],[7,"T16"]]){
  const result=analyzeMidpointResearch(m,all(m,val));
  assert.deepEqual(result.possibleTypes,[type]);
  assert.ok(result.axes.every(x=>x.status==="DIRECTIONAL"));
  assert.equal(nextYNBatch(m,all(m,val)).kind,"NONE");
 }
});
test("D243 yes/yes, no/no and mixed Y/N descriptions NEVER change the 16-type candidate set",()=>{
 const m=manifest("D243-types"),answers=makeHeavy(m,["B"],5),base=analyzeMidpointResearch(m,answers);
 for(const [left,right,interpretation] of [
  ["YES","YES","BOTH_AFFIRMED"],["NO","NO","NEITHER_AFFIRMED"],
  ["YES","NO","LEFT_ONLY"],["NO","YES","RIGHT_ONLY"],
  ["UNSURE","YES","UNRESOLVED"]
 ]){
  const state=emptyYNState();
  const initial=nextYNBatch(m,answers,state);
  assert.equal(initial.kind,"OFFER_YN");
  assert.equal(initial.stage,"INDEPENDENT_POLES");
  assert.equal(initial.axis,"B");
  step(state,initial,[left,right]);
  state.reasons.B="BOTH_STRONG";
  const report=summarizeYN(m,answers,state);
  assert.deepEqual(report.possibleTypes,base.possibleTypes);
  assert.equal(report.numberOfCandidateTypes,base.numberOfCandidateTypes);
  assert.equal(report.axisInterpretations[0].interpretation,interpretation);
  assert.equal(report.axisInterpretations[0].contributesToType,false);
  assert.equal(report.scoreEffect,"NONE");
 }
});
test("D243 two-pair optional flow: context items only for unsure or context dependence",()=>{
 const m=manifest("D243-followup");
 const answers=makeHeavy(m,["B"],5);
 const state=emptyYNState();
 const first=nextYNBatch(m,answers,state);
 assert.equal(first.kind,"OFFER_YN");
 assert.equal(first.questions.length,2);
 assert.equal(first.remainingCapacity,8);
 assert.equal(first.optional,true);
 assert.equal(first.canStop,true);
 step(state,first,["YES","NO"]);
 assert.equal(nextYNBatch(m,answers,state).kind,"NONE");
 state.reasons.B="CONTEXT_DEPENDENT";
 const second=nextYNBatch(m,answers,state);
 assert.equal(second.kind,"OFFER_YN");
 assert.equal(second.stage,"OPTIONAL_CONTEXT");
 assert.equal(second.questions.length,2);
 step(state,second,["NO","UNSURE"]);
 const done=nextYNBatch(m,answers,state);
 assert.equal(done.kind,"NONE");
 assert.equal(summarizeYN(m,answers,state).completedYN,4);
});
test("D243 four heavy axes get their 8 independent pole questions before context, never 9+",()=>{
 const m=manifest("D243-four-axes"),answers=makeHeavy(m,AXES,5);
 const state=emptyYNState(),axesSeen=[];
 for(let i=0;i<4;i++){
  const offer=nextYNBatch(m,answers,state);
  assert.equal(offer.kind,"OFFER_YN");
  assert.equal(offer.stage,"INDEPENDENT_POLES");
  assert.equal(offer.questions.length,2);
  axesSeen.push(offer.axis);
  state.reasons[offer.axis]="CONTEXT_DEPENDENT";
  step(state,offer,["UNSURE","YES"]);
 }
 assert.deepEqual(axesSeen,AXES);
 assert.equal(Object.keys(state.responses).length,8);
 assert.equal(nextYNBatch(m,answers,state).reason,"GLOBAL_8_QUESTION_CAP");
 assert.equal(summarizeYN(m,answers,state).completedYN,8);
 assert.equal(analyzeMidpointResearch(m,answers).numberOfCandidateTypes,16);
});
test("D243 incomplete/invalid/scored-Y/N answer attempts fail closed",()=>{
 const m=manifest("D243-invalid"),answers=makeHeavy(m,["B"],5);
 for(const bogus of [undefined,0,8,"4",false,NaN,4.5]){
  const wrong={...answers,[core(m,"B")[0].id]:bogus};
  assert.throws(()=>analyzeMidpointResearch(m,wrong));
 }
 const missing={...answers};delete missing[core(m,"B")[0].id];
 assert.throws(()=>analyzeMidpointResearch(m,missing));
 assert.throws(()=>analyzeMidpointResearch(m,{...answers,UNKNOWN:4}));
 const state=emptyYNState(),original=nextYNBatch(m,answers);
 for(const answer of ["7","MAYBE",true,1,null]){
  const invalid=emptyYNState();invalid.responses[original.questions[0].id]=answer;
  assert.throws(()=>summarizeYN(m,answers,invalid));
 }
 for(const reason of ["MIXED","",null,1]){
  const invalid=emptyYNState();invalid.reasons.B=reason;
  assert.throws(()=>nextYNBatch(m,answers,invalid));
 }
 const bad=emptyYNState();bad.responses["A05-D243-A-L"]="YES";
 assert.throws(()=>nextYNBatch(m,answers,bad));
 const tooEarly=emptyYNState();tooEarly.responses["A05-D243-B-C1"]="YES";
 assert.throws(()=>nextYNBatch(m,answers,tooEarly));
 assert.throws(()=>summarizeYN(m,answers,{responses:{},reasons:{},notes:"identifiable data"}));
});
test("D243 across 128 seeded forms: no scored Y/N and all held axes remain ambiguous",()=>{
 let count=0;
 for(let i=0;i<128;i++){
  const m=manifest("D243-stress-"+String(i).padStart(4,"0"));
  for(const axis of AXES){
   const answers=makeHeavy(m,[axis],5);
   const info=analyzeMidpointResearch(m,answers);
   const held=axisOf(info,axis);
   assert.equal(held.status,"FEW_DIRECTIONAL");
   assert.equal(held.independentYNRecommended,true);
   assert.equal(info.numberOfCandidateTypes,2);
   assert.equal(nextYNBatch(m,answers).axis,axis);
   count++;
  }
 }
 assert.equal(count,512);
});
