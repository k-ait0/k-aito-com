/**
 * A05 D273 | independent contract examples, NOT browser/node parity.
 *
 * Test inputs + expected results are separately written analytical examples.
 * The oracle does not import the implementation score transformation or the
 * D269 browser-parity harness, and never derives expected values by calling
 * the subject under test.
 *
 * All fixtures are synthetic. No listener, DB, external HTTP, or production.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {scoreResearchForm} from "./a05-d227-robust-intensity-scoring.mjs";
import {analyzeMidpointResearch,PROBES,summarizeYN} from "./a05-d243-midpoint-yn-research.mjs";
import {d255Analyze,d255NextBatch} from "./a05-d255-yn-provisional-classifier.mjs";

const AXES=["A","B","C","D"];
const LOW=0.19245008972987526; // exact analytic sqrt(1/27) rounded to IEEE double
const TWO_THIRDS=0.5443310539518174; // sqrt(8/27)
const margin=1e-12;

function almost(actual,expected,label){
 assert.ok(Math.abs(actual-expected)<=margin,
  label+" expected "+expected+" but got "+actual);
}
const form=seed=>drawResearchHoldFilteredManifest(seed);
const all=(m,value)=>Object.fromEntries(m.questions.map(q=>[q.id,value]));
const subset=(m,axis)=>m.questions.filter(q=>q.axis===axis);
const axis=(obj,id)=>obj.axes.find(x=>x.axis===id);
function clone(obj){return structuredClone(obj);}
function pairState(id,left,right,stage="initial"){
 const ref=PROBES.axes.find(x=>x.axis===id)[stage];
 return {responses:{[ref[0].id]:left,[ref[1].id]:right},reasons:{}};
}
function fixtureStats(bStatus="few_directional",signs={A:1,B:0,C:1,D:1}){
 return AXES.map(k=>({
  axis:k,presented:7,status:k==="B"?bStatus:"clear",sign:signs[k],
  midpointOnInitial:k==="B"?4:0,skippedOnInitial:0
 }));
}
function disjointFamilyItems(m,axisId,n){
 const found=[],seen=new Set();
 for(const q of subset(m,axisId)){
  if(seen.has(q.provisionalFamily))continue;
  seen.add(q.provisionalFamily);found.push(q);
  if(found.length===n)return found;
 }
 throw Error("D273 fixture cannot find "+n+" independent "+axisId+" families");
}
function pairedFamilyItems(m,axisId){
 const items=subset(m,axisId);
 const first=items.find(a=>items.some(b=>a.id!==b.id&&a.provisionalFamily===b.provisionalFamily));
 if(!first)throw Error("D273 expected a duplicated semantic family");
 const second=items.find(b=>b.id!==first.id&&b.provisionalFamily===first.provisionalFamily);
 const rest=items.filter(x=>x.id!==first.id&&x.id!==second.id);
 assert.equal(rest.length,5);
 assert.equal(new Set(rest.map(x=>x.provisionalFamily)).size,5);
 return {pair:[first,second],rest};
}

// These values are fixed by the published formula, independently of any scorer:
// for answer a, signed intensity = sign(a-4)*sqrt(|a-4|^3/27).
test("D273-01 analytic intensity constants: 1,2,3,4,5,6,7",()=>{
 const m=form("D219-simple-000");
 const values=[
  [1,-1],[2,-TWO_THIRDS],[3,-LOW],[4,0],
  [5,LOW],[6,TWO_THIRDS],[7,1]
 ];
 for(const [v,expected] of values){
  const report=scoreResearchForm(m,all(m,v));
  for(const a of report.axes){
   almost(a.mean,expected,"answer "+v+" "+a.axis);
   assert.equal(a.valid,7);
   if(v===4)assert.equal(a.status,"TIE");
   if(v===3||v===5)assert.equal(a.status,"WEAK",
    "At exactly the uncalibrated weak cutoff, axis must be held");
  }
 }
});
test("D273-02 fixed 16-type algebra for all-left, all-right, all-midpoint and all-skipped",()=>{
 const m=form("D219-simple-001");
 for(const [val,expected,kind] of [
  [1,["T01"],"SINGLE_PROVISIONAL"],
  [7,["T16"],"SINGLE_PROVISIONAL"],
  [4,Array.from({length:16},(_,i)=>"T"+String(i+1).padStart(2,"0")),"WITHHELD"],
  [null,Array.from({length:16},(_,i)=>"T"+String(i+1).padStart(2,"0")),"WITHHELD"]
 ]){
  const res=analyzeMidpointResearch(m,all(m,val));
  assert.deepEqual(res.possibleTypes,expected,"candidate truth table for "+val);
  assert.equal(res.resultKind,kind);
  if(val===4){
   assert.ok(res.axes.every(x=>x.numberOfAnswered===7&&x.midpointOnInitial===7));
  }
  if(val===null){
   assert.ok(res.axes.every(x=>x.numberOfAnswered===0&&x.skippedOnInitial===7));
  }
 }
});
test("D273-03 E auxiliary data never changes A-D scores or 16 candidate types",()=>{
 const m=form("D219-simple-002");
 const origin=all(m,7);
 const ref=scoreResearchForm(m,origin);
 for(const value of [1,4,null]){
  const changed={...origin};
  for(const q of subset(m,"E"))changed[q.id]=value;
  const after=scoreResearchForm(m,changed);
  assert.deepEqual(after.axes,ref.axes);
  assert.deepEqual(after.possibleTypes,["T16"]);
  assert.equal(after.numberOfCandidateTypes,1);
 }
});
test("D273-04 four directional answers vs three: independent D243 minimum-four boundary",()=>{
 const m=form("D219-simple-003"), qs=subset(m,"B");
 for(const [directional,expectedStatus,expectedYNOffer] of [
  [3,"FEW_DIRECTIONAL",true],[4,"DIRECTIONAL",false]
 ]){
  const bag=all(m,7);
  for(let i=directional;i<7;i++)bag[qs[i].id]=4;
  const scored=scoreResearchForm(m,bag);
  assert.equal(axis(scored,"B").status,"DIRECTIONAL",
   "D227 alone does not implement directional count hold");
  const held=analyzeMidpointResearch(m,bag);
  assert.equal(axis(held,"B").status,expectedStatus);
  assert.equal(axis(held,"B").directionalCurrent,directional);
  assert.equal(axis(held,"B").independentYNRecommended,expectedYNOffer);
  assert.deepEqual(held.possibleTypes,directional===3?["T12","T16"]:["T16"]);
 }
});
test("D273-05 exact validity boundary: 4 valid answers is insufficient even with 4 families",()=>{
 const m=form("D219-simple-004"),qs=disjointFamilyItems(m,"B",4);
 const bag=all(m,null);
 for(const q of m.questions.filter(q=>q.axis!=="B"))bag[q.id]=7;
 for(const q of qs)bag[q.id]=7;
 const result=scoreResearchForm(m,bag),b=axis(result,"B");
 assert.equal(b.valid,4);
 assert.equal(b.distinctFamilies,4);
 assert.equal(b.status,"INSUFFICIENT");
 assert.deepEqual(result.possibleTypes,["T12","T16"]);
 assert.equal(axis(analyzeMidpointResearch(m,bag),"B").status,"INSUFFICIENT");
});
test("D273-06 exact item deletion sensitivity: five independent families, +++--",()=>{
 const m=form("D219-simple-005"),qs=disjointFamilyItems(m,"B",5);
 const bag=all(m,null);
 for(const q of m.questions.filter(q=>q.axis!=="B"))bag[q.id]=7;
 qs.forEach((q,i)=>bag[q.id]=i<3?7:1);
 // Three +1 and two -1 sum to +1, average +1/5=0.2 > sqrt(1/27).
 // Removing ANY of the three +1 answers makes sum exactly 0.
 const result=scoreResearchForm(m,bag),b=axis(result,"B");
 assert.equal(b.valid,5);
 assert.equal(b.distinctFamilies,5);
 almost(b.mean,0.2,"five-answer signed mean");
 assert.equal(b.sign,1);
 assert.equal(b.itemFlipCount,3);
 assert.equal(b.familyFlipCount,3);
 assert.equal(b.status,"FRAGILE");
 assert.deepEqual(result.possibleTypes,["T12","T16"]);
});
test("D273-07 exact semantic-family deletion: duplicated +1 family masks 0 remainder",()=>{
 const m=form("D219-simple-006"),{pair,rest}=pairedFamilyItems(m,"B");
 const bag=all(m,7);
 for(const q of pair)bag[q.id]=7;
 [1,1,7,7,4].forEach((v,i)=>bag[rest[i].id]=v);
 // +2 from duplicated family; all other five sum 0. Sum=2, mean=2/7.
 // Removing one +1 item preserves sign, removing the whole +2 family does not.
 const b=axis(scoreResearchForm(m,bag),"B");
 almost(b.mean,2/7,"family fragility mean");
 assert.equal(b.distinctFamilies,6);
 assert.equal(b.itemFlipCount,0);
 assert.equal(b.familyFlipCount,1);
 assert.equal(b.status,"FRAGILE");
});
test("D273-08 UNKNOWN versus NOT_APPLICABLE are distinct, neither counts as midpoint 4",()=>{
 const m=form("D219-simple-007"), qs=subset(m,"B");
 const bag=all(m,7);
 bag[qs[0].id]=4;
 bag[qs[1].id]=4;
 bag[qs[2].id]=4;
 bag[qs[3].id]=null; // supplied reason is tracked in the D269 adapter, not D227
 bag[qs[4].id]=null;
 const b=axis(analyzeMidpointResearch(m,bag),"B");
 assert.equal(b.numberOfAnswered,5);
 assert.equal(b.midpointOnInitial,3);
 assert.equal(b.skippedOnInitial,2);
 assert.equal(b.directionalOnInitial,2);
 assert.equal(b.combinedOnInitial,5);
 assert.equal(b.status,"FEW_DIRECTIONAL");
 assert.equal(b.independentYNRecommended,true);
});
test("D273-09 fixed 16-type sign truth table independent of implementation type mapper",()=>{
 const m=form("D219-simple-008");
 const vals=all(m,1);
 // A-, B+, C-, D+ means second group and second member: T06.
 for(const q of subset(m,"B"))vals[q.id]=7;
 for(const q of subset(m,"D"))vals[q.id]=7;
 const r=analyzeMidpointResearch(m,vals);
 assert.deepEqual(r.possibleTypes,["T06"]);
 assert.deepEqual(r.axes.map(x=>x.direction),[-1,1,-1,1]);
});
test("D273-10 D255 Y/N opposing poles: manually enumerated result sets",()=>{
 const s=fixtureStats();
 const cases=[
  ["YES","NO","T12",-1,"YN_INITIAL_PROVISIONAL"],
  ["NO","YES","T16",1,"YN_INITIAL_PROVISIONAL"],
  ["YES","YES",null,0,"UNRESOLVED"],
  ["NO","NO",null,0,"UNRESOLVED"],
  ["UNSURE","NO",null,0,"UNRESOLVED"]
 ];
 for(const [left,right,t,sign,source] of cases){
  const state=pairState("B",left,right);
  const result=d255Analyze(s,state,PROBES);
  assert.equal(axis(result,"B").sign,sign);
  assert.equal(axis(result,"B").source,source);
  assert.deepEqual(result.candidateIds,t?[t]:["T12","T16"]);
  assert.equal(result.scoringApproved,false);
  assert.equal(result.validated,false);
 }
});
test("D273-11 provisional Y/N context and contradictory pairs do not assert certainty",()=>{
 const s=fixtureStats();
 const same=pairState("B","YES","YES");
 const pair=PROBES.axes.find(x=>x.axis==="B").context;
 same.responses[pair[0].id]="YES";
 same.responses[pair[1].id]="NO";
 const a=d255Analyze(s,same,PROBES);
 assert.equal(axis(a,"B").source,"YN_CONTEXT_PROVISIONAL");
 assert.deepEqual(a.candidateIds,["T12"]);
 const deferral=pairState("B","YES","NO");
 deferral.reasons.B="CONTEXT_DEPENDENT";
 assert.deepEqual(d255Analyze(s,deferral,PROBES).candidateIds,["T12","T16"]);
 assert.equal(d255NextBatch(s,deferral,PROBES).stage,"OPTIONAL_CONTEXT");
 deferral.responses[pair[0].id]="NO";
 deferral.responses[pair[1].id]="YES";
 const conflict=d255Analyze(s,deferral,PROBES);
 assert.equal(axis(conflict,"B").reason,"CONTRADICTORY_PAIRS");
 assert.equal(axis(conflict,"B").sign,0);
 assert.deepEqual(conflict.candidateIds,["T12","T16"]);
});
test("D273-12 global eight-question Y/N cap with independent fixed T06 answer",()=>{
 const allUnknown=AXES.map(id=>({
  axis:id,presented:7,status:"few_directional",sign:0,
  midpointOnInitial:7,skippedOnInitial:0
 }));
 const state={responses:{},reasons:{}};
 const assignments={
  A:["YES","NO"],B:["NO","YES"],C:["YES","NO"],D:["NO","YES"]
 };
 for(const id of AXES){
  const offer=d255NextBatch(allUnknown,state,PROBES);
  assert.equal(offer.axis,id);
  assert.equal(offer.questions.length,2);
  const [l,r]=PROBES.axes.find(x=>x.axis===id).initial;
  state.responses[l.id]=assignments[id][0];
  state.responses[r.id]=assignments[id][1];
 }
 assert.equal(Object.keys(state.responses).length,8);
 const r=d255Analyze(allUnknown,state,PROBES);
 assert.deepEqual(r.candidateIds,["T06"]);
 assert.equal(r.ynDeterminedAxes,4);
 assert.equal(d255NextBatch(allUnknown,state,PROBES),null);
 const extra=clone(state);
 extra.responses[PROBES.axes[0].context[0].id]="YES";
 assert.throws(()=>d255Analyze(allUnknown,extra,PROBES),/8 Y\/N/);
});
test("D273-13 legacy D243 and later D255 differ in Y/N type-use policy; flag, do not conflate",()=>{
 const m=form("D219-simple-009"),bag=all(m,7);
 const bq=subset(m,"B");
 for(let i=0;i<5;i++)bag[bq[i].id]=4;
 const initial=analyzeMidpointResearch(m,bag);
 assert.deepEqual(initial.possibleTypes,["T12","T16"]);
 const state=pairState("B","YES","NO");
 const legacy=summarizeYN(m,bag,state);
 assert.deepEqual(legacy.possibleTypes,["T12","T16"]);
 assert.equal(legacy.axisInterpretations[0].contributesToType,false);
 const s=initial.axes.map(x=>({
  axis:x.axis,presented:7,status:x.status==="FEW_DIRECTIONAL"?"few_directional":"clear",
  sign:x.direction,midpointOnInitial:x.midpointOnInitial,
  skippedOnInitial:x.skippedOnInitial
 }));
 const later=d255Analyze(s,state,PROBES);
 assert.deepEqual(later.candidateIds,["T12"]);
 assert.equal(axis(later,"B").source,"YN_INITIAL_PROVISIONAL");
 // The change from descriptive-only D243 to provisional narrowing D255 must
 // be explicitly accepted as a versioned behavior, not called backward-compatible.
});
console.log("A05_D273_INDEPENDENT_CONTRACT_ORACLE_LOADED research_only=true synthetic_only=true");
