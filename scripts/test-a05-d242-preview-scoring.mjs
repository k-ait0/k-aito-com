/**
 * D242: compare the actual browser scoring functions used by generated preview
 * against independently maintained D227 research scorer, for 128 manifests.
 * CI builds HTML before running this test.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {BANK} from "./a05-d208-research-sampler.mjs";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {scoreResearchForm,planResearchFollowUp,appendResearchFollowUp} from "./a05-d227-robust-intensity-scoring.mjs";
import {scoreResponse} from "./a05-d226-answer-intensity-comparison.mjs";
const template=readFileSync(new URL("../research/a05/d219-simple-diagnosis-template.html",import.meta.url),"utf8");
const output=readFileSync(new URL("../research/a05/generated/d219-simple-diagnosis.html",import.meta.url),"utf8");
const json=output.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/);
assert.ok(json,"Missing preview JSON payload");
const data=JSON.parse(json[1]);
const begin=template.indexOf(" function scoreAnswer("),finish=template.indexOf(" function addNearType(",begin);
assert.ok(begin>0&&finish>begin,"Missing browser scoring functions");
const pure=template.slice(begin,finish);
const context={
 data, byId:new Map(data.questions.map(q=>[q.id,q])),
 axes:["A","B","C","D"],
 AXIS_MIN_VALID:5,
 POWER:1.5,
 BORDERLINE_RATIO:Math.pow(1/3,1.5),
 MAX_EXTRA_ROUNDS:2,
 manifest:null,answers:{},extraRounds:0
};
const browser=runInNewContext(pure+"\n({scoreAnswer,collectStats,candidateTypes,chooseExtras,nextOffer})",context);
const normalized=x=>JSON.parse(JSON.stringify(x));
const statusMap={DIRECTIONAL:"clear",INSUFFICIENT:"insufficient",TIE:"tie",WEAK:"borderline",FRAGILE:"fragile"};
function setup(seed,answers,after=0,offered=null){
 const m=drawResearchHoldFilteredManifest(seed);
 let ref=m;
 if(after){
  const p=planResearchFollowUp(ref,Object.fromEntries(ref.questions.map(q=>[q.id,answers[q.id]])));
  if(p.kind!=="OFFER_2")throw Error("Unavailable first two-question followup");
  ref=appendResearchFollowUp(ref,p);
 }
 context.manifest={seed,ids:ref.questions.map(q=>q.id)};
 context.answers=Object.fromEntries(ref.questions.map(q=>[q.id,answers[q.id]]));
 context.extraRounds=after?1:0;
 return ref;
}
function check(ref,answers){
 const expected=scoreResearchForm(ref,answers);
 const actual=browser.collectStats();
 for(let i=0;i<4;i++){
  const a=actual[i],b=expected.axes[i];
  assert.equal(a.axis,b.axis);
  assert.equal(a.status,statusMap[b.status],"Status mismatch: "+a.axis);
  assert.equal(a.sign,b.sign,"Sign mismatch: "+a.axis);
  assert.equal(a.n,b.valid);
  assert.equal(a.distinctFamilies,b.distinctFamilies);
  assert.equal(a.itemFlipCount,b.itemFlipCount);
  assert.equal(a.familyFlipCount,b.familyFlipCount);
  assert.ok(Math.abs(a.ratio-b.mean)<1e-11);
 }
 const types=normalized(browser.candidateTypes(actual)).map(x=>x.id);
 assert.deepEqual(types,expected.possibleTypes);
 const actualFollow=browser.nextOffer(actual);
 const expectedFollow=planResearchFollowUp(ref,answers);
 if(expectedFollow.kind==="OFFER_2"){
  assert.equal(actualFollow?.axis,expectedFollow.axis);
  assert.deepEqual(normalized(actualFollow.ids),expectedFollow.questionIds);
 }else assert.equal(actualFollow,null);
}
test("D242 preview version, 128 D224-held-safe manifests, all 16 types",()=>{
 assert.equal(data.scoringVersion,"A05-D242-POWER-1_5-RESEARCH-PREVIEW-1");
 assert.equal(data.scoringPower,1.5);
 assert.match(data.scoringValidation,/NOT_PSYCHOMETRICALLY_VALIDATED/);
 assert.equal(data.manifests.length,128);
 assert.deepEqual(data.excludedCoreScoringIds,["A05-V1-31","A05-V1-32","A05-V1-36"]);
 for(const m of data.manifests){
  const ref=drawResearchHoldFilteredManifest(m.seed);
  assert.deepEqual(m.ids,ref.questions.map(x=>x.id));
  assert.ok(m.ids.every(id=>!data.excludedCoreScoringIds.includes(id)));
 }
 assert.equal(data.types.length,16);
});
test("D242 browser seven-value score formula equals research scoreResponse",()=>{
 for(let x=1;x<=7;x++){
  assert.ok(Math.abs(browser.scoreAnswer(x)-scoreResponse(x,1.5))<1e-12,"answer "+x);
  assert.ok(Math.abs(browser.scoreAnswer(x)+browser.scoreAnswer(8-x))<1e-12);
 }
 assert.equal(browser.scoreAnswer(4),0);
});
test("D242 browser and D227 agree on 128 manifests and 8 answer styles",()=>{
 const patterns=["all7","all1","all4","all5","all6","alternate","pseudo","skips"];
 let count=0;
 for(const m of data.manifests){
  const ref=drawResearchHoldFilteredManifest(m.seed);
  for(const pattern of patterns){
   const answers={};
   for(let i=0;i<ref.questions.length;i++){
    const q=ref.questions[i];
    answers[q.id]=pattern==="all7"?7:pattern==="all1"?1:pattern==="all4"?4:
     pattern==="all5"?5:pattern==="all6"?6:pattern==="alternate"?(i%2?7:1):
     pattern==="skips"?(i%11===0?null:((i*7+3)%7)+1):
     ((i*17+m.seed.length+i*i)%7)+1;
   }
   setup(m.seed,answers);
   check(ref,answers);count++;
  }
 }
 assert.equal(count,1024);
});
test("D242 browser and D227 agree on 32-question followup with original 30 responses frozen",()=>{
 for(let i=0;i<40;i++){
  const m=data.manifests[i],ref=drawResearchHoldFilteredManifest(m.seed);
  const answers=Object.fromEntries(BANK.items.map(x=>[x.bank_id,4]));
  // Preserve the underlying 30-item map and allow generated follow-up replies.
  const picked=Object.fromEntries(ref.questions.map(q=>[q.id,answers[q.id]]));
  const offer=planResearchFollowUp(ref,picked);
  assert.equal(offer.kind,"OFFER_2");
  const follow=appendResearchFollowUp(ref,offer);
  for(const id of offer.questionIds)answers[id]=i%2?4:7;
  const subset=Object.fromEntries(follow.questions.map(q=>[q.id,answers[q.id]]));
  context.manifest={seed:m.seed,ids:follow.questions.map(q=>q.id)};
  context.answers=subset;context.extraRounds=1;
  check(follow,subset);
 }
});
