import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TYPES } from "../projects/kidp/life-design-lab/a05/types.mjs";
import { getCompatibilityPair } from "../projects/kidp/life-design-lab/a05/compatibility.mjs";
import { S3_REVIEW_QUEUE } from "../projects/kidp/life-design-lab/a05/r1-s3-review-queue.mjs";
const data=JSON.parse(readFileSync(new URL(
  "../docs/A05_S4_P1_OPPOSITE_8_EDITORIAL_CANDIDATES_V01_20261030.json",
  import.meta.url),"utf8"));
const names=new Map(TYPES.map(x=>[x.id,x.name]));
test("S4 all-eight 4-axis-difference pair drafts match the exact C01 and S3 priority",()=>{
 assert.equal(data.items.length,8);
 assert.equal(new Set(data.items.map(x=>x.pairId)).size,8);
 assert.equal(data.category,"P1_ALL_FOUR_DIFFERENT");
 assert.equal(data.release,"NO_GO");
 assert.equal(data.counts.firstHumanApproved,0);
 assert.equal(data.counts.secondIndependentApproved,0);
 for(const row of data.items){
  const orig=getCompatibilityPair(...row.typeIds);
  assert.equal(row.pairId,orig.id);
  assert.deepEqual(row.displayNames,row.typeIds.map(x=>names.get(x)));
  assert.equal(orig.sameType,false);
  assert.equal(orig.agreements.length,0);
  assert.equal(orig.differences.length,4);
  assert.equal(row.allFourDraftAxisLabelsDiffer,true);
  assert.equal(row.measuredRelationshipDistance,null);
  assert.equal(row.humanFirstReview,"PENDING");
  assert.equal(row.independentSecondReview,"PENDING");
  assert.equal(row.scientificPairEvidence,false);
  assert.equal(row.productionApproved,false);
  assert.equal(row.dialogueQuestions.length,2);
  assert.equal(row.interpretationTier,"C_EDITORIAL_HYPOTHESIS_NOT_VALIDATED");
  assert.ok(S3_REVIEW_QUEUE.some(x=>x.pairId===row.pairId&&x.priority==="P1_ALL_FOUR_DIFFERENT"));
 }
});
test("S4 all-opposite draft does not imply positive or negative compatibility, prediction or rankings",()=>{
 const blocked=/(?:最高の相性|最悪の相性|相性が(?:良い|悪い)|相性点数|適合率|成功率|必ず(?:成功|衝突|別れる)|相性ランク)/u;
 for(const row of data.items){
  for(const text of [row.neutralDraft,...row.dialogueQuestions])assert.equal(blocked.test(text),false,row.pairId);
  assert.match(row.disclaimer,/判定できません/);
 }
 assert.equal(new Set(data.items.flatMap(x=>x.dialogueQuestions)).size,16);
});
