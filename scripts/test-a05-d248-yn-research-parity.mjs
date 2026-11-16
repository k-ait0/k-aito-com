/**
 * D248 — compare the D246 shipped browser computation against the independent
 * D243 research-only mathematical implementation. Zero human records.
 * Covers all 128 hold-filtered 30-item manifests, several boundary/skip
 * patterns and 30->32->34 item states when research followups are available.
 * Y/N must NEVER alter A/B/C/D scores or the 16-type candidate set.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {scoreResearchForm,planResearchFollowUp,appendResearchFollowUp} from "./a05-d227-robust-intensity-scoring.mjs";
import {
 analyzeMidpointResearch,nextYNBatch,emptyYNState,summarizeYN
} from "./a05-d243-midpoint-yn-research.mjs";
const tpl=readFileSync(new URL("../research/a05/d246-isolated-yn-preview-template.html",import.meta.url),"utf8");
const generated=readFileSync(new URL("../research/a05/generated/d246-isolated-midpoint-yn-preview.html",import.meta.url),"utf8");
const match=generated.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/);
assert.ok(match,"D246 inline JSON is missing");
const data=JSON.parse(match[1]);
const start=tpl.indexOf(" function scoreAnswer("),end=tpl.indexOf(" function addNearType(",start);
const ynStart=tpl.indexOf(" function eligibleYNAxes("),ynEnd=tpl.indexOf(" function openYN(",ynStart);
assert.ok(start>=0&&end>start&&ynStart>0&&ynEnd>ynStart,"D246 scoring hooks moved, update parity audit");
const code=tpl.slice(start,end)+"\n"+tpl.slice(ynStart,ynEnd);
const context={
 data,byId:new Map(data.questions.map(q=>[q.id,q])),
 axes:["A","B","C","D"],AXIS_MIN_VALID:5,POWER:1.5,
 BORDERLINE_RATIO:Math.pow(1/3,1.5),MAX_EXTRA_ROUNDS:2,
 manifest:null,answers:null,initialCount:30,extraRounds:0,
 ynState:null
};
const site=runInNewContext(code+"\n({collectStats,candidateTypes,planYN})",context);
const plain=x=>JSON.parse(JSON.stringify(x));
const statuses={FEW_DIRECTIONAL:"few_directional",DIRECTIONAL:"clear",
 INSUFFICIENT:"insufficient",TIE:"tie",WEAK:"borderline",FRAGILE:"fragile"};
function setup(m,answers){
 context.manifest={ids:m.questions.map(q=>q.id),seed:m.seed};
 context.initialCount=30;
 context.extraRounds=(m.questions.length-30)/2;
 context.answers=answers;
 context.ynState=emptyYNState();
}
function compare(m,answers){
 setup(m,answers);
 const baseline=scoreResearchForm(m,answers),expected=analyzeMidpointResearch(m,answers);
 const stats=plain(site.collectStats());
 assert.equal(stats.length,4);
 for(let i=0;i<4;i++){
  const a=stats[i],b=expected.axes[i],core=baseline.axes[i];
  assert.equal(a.axis,b.axis);
  assert.equal(a.status,statuses[b.status],m.seed+" "+a.axis);
  assert.equal(a.midpointOnInitial,b.midpointOnInitial);
  assert.equal(a.skippedOnInitial,b.skippedOnInitial);
  assert.equal(a.directionalCurrent,b.directionalCurrent);
  assert.equal(a.n,b.numberOfAnswered);
  assert.equal(a.distinctFamilies,core.distinctFamilies);
  assert.equal(a.itemFlipCount,core.itemFlipCount);
  assert.equal(a.familyFlipCount,core.familyFlipCount);
  assert.equal(a.sign,core.sign);
  assert.ok(Math.abs(a.ratio-core.mean)<1e-12);
 }
 assert.deepEqual(plain(site.candidateTypes(stats)).map(t=>t.id),expected.possibleTypes);
 let promptCount=0;
 while(promptCount<8){
  const ref=nextYNBatch(m,answers,context.ynState);
  const rendered=plain(site.planYN(stats));
  if(ref.kind==="NONE"){assert.equal(rendered,null);break;}
  assert.ok(rendered,"The browser failed to suggest an eligible Y/N pair");
  assert.equal(rendered.axis,ref.axis);
  assert.equal(rendered.stage,ref.stage);
  assert.deepEqual(rendered.questions.map(q=>q.id),ref.questions.map(q=>q.id));
  for(const q of ref.questions){
   const reply=promptCount%3===0?"UNSURE":promptCount%3===1?"YES":"NO";
   context.ynState.responses[q.id]=reply;
   promptCount++;
  }
  if(promptCount%4===2)context.ynState.reasons[ref.axis]="CONTEXT_DEPENDENT";
 }
 assert.ok(promptCount<=8);
 assert.equal(plain(site.planYN(stats)),null,"Y/N should be fully handled within cap");
 const final=summarizeYN(m,answers,context.ynState);
 assert.deepEqual(final.possibleTypes,expected.possibleTypes);
 assert.equal(final.scoreEffect,"NONE");
 return {candidateCount:expected.numberOfCandidateTypes,prompts:promptCount,
  heavy:expected.axes.filter(a=>a.independentYNRecommended).length};
}
function make(m,pattern){
 const axes={A:[],B:[],C:[],D:[],E:[]};
 for(const q of m.questions)axes[q.axis].push(q.id);
 const answers=Object.fromEntries(m.questions.map(q=>[q.id,7]));
 const set=(axis,nMid,nSkip=0)=>{
  for(let i=0;i<nMid;i++)answers[axes[axis][i]]=4;
  for(let i=nMid;i<nMid+nSkip;i++)answers[axes[axis][i]]=null;
 };
 switch(pattern){
  case "all1":for(const id in answers)answers[id]=1;break;
  case "all4":for(const id in answers)answers[id]=4;break;
  case "allSkip":for(const id in answers)answers[id]=null;break;
  case "five4_B":set("B",5);break;
  case "four4_B":set("B",4);break;
  case "three4_twoSkip_B":set("B",3,2);break;
  case "fiveSkip_C":set("C",0,5);break;
  case "three4_fourSkip_A":set("A",3,4);break;
  case "allAxesFive4":for(const axis of ["A","B","C","D"])set(axis,5);break;
  case "mixed":
   for(let i=0;i<m.questions.length;i++)answers[m.questions[i].id]=i%11===0?null:(i*7+(i*i)%3)%7+1;
   break;
 }
 return answers;
}
test("D248 version contract and all shipped 128 D224 manifests",()=>{
 assert.equal(data.ynVersion,"A05-D246-ISOLATED-Y-N-PREVIEW-1");
 assert.equal(data.scoringPower,1.5);
 assert.equal(data.manifests.length,128);
 for(const item of data.manifests){
  const m=drawResearchHoldFilteredManifest(item.seed);
  assert.deepEqual(item.ids,m.questions.map(x=>x.id));
  assert.ok(item.ids.every(id=>!data.excludedCoreScoringIds.includes(id)));
 }
});
test("D248 128x11 generated 30Q profiles agree with D243 and independent Y/N planner",()=>{
 const patterns=["all7","all1","all4","allSkip","five4_B","four4_B",
  "three4_twoSkip_B","fiveSkip_C","three4_fourSkip_A","allAxesFive4","mixed"];
 let cases=0,heavy=0,prompts=0;
 for(const meta of data.manifests){
  const m=drawResearchHoldFilteredManifest(meta.seed);
  for(const pattern of patterns){
   const r=compare(m,make(m,pattern));
   cases++;heavy+=r.heavy;prompts+=r.prompts;
  }
 }
 assert.equal(cases,1408);
 assert.ok(heavy>0&&prompts>0);
});
test("D248 32Q and 34Q research continuations preserve signed evidence and Y/N isolation",()=>{
 let n=0;
 for(const item of data.manifests.slice(0,32)){
  const base=drawResearchHoldFilteredManifest(item.seed);
  let m=base,answer=Object.fromEntries(m.questions.map(q=>[q.id,4]));
  for(let round=0;round<3;round++){
   const score=compare(m,answer);
   assert.equal(score.candidateCount,16);
   n++;
   if(round===2)break;
   const offer=planResearchFollowUp(m,answer);
   if(offer.kind!=="OFFER_2")break;
   m=appendResearchFollowUp(m,offer);
   answer=Object.fromEntries(m.questions.map(q=>[q.id,4]));
  }
 }
 assert.ok(n>=64,"Additional questions should exercise 30 and 32 variants");
});
