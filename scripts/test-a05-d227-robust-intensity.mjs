import test from "node:test";
import assert from "node:assert/strict";
import {BANK,drawResearchManifest} from "./a05-d208-research-sampler.mjs";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {scoreResearchForm,planResearchFollowUp,appendResearchFollowUp,WEAK_REFERENCE,VERSION} from "./a05-d227-robust-intensity-scoring.mjs";
const AXES=["A","B","C","D"],ids=Object.fromEntries(BANK.items.map(q=>[q.bank_id,q.axis]));
const form=()=>drawResearchHoldFilteredManifest("D227-UNIT-SEED");
const all=(manifest,value)=>Object.fromEntries(manifest.questions.map(q=>[q.id,value]));
function nOf(data,axis){return data.axes.find(q=>q.axis===axis);}
test("D227 exact endpoints, 1.5-power cutoff and all 16 type mapping",()=>{
 assert.ok(WEAK_REFERENCE>0.19&&WEAK_REFERENCE<0.193);
 for(let t=0;t<16;t++){
  const f=form(),signs=[Math.floor(t/4)>=2,Math.floor(t/4)%2===1,(t%4)>=2,(t%4)%2===1];
  const bag=Object.fromEntries(f.questions.map(q=>[q.id,q.axis==="E"?4:(signs[AXES.indexOf(q.axis)]?7:1)]));
  const res=scoreResearchForm(f,bag);
  assert.equal(res.possibleTypes.length,1);
  assert.deepEqual(res.possibleTypes,["T"+String(t+1).padStart(2,"0")]);
  assert.ok(res.axes.every(x=>x.status==="DIRECTIONAL"));
  assert.equal(res.resultKind,"SINGLE_PROVISIONAL");
  assert.equal(res.scoreValid,false);
 }
});
test("D227 neutral and weak are not mistaken for decisive psychological certainty",()=>{
 const f=form();
 for(const value of [4,5]){
  const res=scoreResearchForm(f,all(f,value));
  assert.equal(res.possibleTypes.length,16);
  assert.equal(res.resultKind,"WITHHELD");
  assert.ok(res.axes.every(x=>x.status=== (value===4?"TIE":"WEAK")));
 }
 const intermediate=scoreResearchForm(f,all(f,6));
 assert.equal(intermediate.possibleTypes.length,1);
 assert.ok(intermediate.axes.every(x=>x.mean>0));
 // Two opposite extremes from one family: the item/family deletion logic must not declare it reliable.
 const two=all(f,4);
 const b=f.questions.filter(q=>q.axis==="B");
 const familyCounts=new Map();
 for(const q of b)familyCounts.set(q.provisionalFamily,(familyCounts.get(q.provisionalFamily)||0)+1);
 const paired=b.filter(q=>familyCounts.get(q.provisionalFamily)===2);
 assert.equal(paired.length,2);
 for(const q of paired)two[q.id]=7;
 assert.equal(nOf(scoreResearchForm(f,two),"B").status,"FRAGILE");
});
test("D227 insufficient answers/skip, malformed answers, duplicate IDs and editorial holds fail closed",()=>{
 const f=form(),blank=all(f,null);
 const res=scoreResearchForm(f,blank);
 assert.ok(res.axes.every(x=>x.status==="INSUFFICIENT"&&x.valid===0));
 assert.equal(res.numberOfCandidateTypes,16);
 const invalids=[0,8,1.1,"7",undefined,NaN,Infinity,-1,{},[]];
 for(const value of invalids){
  const input={...all(f,4),[f.questions[0].id]:value};
  assert.throws(()=>scoreResearchForm(f,input));
 }
 assert.throws(()=>scoreResearchForm(f,{"UNASKED":7}));
 const bad=structuredClone(f);bad.questions[3].id=bad.questions[2].id;
 assert.throws(()=>scoreResearchForm(bad,{}));
 const held=structuredClone(f);
 const c=held.questions.findIndex(q=>q.axis==="C");
 held.questions[c]={...held.questions[c],id:"A05-V1-36"};
 assert.throws(()=>scoreResearchForm(held,{}));
 const spoof=structuredClone(f);spoof.questions[0].axis="E";
 assert.throws(()=>scoreResearchForm(spoof,{}));
 assert.throws(()=>scoreResearchForm(drawResearchManifest("D227-A"),{})); // may have held C31/C32/C36
});
test("D227 follow-up is deterministic, two eligible unasked items, respects cap and never mutates initial answers",()=>{
 const original=form(),neutral=all(original,4);
 const text=JSON.stringify(original),answers=JSON.stringify(neutral);
 const offer=planResearchFollowUp(original,neutral);
 assert.equal(offer.kind,"OFFER_2");
 assert.ok(AXES.includes(offer.axis));
 assert.equal(offer.after,32);
 assert.equal(offer.questionIds.length,2);
 assert.equal(new Set(offer.questionIds).size,2);
 const q1=appendResearchFollowUp(original,offer);
 assert.equal(q1.questions.length,32);
 assert.deepEqual(planResearchFollowUp(original,neutral),offer);
 assert.equal(JSON.stringify(original),text);
 assert.equal(JSON.stringify(neutral),answers);
 const ans32={...neutral,[offer.questionIds[0]]:4,[offer.questionIds[1]]:4};
 const second=planResearchFollowUp(q1,ans32);
 assert.equal(second.kind,"OFFER_2");
 assert.equal(second.after,34);
 assert.ok(second.questionIds.every(id=>!original.questions.some(q=>q.id===id)));
 const q2=appendResearchFollowUp(q1,second);
 const ans34={...ans32,[second.questionIds[0]]:4,[second.questionIds[1]]:4};
 const result=scoreResearchForm(q2,ans34);
 assert.equal(result.numberOfCandidateTypes,16);
 assert.equal(planResearchFollowUp(q2,ans34).reason,"MAX_34_QUESTIONS");
 assert.throws(()=>appendResearchFollowUp(q2,second));
 assert.throws(()=>appendResearchFollowUp(original,{...offer,questionIds:[offer.questionIds[0],offer.questionIds[0]]}));
 assert.throws(()=>appendResearchFollowUp(original,{...offer,questionIds:["A05-V1-36",offer.questionIds[1]]}));
 assert.throws(()=>appendResearchFollowUp(original,{...offer,questionIds:["A05-V1-49",offer.questionIds[1]]}));
});
test("D227 adding E answers has zero effect on A-D score and type",()=>{
 const f=form(),answers=all(f,6);
 const base=scoreResearchForm(f,answers);
 for(const e of f.questions.filter(q=>q.axis==="E"))answers[e.id]=1;
 const changed=scoreResearchForm(f,answers);
 assert.deepEqual(changed,base);
});
test("D227 can score exactly 5/7 valid axis responses but holds when four or fewer",()=>{
 const f=form(),answers=all(f,7);
 const b=f.questions.filter(q=>q.axis==="B");
 for(let i=0;i<2;i++)answers[b[i].id]=null;
 const five=nOf(scoreResearchForm(f,answers),"B");
 assert.equal(five.valid,5);
 assert.ok(["DIRECTIONAL","INSUFFICIENT"].includes(five.status));
 answers[b[2].id]=null;
 const four=nOf(scoreResearchForm(f,answers),"B");
 assert.equal(four.valid,4);
 assert.equal(four.status,"INSUFFICIENT");
});
