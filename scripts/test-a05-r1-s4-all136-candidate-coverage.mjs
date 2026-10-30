import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { S3_REVIEW_QUEUE } from "../projects/kidp/life-design-lab/a05/r1-s3-review-queue.mjs";
import { S4_REMAINING_112_CANDIDATES, S4_REMAINING_112_SUMMARY } from
 "../projects/kidp/life-design-lab/a05/r1-s4-remaining112-candidates.mjs";

const read = path=>readFileSync(new URL("../"+path,import.meta.url));
const json = path=>JSON.parse(read(path).toString("utf8"));
const source=json("docs/A05_S4_P2_P3_REMAINING112_EDITORIAL_CANDIDATES_V01_20261030.json");
const master=json("docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V01_20261030.json");
const p0=json("docs/A05_S4_P0_SAMETYPE_16_EDITORIAL_CANDIDATES_V01_20261030.json");
const p1=json("docs/A05_S4_P1_OPPOSITE_8_EDITORIAL_CANDIDATES_V01_20261030.json");
const sha=buffer=>createHash("sha1").update("blob "+buffer.length+"\0").update(buffer).digest("hex");

test("S4 112 P2/P3 pairs exact generator snapshot and Git blob pins",()=>{
 assert.equal(S4_REMAINING_112_CANDIDATES.length,112);
 assert.equal(source.items.length,112);
 assert.equal(source.generatorVersion,S4_REMAINING_112_SUMMARY.version);
 assert.deepEqual(source.counts,{total:112,P2:56,P3:56,firstHumanApproved:0,secondIndependentApproved:0,publishable:0});
 for(const [path,gitSha] of Object.entries(source.sourceGitBlobHashes))
  assert.equal(sha(read(path)),gitSha,path);
 for(let i=0;i<112;i++){
  const a=S4_REMAINING_112_CANDIDATES[i],b=source.items[i];
  assert.deepEqual(a,b);
  assert.deepEqual(a.axisCoverage,["A","B","C","D"]);
  assert.equal(a.dialoguePrompts.length,4);
  assert.equal(a.draftSharedAxes.length>=1,true);
  assert.equal(a.draftDifferentAxes.length>=1,true);
  assert.equal(a.humanFirstReview,"PENDING");
  assert.equal(a.humanIndependentSecondReview,"PENDING");
  assert.equal(a.editorialCopyApproved,false);
  assert.equal(a.scientificClaimApproved,false);
  assert.equal(a.publicationApproved,false);
  assert.equal(a.generationMethod,"MACHINE_ASSEMBLED_FOUR_AXIS_DISCUSSION_PROMPTS");
  assert.match(a.bAxisWarning,/未検証/);
  assert.ok(S3_REVIEW_QUEUE.some(r=>r.pairId===a.pairId&&r.priority===a.priority));
 }
 assert.deepEqual(S4_REMAINING_112_SUMMARY.byPriority,{P2_B1_DIFFERENCE:56,P3_OTHER:56});
});
test("S4 integrated 136-row master has complete disjoint review groups and immutable source trace",()=>{
 assert.equal(master.rows.length,136);
 assert.equal(new Set(master.rows.map(x=>x.pairId)).size,136);
 assert.deepEqual(master.highLevelCounts.byPriority,{
  P0_SAME_TYPE:16,P1_ALL_FOUR_DIFFERENT:8,P2_B1_DIFFERENCE:56,P3_OTHER:56
 });
 for(const [path,trace] of Object.entries(master.provenance))
  assert.equal(sha(read(path)),trace.gitBlobSha,path);
 const original=new Set([...p0.items,...p1.items,...source.items].map(x=>x.pairId));
 assert.equal(original.size,136);
 for(const r of master.rows){
  assert.ok(original.has(r.pairId));
  assert.equal(r.firstHumanReview,"PENDING");
  assert.equal(r.independentSecondHumanReview,"PENDING");
  assert.equal(r.humanReviewers.length,0);
  assert.equal(r.draftCopyApproved,false);
  assert.equal(r.scientificClaimApproved,false);
  assert.equal(r.publicationApproved,false);
  assert.equal(r.originalWorkbookV10Reconciled,false);
  assert.equal(r.evidence,"NO_DIRECT_PAIR_VALIDATION");
  assert.match(r.b1BipolarCaution,/未検証/);
  assert.ok(r.draftConversationQuestions.length>=2);
 }
 assert.equal(master.highLevelCounts.humanFirstApproved,0);
 assert.equal(master.highLevelCounts.humanIndependentSecondApproved,0);
 assert.equal(master.finalGate.publication,"NO_GO");
});
test("S4 copy duplication risk must remain explicit; uniqueness alone is not human quality approval",()=>{
 assert.equal(master.qualityFlags.dedupRequiresHumanRewriting,true);
 assert.ok(master.qualityFlags.sameDescriptionInMultipleRows>0);
 assert.ok(master.qualityFlags.pairsWithRepeatedQuestions>0);
 const questions=master.rows.flatMap(x=>x.draftConversationQuestions);
 assert.equal(questions.length,master.qualityFlags.totalConversationQuestions);
 assert.equal(new Set(questions).size,master.qualityFlags.uniqueConversationQuestions);
});
