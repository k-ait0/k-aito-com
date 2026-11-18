import test from "node:test";
import assert from "node:assert/strict";
import {BANK,drawResearchManifest} from "./a05-d208-research-sampler.mjs";
import {summarizePilot} from "./a05-d235-full50-pilot-aggregator.mjs";
const digest=drawResearchManifest("D235-fixture").bankDigest;
function fixture(seed,value,probes={}){
 return {schema:"A05-D210-RESEARCH-SESSION-1",mode:"full50",consent:true,
  bankVersion:BANK.schema,bankDigest:digest,seed,order:BANK.items.map(q=>q.bank_id),
  answers:Object.fromEntries(BANK.items.map(q=>[q.bank_id,value])),probes,notes:"private_free_text_NOT_FOR_OUTPUT",
  pairReviews:{},index:50};
}
const clone=structuredClone;
test("D235 no files/data = no outcome, not a made-up validated sample",()=>{
 const result=summarizePilot([],{forms:4});
 assert.equal(result.status,"NO_ELIGIBLE_REAL_DATA");
 assert.equal(result.acceptedRecords,0);
 assert.equal(result.formAssessments,0);
 assert.equal(result.rawAnswersExported,false);
 assert.equal(result.empiricalTruthLabelsAvailable,false);
 assert.equal(result.coreCandidateCounts["1"],0);
});
test("D235 two synthetic fixtures: 7 means clear direction, 4 means withheld; B/C both-high counted descriptively",()=>{
 const x=fixture("D235-seven",7,{B_AUTONOMY:7,B_CONNECTION:7,C_FUTURE:1,C_PRESENT:1});
 const y=fixture("D235-neutral",4,{B_AUTONOMY:1,B_CONNECTION:7,C_FUTURE:7,C_PRESENT:1});
 const result=summarizePilot([x,y],{forms:12});
 assert.equal(result.status,"PILOT_SUMMARY_NOT_VALIDATED");
 assert.equal(result.acceptedRecords,2);
 assert.equal(result.formAssessments,24);
 assert.equal(result.coreCandidateCounts["1"],12);
 assert.equal(result.coreCandidateCounts["16"],12);
 assert.equal(result.bothValued.B.both_high,1);
 assert.equal(result.bothValued.B.opposite,1);
 assert.equal(result.bothValued.C.both_low,1);
 assert.equal(result.bothValued.C.opposite,1);
 for(const a of Object.values(result.axes)){
  assert.equal(a.formsPositivePower15,12);
  assert.equal(a.formsTieOrInsufficientPower15,12);
  assert.equal(a.switchPeoplePower15,0);
 }
 const json=JSON.stringify(result);
 assert.ok(!json.includes("private_free_text_NOT_FOR_OUTPUT"));
 assert.ok(!json.includes("D235-seven"));
 assert.ok(!json.includes("A05-V1-01"));
});
test("D235 rejects incomplete or invalid snapshots without emitting raw answers",()=>{
 const good=fixture("D235-valid",5);
 const variants=[
  x=>x.consent=false,
  x=>x.mode="ux30",
  x=>x.bankDigest="not-current",
  x=>x.seed="",
  x=>x.order.pop(),
  x=>x.order[2]=x.order[1],
  x=>delete x.answers[BANK.items[4].bank_id],
  x=>x.answers[BANK.items[3].bank_id]=8,
  x=>x.answers[BANK.items[3].bank_id]="7",
  x=>x.answers[BANK.items[3].bank_id]=undefined,
  x=>x.answers["EXTRA"]=5,
  x=>x.probes.B_AUTONOMY=8,
  x=>x.probes.UNKNOWN=7
 ];
 const bad=variants.map((fn,i)=>{const x=clone(good);x.seed="invalid-"+i;fn(x);return x;});
 const result=summarizePilot([good,...bad,clone(good)],{forms:7});
 assert.equal(result.acceptedRecords,1);
 assert.equal(result.rejectedRecords,14);
 assert.equal(Object.values(result.rejections).reduce((a,b)=>a+b,0),14);
 assert.equal(result.rejections.duplicate_session_seed,1);
 assert.equal(result.formAssessments,7);
 assert.equal(result.bothValued.B.missing,1);
 assert.equal(result.bothValued.C.missing,1);
});
test("D235 valid null skips still yield a withheld outcome rather than invented type",()=>{
 const f=fixture("D235-skips",7);
 for(const q of BANK.items.filter(q=>q.axis==="C"))f.answers[q.bank_id]=null;
 const o=summarizePilot([f],{forms:16});
 assert.equal(o.acceptedRecords,1);
 assert.equal(o.coreCandidateCounts["2"],16);
 assert.equal(o.axes.C.eligiblePeople,0);
 assert.equal(o.axes.C.formsTieOrInsufficientLinear,16);
});
test("D235 verifies invalid analysis controls",()=>{
 for(const opt of [{forms:0},{forms:-1},{forms:1.5},{forms:999}])
  assert.throws(()=>summarizePilot([],opt));
 assert.throws(()=>summarizePilot({}));
});
