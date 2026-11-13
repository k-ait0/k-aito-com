import test from "node:test";
import assert from "node:assert/strict";
import {analyzeP0} from "./a05-d215-aggregate-p0.mjs";
import {BANK,drawResearchManifest} from "./a05-d208-research-sampler.mjs";
const digest=drawResearchManifest("D215-anchor").bankDigest;
const bySlot=s=>BANK.items.find(x=>x.slot===s).bank_id;
const copy=x=>JSON.parse(JSON.stringify(x));
function record(seed, mode="full50"){
 const order=BANK.items.map(x=>x.bank_id);
 return {schema:"A05-D210-RESEARCH-SESSION-1",mode,bankDigest:digest,bankVersion:BANK.schema,
  seed,consent:true,order,answers:Object.fromEntries(order.map(id=>[id,4])),
  pairReviews:{},probes:{B_AUTONOMY:7,B_CONNECTION:7,C_FUTURE:1,C_PRESENT:1}};
}
test("empty real cohort returns zeros, never fabricated respondent evidence",()=>{
 const r=analyzeP0([]);
 assert.equal(r.sessions,0);assert.equal(r.rejected,0);
 assert.equal(r.pairReviews["C35-36"].pairedNumeric,0);
 assert.equal(r.pairReviews["C35-36"].meanAbsoluteResponseDifference,null);
});
test("aggregate 3 real-format sessions by pairs without free text",()=>{
 const a=record("a"),b=record("b"),c=record("c");
 a.pairReviews["C35-36"]={sameMeaning:"same",reason:"機密の自由記述"};
 b.pairReviews["C35-36"]={sameMeaning:"different",reason:"回答理由が別"};
 c.pairReviews["C35-36"]={sameMeaning:"unsure",reason:""};
 a.answers[bySlot(35)]=7;a.answers[bySlot(36)]=1;
 b.answers[bySlot(35)]=null;
 b.probes.B_AUTONOMY=1;b.probes.B_CONNECTION=1;
 c.probes.C_FUTURE=7;c.probes.C_PRESENT=7;
 const result=analyzeP0([a,b,c]);
 assert.equal(result.sessions,3);assert.equal(result.rejected,0);
 assert.deepEqual([result.pairReviews["C35-36"].same,result.pairReviews["C35-36"].different,result.pairReviews["C35-36"].unsure],[1,1,1]);
 assert.equal(result.pairReviews["C35-36"].pairedNumeric,2);
 assert.equal(result.pairReviews["C35-36"].meanAbsoluteResponseDifference,3);
 assert.equal(result.dualRatings.B_DUAL.bothHigh,2);
 assert.equal(result.dualRatings.B_DUAL.bothLow,1);
 assert.equal(result.dualRatings.C_DUAL.bothLow,2);
 assert.equal(result.dualRatings.C_DUAL.bothHigh,1);
 assert.equal(JSON.stringify(result).includes("機密の自由記述"),false);
 assert.equal(JSON.stringify(result).includes("回答理由が別"),false);
});
test("reject duplicate seeds and invalid conditions independently",()=>{
 const a=record("unique"),invalid=record("bad"),dupe=copy(a);
 invalid.mode="ux30";
 let r=analyzeP0([a,dupe,invalid]);
 assert.equal(r.sessions,1);assert.equal(r.rejected,2);
 assert.equal(r.rejectionReasons.invalid_mode_or_consent,1);
 assert.equal(r.rejectionReasons.missing_or_repeated_session_seed,1);
});
test("reject malformed pair, out-of-range responses and incompatible bank",()=>{
 const p=record("p");p.pairReviews["E49-50"]={sameMeaning:"whatever",reason:""};
 const n=record("n");n.answers[bySlot(49)]=9;
 const v=record("v");v.bankDigest="f".repeat(64);
 const z=record("z");z.pairReviews.FAKE_ID={sameMeaning:"same",reason:""};
 const result=analyzeP0([p,n,v,z]);
 assert.equal(result.sessions,0);assert.equal(result.rejected,4);
 assert.equal(result.rejectionReasons.invalid_pair_reviews,2);
 assert.equal(result.rejectionReasons.invalid_answers,1);
 assert.equal(result.rejectionReasons.bank_version_mismatch,1);
});
