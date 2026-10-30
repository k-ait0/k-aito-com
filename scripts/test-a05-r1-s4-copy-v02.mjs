import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { S4_COPY_V02_120, S4_COPY_V02_SUMMARY } from
  "../projects/kidp/life-design-lab/a05/r1-s4-pair-specific-copy-v02.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url));
const old=JSON.parse(read("docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V01_20261030.json"));
const doc=JSON.parse(read("docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V02_20261030.json"));
const gitBlob=bytes=>createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
const candidateById=new Map(S4_COPY_V02_120.map(x=>[x.pairId,x]));
const oldById=new Map(old.rows.map(x=>[x.pairId,x]));
test("S4 v0.2 keeps a pinned Git blob provenance and all 136 draft IDs",()=>{
 assert.equal(doc.rows.length,136);
 assert.equal(new Set(doc.rows.map(x=>x.pairId)).size,136);
 for(const [p,expected] of Object.entries(doc.sourceFiles))
  assert.equal(gitBlob(read(p)),expected,p);
 assert.deepEqual(doc.counts.byPriority,{
  P0_SAME_TYPE:16,P1_ALL_FOUR_DIFFERENT:8,P2_B1_DIFFERENCE:56,P3_OTHER:56
 });
 assert.equal(doc.counts.rewrittenPairs,120);
 assert.equal(doc.counts.retainedPairDrafts,16);
 assert.equal(S4_COPY_V02_SUMMARY.draftRecords,120);
 assert.equal(candidateById.size,120);
});
test("S4 v0.2 retains P0 exactly, replaces P1/P2/P3 with real current candidate generator",()=>{
 for(const row of doc.rows){
  const previous=oldById.get(row.pairId);
  assert.ok(previous,row.pairId);
  assert.deepEqual(row.typeIds,previous.typeIds);
  assert.deepEqual(row.sharedAxes,previous.sharedAxes);
  assert.deepEqual(row.differentAxes,previous.differentAxes);
  if(row.priority==="P0_SAME_TYPE"){
   assert.equal(row.draftDescription,previous.draftDescription);
   assert.deepEqual(row.draftConversationQuestions,previous.draftConversationQuestions);
   assert.equal(row.copyVersion,"V01_P0_RETAINED");
  }else{
   const v2=candidateById.get(row.pairId);
   assert.ok(v2,row.pairId);
   assert.equal(row.draftDescription,v2.draftDescription);
   assert.deepEqual(row.draftConversationQuestions,v2.draftDialogueQuestions);
   assert.equal(row.draftConversationQuestions.length,3);
   assert.deepEqual(row.coveredAxisIds,["A","B","C","D"]);
   assert.notEqual(row.principalAxis,row.secondaryAxis);
   assert.equal(row.copyVersion,"V02_PERSONA_AND_CROSS_AXIS");
   assert.equal(row.draftDescription.includes(v2.names[0]),true);
   assert.equal(row.draftDescription.includes(v2.names[1]),true);
  }
 }
});
test("S4 no exact-copy duplicates, while semantic / scientific review remains NO-GO",()=>{
 const d=doc.rows.map(r=>r.draftDescription);
 const q=doc.rows.flatMap(r=>r.draftConversationQuestions);
 assert.equal(d.length,136);
 assert.equal(new Set(d).size,136);
 assert.equal(q.length,392);
 assert.equal(new Set(q).size,392);
 assert.equal(doc.counts.exactDuplicateDescriptions,0);
 assert.equal(doc.counts.exactDuplicateQuestions,0);
 assert.equal(doc.qualitySemantics.similarMeaningDespiteDifferentText,"STILL_POSSIBLE");
 assert.equal(doc.qualitySemantics.inferPsychometricQualityFromUniqueStrings,false);
 assert.equal(doc.releaseGate.publication,"NO_GO");
 assert.equal(doc.counts.firstHumanApproved,0);
 assert.equal(doc.counts.independentSecondApproved,0);
 assert.equal(doc.counts.publishable,0);
 const prohibited=/(?:最高の相性|最悪の相性|相性が良い|相性が悪い|成功率は\d+%|相性点数|必ず成功|必ず破綻)/u;
 for(const row of doc.rows){
  assert.equal(row.firstHumanReview,"PENDING");
  assert.equal(row.independentSecondHumanReview,"PENDING");
  assert.equal(row.publicationApproved,false);
  assert.equal(row.scientificClaimApproved,false);
  assert.equal(row.draftCopyApproved,false);
  assert.equal(row.humanSemanticReviewComplete,false);
  assert.match(row.disclaimer,/判定しません/);
  assert.match(row.b1BipolarCaution,/未検証/);
  for(const text of [row.draftDescription,...row.draftConversationQuestions])
   assert.equal(prohibited.test(text),false,row.pairId+": "+text);
 }
});
