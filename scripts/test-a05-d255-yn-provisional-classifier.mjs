import test from "node:test";
import assert from "node:assert/strict";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {analyzeMidpointResearch,PROBES} from "./a05-d243-midpoint-yn-research.mjs";
import {D255_VERSION,d255Analyze,d255NextBatch} from "./a05-d255-yn-provisional-classifier.mjs";

const status={FEW_DIRECTIONAL:"few_directional",DIRECTIONAL:"clear",
 INSUFFICIENT:"insufficient",TIE:"tie",WEAK:"borderline",FRAGILE:"fragile"};
function create(pattern="allSkip",seed="D255-000"){
 const manifest=drawResearchHoldFilteredManifest(seed);
 const counts={A:0,B:0,C:0,D:0,E:0};
 const answers={};
 for(const q of manifest.questions){
  const idx=counts[q.axis]++;
  answers[q.id]=pattern==="allSkip"?null:pattern==="all4"?4:
   pattern==="B4"?q.axis==="B"&&idx<4?4:7:
   pattern==="B5"?q.axis==="B"&&idx<5?4:7:7;
 }
 const base=analyzeMidpointResearch(manifest,answers);
 return {manifest,answers,base,stats:base.axes.map(s=>({
  axis:s.axis,presented:s.currentPresented,status:status[s.status],sign:s.direction,
  midpointOnInitial:s.midpointOnInitial,skippedOnInitial:s.skippedOnInitial
 }))};
}
function state(){return {responses:{},reasons:{}};}
function assignPair(s,axis,left,right,stage="initial"){
 const def=PROBES.axes.find(x=>x.axis===axis);
 const pair=def[stage];
 s.responses[pair[0].id]=left;
 s.responses[pair[1].id]=right;
}
test("D255 is research only and all 7-point-clear axes produce no extra question",()=>{
 const x=create("all7"),s=state(),r=d255Analyze(x.stats,s,PROBES);
 assert.equal(r.schema,D255_VERSION);
 assert.equal(r.scoringApproved,false);
 assert.equal(r.validated,false);
 assert.equal(r.numberOfCandidateTypes,1);
 assert.equal(d255NextBatch(x.stats,s,PROBES),null);
 assert.equal(x.base.numberOfCandidateTypes,1);
});
test("all 30 skipped: two Y/N per axis can produce ONE provisional profile without changing original 16 candidates",()=>{
 const x=create("allSkip"),s=state();
 assert.equal(x.base.numberOfCandidateTypes,16);
 let stage=[];
 while(true){
  const offer=d255NextBatch(x.stats,s,PROBES);
  if(!offer)break;
  stage.push(offer.axis);
  assert.equal(offer.stage,"INDEPENDENT_POLES");
  for(const q of offer.questions)s.responses[q.id]=q.pole==="LEFT"?"YES":"NO";
 }
 const report=d255Analyze(x.stats,s,PROBES);
 assert.deepEqual(stage,["A","B","C","D"]);
 assert.equal(Object.keys(s.responses).length,8);
 assert.equal(report.numberOfCandidateTypes,1);
 assert.deepEqual(report.candidateIds,["T01"]);
 assert.equal(report.ynDeterminedAxes,4);
 assert.equal(x.base.numberOfCandidateTypes,16);
 assert.equal(d255NextBatch(x.stats,s,PROBES),null);
});
test("all 4 is distinct input but same unresolved baseline; YES/YES and NO/NO cannot create a directional sign",()=>{
 const x=create("all4"),s=state();
 assignPair(s,"A","YES","YES");
 assignPair(s,"B","NO","NO");
 const result=d255Analyze(x.stats,s,PROBES);
 assert.equal(result.axes[0].sign,0);
 assert.equal(result.axes[1].sign,0);
 assert.equal(result.numberOfCandidateTypes,16);
 const offer=d255NextBatch(x.stats,s,PROBES);
 assert.equal(offer.axis,"C"); // distribute initial pairs before optional context
});
test("four midpoint responses on B still trigger Y/N, unlike old 5/7-only offer rule",()=>{
 const x=create("B4"),s=state();
 assert.equal(x.base.numberOfCandidateTypes,2);
 const first=d255NextBatch(x.stats,s,PROBES);
 assert.equal(first.axis,"B");
 assignPair(s,"B","NO","YES");
 const report=d255Analyze(x.stats,s,PROBES);
 assert.equal(report.numberOfCandidateTypes,1);
 assert.equal(report.axes.find(a=>a.axis==="B").source,"YN_INITIAL_PROVISIONAL");
});
test("same-pole initial pair can be distinguished only by a separate contextual Y/N contrast",()=>{
 const x=create("B5"),s=state();
 assignPair(s,"B","YES","YES");
 assert.equal(d255Analyze(x.stats,s,PROBES).numberOfCandidateTypes,2);
 const offer=d255NextBatch(x.stats,s,PROBES);
 assert.equal(offer.axis,"B");
 assert.equal(offer.stage,"OPTIONAL_CONTEXT");
 assignPair(s,"B","YES","NO","context");
 const report=d255Analyze(x.stats,s,PROBES);
 assert.equal(report.numberOfCandidateTypes,1);
 assert.equal(report.axes.find(a=>a.axis==="B").source,"YN_CONTEXT_PROVISIONAL");
});
test("explicit context dependence delays initial directional Y/N and contradictory context holds",()=>{
 const x=create("B5"),s=state();
 assignPair(s,"B","YES","NO");
 s.reasons.B="CONTEXT_DEPENDENT";
 assert.equal(d255Analyze(x.stats,s,PROBES).numberOfCandidateTypes,2);
 assert.equal(d255NextBatch(x.stats,s,PROBES).stage,"OPTIONAL_CONTEXT");
 assignPair(s,"B","NO","YES","context");
 const r=d255Analyze(x.stats,s,PROBES);
 assert.equal(r.axes.find(a=>a.axis==="B").reason,"CONTRADICTORY_PAIRS");
 assert.equal(r.numberOfCandidateTypes,2);
});
test("UNSURE and missing counterpart do not count as negative answers",()=>{
 const x=create("B5"),s=state(),b=PROBES.axes.find(z=>z.axis==="B");
 s.responses[b.initial[0].id]="YES";
 assert.equal(d255Analyze(x.stats,s,PROBES).numberOfCandidateTypes,2);
 assert.deepEqual(d255NextBatch(x.stats,s,PROBES).questions.map(q=>q.id),[b.initial[1].id]);
 s.responses[b.initial[1].id]="UNSURE";
 assert.equal(d255Analyze(x.stats,s,PROBES).numberOfCandidateTypes,2);
 assert.equal(d255NextBatch(x.stats,s,PROBES).stage,"OPTIONAL_CONTEXT");
});
test("validation rejects unknown Y/N, premature context and ninth answer",()=>{
 const x=create("allSkip"),s=state();
 s.responses.unknown="YES";
 assert.throws(()=>d255Analyze(x.stats,s,PROBES),/unknown/);
 delete s.responses.unknown;
 const d=PROBES.axes[0];
 s.responses[d.context[0].id]="YES";
 assert.throws(()=>d255Analyze(x.stats,s,PROBES),/context/);
 s.responses={};
 for(const axis of PROBES.axes)assignPair(s,axis.axis,"YES","NO");
 s.responses[d.context[0].id]="YES";
 assert.throws(()=>d255Analyze(x.stats,s,PROBES),/8 Y\/N/);
});
test("128 manifests x allSkip/all4/B4: initial 30-item core and Y/N-only stage never mutate each other",()=>{
 let n=0;
 for(let i=0;i<128;i++){
  for(const pattern of ["allSkip","all4","B4"]){
   const x=create(pattern,"D219-simple-"+String(i).padStart(3,"0"));
   const old=JSON.stringify(x.answers), oldCandidates=JSON.stringify(x.base.possibleTypes);
   const state0=state();
   const offer=d255NextBatch(x.stats,state0,PROBES);
   assert.ok(offer?.questions.length>=1&&offer.questions.length<=2);
   assert.ok(offer.questions.every(q=>q.id.startsWith("A05-D243-")));
   assert.equal(JSON.stringify(x.answers),old);
   assert.equal(JSON.stringify(x.base.possibleTypes),oldCandidates);
   n++;
  }
 }
 assert.equal(n,384);
});
