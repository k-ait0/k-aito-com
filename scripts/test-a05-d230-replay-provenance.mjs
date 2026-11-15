import test from "node:test";
import assert from "node:assert/strict";
import {beginResearchSession,appendResearchSessionRound,verifyResearchSession,
  crossCheckIndependentScore,referenceResearchScore,D230_VERSION} from "./a05-d230-replay-provenance.mjs";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
const clone=structuredClone;
const given=(seed,value)=>Object.fromEntries(drawResearchHoldFilteredManifest(seed).questions.map(q=>[q.id,value]));
const start=(seed="D230-test",value=4)=>beginResearchSession(seed,given(seed,value));
function corrupt(s,modifier){
 const x=clone(s);modifier(x);assert.throws(()=>verifyResearchSession(x));return x;
}
test("D230 fixed seed regenerates exactly ordered base 30 and rejects mutated manifest metadata",()=>{
 const s=start();const verified=verifyResearchSession(s);
 assert.equal(s.schema,D230_VERSION);
 assert.equal(verified.manifest.questions.length,30);
 assert.deepEqual(verified.manifest,s.base.manifest);
 assert.equal(verified.rounds,0);
 assert.equal(verified.score.scoreValid,false);
 corrupt(s,x=>x.base.manifest.questions.reverse());
 corrupt(s,x=>x.base.manifest.questions[0].stem+=" altered");
 corrupt(s,x=>x.base.manifest.questions[0].axis="E");
 corrupt(s,x=>x.base.manifest.questions[0].id=x.base.manifest.questions[1].id);
 corrupt(s,x=>x.base.manifest.questions[0].position=29);
 corrupt(s,x=>x.seed="D230-other-seed");
 corrupt(s,x=>x.base.manifest.seed="D230-other-seed");
});
test("D230 tampering base response values or snapshot digest fails even when 30 IDs are unchanged",()=>{
 const s=start();
 const id=s.base.manifest.questions[0].id;
 corrupt(s,x=>x.base.answers[id]=7);
 corrupt(s,x=>x.base.answers[id]=null);
 corrupt(s,x=>x.base.answers["UNKNOWN"]=7);
 corrupt(s,x=>delete x.base.answers[id]);
 corrupt(s,x=>x.base.answers[id]="4");
 corrupt(s,x=>x.base.answers[id]=8);
 corrupt(s,x=>x.base.hash="a".repeat(64));
 corrupt(s,x=>x.headHash="a".repeat(64));
 corrupt(s,x=>x.mode="PRODUCTION");
 corrupt(s,x=>x.schema="OTHER");
 corrupt(s,x=>x.noop=true);
});
test("D230 can replay two controlled 2-item rounds with frozen original responses",async()=>{
 const s=start();
 const q=s.base.manifest.questions;
 const original=JSON.stringify(s);
 // Derive the offered question IDs from the frozen seed and responses.
 const {planResearchFollowUp}=await import("./a05-d227-robust-intensity-scoring.mjs");
 const first=planResearchFollowUp(s.base.manifest,s.base.answers);
 assert.equal(first.kind,"OFFER_2");
 const s32=appendResearchSessionRound(s,Object.fromEntries(first.questionIds.map(id=>[id,4])));
 assert.equal(JSON.stringify(s),original);
 assert.equal(verifyResearchSession(s32).manifest.questions.length,32);
 const second=planResearchFollowUp(verifyResearchSession(s32).manifest,verifyResearchSession(s32).answers);
 assert.equal(second.kind,"OFFER_2");
 const s34=appendResearchSessionRound(s32,Object.fromEntries(second.questionIds.map(id=>[id,4])));
 const v=verifyResearchSession(s34);
 assert.equal(v.manifest.questions.length,34);
 assert.equal(v.rounds,2);
 assert.equal(v.score.numberOfCandidateTypes,16);
 assert.deepEqual(s34.base.answers,s.base.answers);
 assert.notEqual(s34.base.hash,s34.headHash);
 assert.throws(()=>appendResearchSessionRound(s34,{}));
});
test("D230 checks offer axis/reason, added questions, order, round answers, and hash chain",async()=>{
 const {planResearchFollowUp}=await import("./a05-d227-robust-intensity-scoring.mjs");
 const s=start();
 const o=planResearchFollowUp(s.base.manifest,s.base.answers);
 const s32=appendResearchSessionRound(s,Object.fromEntries(o.questionIds.map(id=>[id,4])));
 const second=planResearchFollowUp(verifyResearchSession(s32).manifest,verifyResearchSession(s32).answers);
 const s34=appendResearchSessionRound(s32,Object.fromEntries(second.questionIds.map(id=>[id,4])));
 corrupt(s34,x=>x.rounds[0].offer.axis="D");
 corrupt(s34,x=>x.rounds[0].offer.reason="NOT_A_REASON");
 corrupt(s34,x=>x.rounds[0].offer.questionIds.reverse());
 corrupt(s34,x=>x.rounds[1].offer.questionIds[0]=x.rounds[0].offer.questionIds[0]);
 corrupt(s34,x=>x.rounds[0].manifest.questions[30].stem="not original");
 corrupt(s34,x=>x.rounds[0].manifest.questions[30].id="A05-V1-36");
 corrupt(s34,x=>x.rounds[1].manifest.questions.reverse());
 corrupt(s34,x=>x.rounds[1].previousHash="0".repeat(64));
 corrupt(s34,x=>x.rounds[0].hash="0".repeat(64));
 corrupt(s34,x=>x.rounds[1].hash="0".repeat(64));
 corrupt(s34,x=>x.rounds[0].answers[o.questionIds[0]]=7);
 corrupt(s34,x=>x.rounds[0].answers["A05-V1-49"]=4);
 corrupt(s34,x=>delete x.rounds[0].answers[o.questionIds[1]]);
 corrupt(s34,x=>x.rounds.push(clone(x.rounds[0])));
 corrupt(s34,x=>x.base.answers[s.base.manifest.questions.find(q=>q.axis==="A").id]=7);
 assert.throws(()=>appendResearchSessionRound(s32,{}));
});
test("D230 checks all 16 provisional type directions against a separate arithmetic implementation",()=>{
 const AXES=["A","B","C","D"];
 for(let t=0;t<16;t++){
  const seed="D230-TYPE-"+t,form=drawResearchHoldFilteredManifest(seed);
  const directions=[Math.floor(t/4)>=2,Math.floor(t/4)%2===1,t%4>=2,t%2===1];
  const answers=Object.fromEntries(form.questions.map(q=>[q.id,q.axis==="E"?4:directions[AXES.indexOf(q.axis)]?7:1]));
  const sess=beginResearchSession(seed,answers);
  const evaluated=verifyResearchSession(sess);
  assert.deepEqual(evaluated.score.possibleTypes,["T"+String(t+1).padStart(2,"0")]);
  assert.deepEqual(referenceResearchScore(form,answers).possibleTypes,evaluated.score.possibleTypes);
 }
});
test("D230 fails closed on missing, malformed and duplicate base responses",()=>{
 const seed="D230-invalid";
 const answers=given(seed,4),id=Object.keys(answers)[0];
 for(const x of [0,8,4.5,"4",undefined,NaN,Infinity,[],{},true]){
  const bad={...answers,[id]:x};
  assert.throws(()=>beginResearchSession(seed,bad));
 }
 assert.throws(()=>beginResearchSession(seed,{...answers,EXTRA:4}));
 const missing={...answers};delete missing[id];
 assert.throws(()=>beginResearchSession(seed,missing));
 assert.throws(()=>beginResearchSession("",answers));
 assert.throws(()=>beginResearchSession("x".repeat(129),answers));
});
test("D230 independent reference exact across mixed nulls, polarity reversals and E variations",()=>{
 for(let k=0;k<64;k++){
  const seed="D230-independent-"+k,form=drawResearchHoldFilteredManifest(seed);
  const input=Object.fromEntries(form.questions.map((q,j)=>[
   q.id,j%13===0?null:((k*7+j*11)%7)+1
  ]));
  const result=beginResearchSession(seed,input);
  crossCheckIndependentScore(form,input);
  const output=verifyResearchSession(result);
  assert.ok([1,2,4,8,16].includes(output.score.numberOfCandidateTypes));
  const switched={...input};
  for(const q of form.questions.filter(q=>q.axis==="E"))switched[q.id]=7;
  assert.deepEqual(verifyResearchSession(beginResearchSession(seed,switched)).score.axes,output.score.axes);
 }
});
