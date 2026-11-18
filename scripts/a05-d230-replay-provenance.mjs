/**
 * A05 D230 | tamper-evident research-session replay (NOT authentication)
 * Always regenerate the D224 seed-scoped base, replay D227 follow-ups,
 * verify frozen response snapshots and compare independent reference scoring.
 *
 * Hash chaining detects inconsistencies against the supplied chain; anyone
 * controlling the entire JSON record can reforge its hashes. Authenticity
 * requires a separate trusted anchor or signature. No public A05 changes.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {BANK} from "./a05-d208-research-sampler.mjs";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {appendResearchFollowUp,planResearchFollowUp,scoreResearchForm} from "./a05-d227-robust-intensity-scoring.mjs";

export const D230_VERSION="A05-D230-SIGNED-POWER-REPLAY-RESEARCH-1";
const CORE=["A","B","C","D"], EPS=1e-12, POWER=1.5;
const bankById=new Map(BANK.items.map(q=>[q.bank_id,q]));
const has=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
function assertObject(o,keys){
 assert.ok(o&&typeof o==="object"&&!Array.isArray(o),"Expected plain object");
 assert.deepEqual(Object.keys(o).sort(),keys.slice().sort(),"Unexpected or missing fields");
}
function plain(o){return o!==null&&typeof o==="object"&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;}
function digest(o){return createHash("sha256").update(JSON.stringify(o)).digest("hex");}
function same(a,b,msg){assert.equal(JSON.stringify(a),JSON.stringify(b),msg);}
function validateAnswers(questions,answers){
 assert.ok(plain(answers),"Answers must be an ordinary object");
 const ids=questions.map(q=>q.id);
 assert.equal(new Set(ids).size,ids.length,"Duplicate question ID");
 assert.deepEqual(Object.keys(answers).sort(),ids.slice().sort(),"Snapshot must contain exactly the presented items");
 const canonical={};
 for(const id of ids){
  const x=answers[id];
  assert.ok(x===null||(Number.isInteger(x)&&x>=1&&x<=7),"Invalid 1..7/null response");
  canonical[id]=x;
 }
 return canonical;
}
function recordOffer(offer){
 assert.equal(offer?.kind,"OFFER_2","No additional questions available");
 return {axis:offer.axis,reason:offer.reason,questionIds:offer.questionIds.slice(),after:offer.after};
}
function chain(head,offer,answers,manifest){
 return digest({schema:D230_VERSION,previousHash:head,offer,answers,manifest});
}
export function beginResearchSession(seed,baseAnswers){
 const manifest=drawResearchHoldFilteredManifest(seed);
 const answers=validateAnswers(manifest.questions,baseAnswers);
 const initialHash=digest({schema:D230_VERSION,seed,manifest,answers});
 return {
  schema:D230_VERSION,mode:"RESEARCH_ONLY",seed,
  base:{manifest,answers,hash:initialHash},
  rounds:[],headHash:initialHash
 };
}
/** Independent arithmetic implementation. No scoreResponse or scoreResearchForm calls. */
export function referenceResearchScore(manifest,answers){
 const qs=manifest.questions;
 const axes=CORE.map(axis=>{
  const rows=qs.filter(q=>q.axis===axis).map(q=>({
   id:q.id,answer:answers[q.id],family:bankById.get(q.id)?.proposed_semantic_family
  })).filter(x=>x.answer!==null);
  const sum=rows.reduce((acc,item)=>acc+Math.sign(item.answer-4)*
    Math.pow(Math.abs(item.answer-4)/3,POWER),0);
  const scored=rows.map(item=>({
   ...item,value:Math.sign(item.answer-4)*Math.pow(Math.abs(item.answer-4)/3,POWER)
  }));
  const n=scored.length;
  const mean=n?sum/n:0;
  const sign=Math.abs(sum)<=EPS?0:Math.sign(sum);
  const familyNames=[...new Set(scored.map(x=>x.family))];
  const itemFlipCount=scored.filter(x=>Math.abs(sum-x.value)<=EPS?sign!==0:
   Math.sign(sum-x.value)!==sign).length;
  let familyFlipCount=0;
  for(const family of familyNames){
   const cut=scored.filter(x=>x.family===family).reduce((v,x)=>v+x.value,0);
   const remaining=sum-cut;
   const newSign=Math.abs(remaining)<=EPS?0:Math.sign(remaining);
   if(newSign!==sign)familyFlipCount++;
  }
  const insufficient=n<5||familyNames.length<4;
  const weak=Math.abs(mean)<=Math.pow(1/3,POWER)+EPS;
  const fragile=itemFlipCount>0||familyFlipCount>0;
  const status=insufficient?"INSUFFICIENT":sign===0?"TIE":weak?"WEAK":fragile?"FRAGILE":"DIRECTIONAL";
  return {axis,presented:qs.filter(q=>q.axis===axis).length,valid:n,
   skipped:qs.filter(q=>q.axis===axis).length-n,
   mean,sign,distinctFamilies:familyNames.length,itemFlipCount,familyFlipCount,status,
   directional:status==="DIRECTIONAL"};
 });
 const ids=[];
 for(let i=0;i<16;i++){
  const group=Math.floor(i/4),within=i%4;
  const signs=[group>=2?1:-1,group%2===1?1:-1,within>=2?1:-1,within%2===1?1:-1];
  if(axes.every((axis,j)=>!axis.directional||signs[j]===axis.sign))
   ids.push("T"+String(i+1).padStart(2,"0"));
 }
 return {axes,possibleTypes:ids,numberOfCandidateTypes:ids.length,
  resultKind:ids.length===1?"SINGLE_PROVISIONAL":ids.length<=4?"NEAR_TYPES":"WITHHELD"};
}
export function crossCheckIndependentScore(manifest,answers){
 const code=scoreResearchForm(manifest,answers);
 const ref=referenceResearchScore(manifest,answers);
 assert.equal(code.axes.length,4);
 for(let i=0;i<4;i++){
  const a=code.axes[i],b=ref.axes[i];
  for(const prop of ["axis","presented","valid","skipped","sign","distinctFamilies",
   "itemFlipCount","familyFlipCount","status","directional"])
   assert.equal(a[prop],b[prop],"Independent mismatch: "+a.axis+"."+prop);
  assert.ok(Math.abs(a.mean-b.mean)<=1e-10,"Independent mean mismatch "+a.axis);
 }
 same(code.possibleTypes,ref.possibleTypes,"Independent type-set mismatch");
 assert.equal(code.resultKind,ref.resultKind);
 return code;
}
export function verifyResearchSession(session){
 assertObject(session,["schema","mode","seed","base","rounds","headHash"]);
 assert.equal(session.schema,D230_VERSION);
 assert.equal(session.mode,"RESEARCH_ONLY");
 assert.ok(Array.isArray(session.rounds)&&session.rounds.length<=2,"Overlong continuation");
 const expected=drawResearchHoldFilteredManifest(session.seed);
 assertObject(session.base,["manifest","answers","hash"]);
 same(session.base.manifest,expected,"Base questionnaire does not match seed/D224");
 const initialAnswers=validateAnswers(expected.questions,session.base.answers);
 let head=digest({schema:D230_VERSION,seed:session.seed,manifest:expected,answers:initialAnswers});
 assert.equal(session.base.hash,head,"Initial response snapshot hash mismatch");
 let manifest=expected,answers={...initialAnswers};
 crossCheckIndependentScore(manifest,answers);
 for(let i=0;i<session.rounds.length;i++){
  const round=session.rounds[i];
  assertObject(round,["offer","answers","manifest","previousHash","hash"]);
  const expectedOffer=recordOffer(planResearchFollowUp(manifest,answers));
  same(round.offer,expectedOffer,"Continuation selection/history mismatch");
  assert.equal(round.previousHash,head,"Broken previous hash");
  const next=appendResearchFollowUp(manifest,{kind:"OFFER_2",...expectedOffer});
  same(round.manifest,next,"Extended questions/order do not match expected replay");
  const deltaQuestions=next.questions.slice(manifest.questions.length);
  const delta=validateAnswers(deltaQuestions,round.answers);
  head=chain(head,expectedOffer,delta,next);
  assert.equal(round.hash,head,"History hash mismatch");
  answers={...answers,...delta};
  manifest=next;
  crossCheckIndependentScore(manifest,answers);
 }
 assert.equal(session.headHash,head,"Final hash mismatch");
 return {schema:D230_VERSION,valid:true,manifest,answers,score:crossCheckIndependentScore(manifest,answers),
  rounds:session.rounds.length,headHash:head,trust:"INTERNAL_CONSISTENCY_ONLY_NO_TRUSTED_SIGNATURE"};
}
export function appendResearchSessionRound(session,newAnswers){
 const snapshot=verifyResearchSession(session);
 assert.ok(session.rounds.length<2,"Maximum two follow-up rounds");
 const offer=recordOffer(planResearchFollowUp(snapshot.manifest,snapshot.answers));
 const next=appendResearchFollowUp(snapshot.manifest,{kind:"OFFER_2",...offer});
 const delta=validateAnswers(next.questions.slice(snapshot.manifest.questions.length),newAnswers);
 const head=chain(snapshot.headHash,offer,delta,next);
 const updated={
  schema:D230_VERSION,mode:"RESEARCH_ONLY",seed:session.seed,
  base:structuredClone(session.base),rounds:structuredClone(session.rounds).concat([{
   offer,answers:delta,manifest:next,previousHash:snapshot.headHash,hash:head
  }]),headHash:head
 };
 verifyResearchSession(updated);
 return updated;
}
