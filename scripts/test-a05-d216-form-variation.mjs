import test from "node:test";
import assert from "node:assert/strict";
import {analyzeFormVariation} from "./a05-d216-form-variation.mjs";
import {BANK,drawResearchManifest} from "./a05-d208-research-sampler.mjs";
const bankDigest=drawResearchManifest("D216").bankDigest;
const values=Object.fromEntries(BANK.items.map(q=>[q.bank_id,q.axis]));
const bySlot=Object.fromEntries(BANK.items.map(q=>[q.bank_id,q.slot]));
const clone=x=>JSON.parse(JSON.stringify(x));
function make(id,rule=()=>4){
 const order=BANK.items.map(q=>q.bank_id);
 return {schema:"A05-D210-RESEARCH-SESSION-1",mode:"full50",consent:true,
  seed:id,bankDigest,bankVersion:BANK.schema,order,
  answers:Object.fromEntries(order.map(key=>[key,rule(bySlot[key],values[key])])),
  notes:"Sensitive notes should never appear in aggregate",
  pairReviews:{"C35-36":{sameMeaning:"same",reason:"Confidential response"}},
  probes:{B_AUTONOMY:7,B_CONNECTION:7}};
}
test("no respondents yields zero accepted, zero claims of evidence",()=>{
 const x=analyzeFormVariation([]);
 assert.equal(x.inputRecords,0);assert.equal(x.acceptedRecords,0);
 assert.equal(x.classification,null);assert.equal(x.coreTypeId,null);
 assert.ok(Object.values(x.axes).every(a=>a.validFormSelections===0&&a.formDirectionFractions===null));
});
test("fixed 30-form sets: all-right, all-left and midpoint remain stable",()=>{
 const x=analyzeFormVariation([
  make("plus",()=>7),make("minus",()=>1),make("middle",()=>4)
 ],{draws:128});
 assert.equal(x.acceptedRecords,3);
 for(const axis of Object.values(x.axes)){
  assert.equal(axis.eligibleRespondents,3);
  assert.equal(axis.validFormSelections,384);
  assert.equal(axis.positive,128);
  assert.equal(axis.negative,128);
  assert.equal(axis.midpointOrTie,128);
  assert.equal(axis.respondentsWithBothSigns,0);
 }
 assert.equal(x.coreTypeId,null);
});
test("alternating extremes can flip direction across 30-item forms in synthetic data",()=>{
 const x=analyzeFormVariation([make("alternating",slot=>slot%2?7:1)],{draws:512});
 assert.equal(x.acceptedRecords,1);
 assert.ok(Object.values(x.axes).some(a=>a.respondentsWithBothSigns===1),
   "At least one axis must exhibit a synthetic form-sensitive direction flip");
});
test("partial answers affect only their axis and do not become a classification",()=>{
 const q=BANK.items.find(q=>q.axis==="A").bank_id;
 const r=make("part");
 r.answers[q]=null;
 const x=analyzeFormVariation([r],{draws:32});
 assert.equal(x.acceptedRecords,1);
 assert.equal(x.axes.A.eligibleRespondents,0);
 assert.equal(x.axes.A.partiallyAnsweredRespondents,1);
 assert.equal(x.axes.B.eligibleRespondents,1);
 assert.equal(x.axes.B.validFormSelections,32);
 assert.equal(x.classification,null);
});
test("invalid mode, bank, response, ID and duplicate session are rejected",()=>{
 const good=make("good");
 const wrongMode=make("wrong-mode");wrongMode.mode="ux30";
 const wrongBank=make("wrong-bank");wrongBank.bankDigest="0".repeat(64);
 const wrongAnswer=make("wrong-answer");wrongAnswer.answers[BANK.items[1].bank_id]="7";
 const wrongId=make("wrong-id");wrongId.answers.UNKNOWN=3;
 const wrongManifest=make("wrong-manifest");wrongManifest.order[0]=wrongManifest.order[1];
 const x=analyzeFormVariation([good,clone(good),wrongMode,wrongBank,wrongAnswer,wrongId,wrongManifest],{draws:16});
 assert.equal(x.acceptedRecords,1);assert.equal(x.rejectedRecords,6);
 assert.equal(x.rejections.duplicate_session_seed,1);
 assert.equal(x.rejections.invalid_mode_or_consent,1);
 assert.equal(x.rejections.bank_version_mismatch,1);
 assert.equal(x.rejections.invalid_answers,2);
 assert.equal(x.rejections.invalid_manifest,1);
});
test("aggregated result contains no user notes, seed or raw responses",()=>{
 const x=analyzeFormVariation([make("private-seed",()=>7)],{draws:16});
 const output=JSON.stringify(x);
 assert.ok(!output.includes("private-seed"));
 assert.ok(!output.includes("Confidential response"));
 assert.ok(!output.includes("Sensitive notes"));
 assert.ok(!output.includes('"answers"'));
 assert.ok(!output.includes('"notes"'));
});
test("input types and draw limits are rejected",()=>{
 assert.throws(()=>analyzeFormVariation(null));
 assert.throws(()=>analyzeFormVariation({},{}));
 for(const draws of [0,-1,1.5,2049,"128",null])assert.throws(()=>analyzeFormVariation([],{draws}));
});
test("deterministic aggregate results do not mutate input",()=>{
 const a=make("stability",slot=>slot%3?7:1),before=JSON.stringify(a);
 const x=analyzeFormVariation([a],{draws:96});
 const y=analyzeFormVariation([a],{draws:96});
 assert.deepEqual(x,y);assert.equal(JSON.stringify(a),before);
});
// Synthetic fixtures are ONLY pipeline tests. Their flip rates are not evidence
// of respondent behavior, psychometrics, or 16-type validity.
