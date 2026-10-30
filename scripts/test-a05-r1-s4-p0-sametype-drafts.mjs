import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TYPES } from "../projects/kidp/life-design-lab/a05/types.mjs";
import { getCompatibilityPair } from "../projects/kidp/life-design-lab/a05/compatibility.mjs";
import { S3_REVIEW_QUEUE } from "../projects/kidp/life-design-lab/a05/r1-s3-review-queue.mjs";
const data=JSON.parse(readFileSync(new URL(
  "../docs/A05_S4_P0_SAMETYPE_16_EDITORIAL_CANDIDATES_V01_20261030.json",
  import.meta.url),"utf8"));
test("S4 same-type drafts cover every T01-T16 exactly once without independent approvals",()=>{
 assert.equal(data.items.length,16);
 assert.equal(data.state,"EDITORIAL_CANDIDATES_NOT_REVIEWED_OR_APPROVED");
 assert.equal(data.counts.firstHumanReviewed,0);
 assert.equal(data.counts.independentSecondReviewed,0);
 assert.equal(data.counts.publishable,0);
 assert.equal(data.release,"NO_GO");
 for(let i=0;i<16;i++){
  const pair=data.items[i],type=TYPES[i],c01=getCompatibilityPair(type.id,type.id);
  assert.equal(pair.typeId,type.id);
  assert.equal(pair.typeName,type.name);
  assert.equal(pair.pairId,c01.id);
  assert.equal(c01.sameType,true);
  assert.equal(c01.differences.length,0);
  assert.equal(pair.interpretation,"C_EDITED_HYPOTHESIS_NOT_PERSONAL_PREDICTION");
  assert.equal(pair.dialogueQuestions.length,2);
  assert.equal(pair.firstHumanReview,"PENDING");
  assert.equal(pair.secondIndependentReview,"PENDING");
  assert.equal(pair.directEmpiricalSupport,false);
  assert.equal(pair.copyApproved,false);
  assert.equal(pair.researchApproved,false);
  assert.equal(pair.publicationApproved,false);
  assert.ok(pair.neutralDraft && pair.draftNotice);
  assert.ok(S3_REVIEW_QUEUE.find(x=>x.pairId===pair.pairId&&x.priority==="P0_SAME_TYPE"));
 }
 assert.equal(new Set(data.items.map(x=>x.neutralDraft)).size,16);
});
test("S4 P0 copy never contains easy claims of type-specific matching or scientific certainty",()=>{
 const unsafe=/(?:最高の相性|最悪の相性|相性が良い|相性が悪い|絶対に成功|必ず衝突|成功率|適合率|相性点数|科学的に証明)/u;
 for(const pair of data.items){
  for(const s of [pair.neutralDraft,...pair.dialogueQuestions]){
   assert.equal(unsafe.test(s),false,pair.pairId+": "+s);
  }
 }
});
