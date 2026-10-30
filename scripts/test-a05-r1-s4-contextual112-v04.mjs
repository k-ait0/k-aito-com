/** Native Node regression test: run locally with
 * node --test scripts/test-a05-r1-s4-contextual112-v04.mjs
 * No GitHub Actions, no network, no respondent data.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import { S4_CONTEXTUAL_112_DRAFTS, S4_CONTEXTUAL_112_SUMMARY } from "../projects/kidp/life-design-lab/a05/r1-s4-contextual112-v04.mjs";
const load = p => JSON.parse(readFileSync(new URL("../docs/"+p,import.meta.url),"utf8"));
const candidates=load("A05_S4_P2_P3_CONTEXTUAL112_CANDIDATES_V04_20261030.json");
const master=load("A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V04_20261030.json");
const old=load("A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V03_20261030.json");
const patterns=["同じ日に考えるなら","どんな問い方が適切ですか","どんな希望の違いや共通点を確認しますか","暫定4軸で異なる表示は"];
const keys=["A","B","C","D"];
test("generator and saved 112 candidates agree exactly",()=>{
 assert.equal(S4_CONTEXTUAL_112_SUMMARY.count,112);
 assert.deepEqual(candidates.rows,JSON.parse(JSON.stringify(S4_CONTEXTUAL_112_DRAFTS)));
 assert.equal(candidates.sourceGeneratorVersion,S4_CONTEXTUAL_112_SUMMARY.version);
 assert.equal(candidates.nativeNodeTestExecuted,false); // snapshots preserve creation-time record
});
test("136 rows, 16 same-type, 8 all-opposite, P2=56, P3=56",()=>{
 assert.equal(master.rows.length,136);
 assert.equal(new Set(master.rows.map(x=>x.pairId)).size,136);
 for(const [p,n] of Object.entries({P0_SAME_TYPE:16,P1_ALL_FOUR_DIFFERENT:8,P2_B1_DIFFERENCE:56,P3_OTHER:56}))
  assert.equal(master.rows.filter(x=>x.priority===p).length,n,p);
 assert.deepEqual(master.rows.map(x=>x.pairId),old.rows.map(x=>x.pairId));
});
test("P0/P1 24 rows remain deep-equal to v0.3",()=>{
 const protectedRows=new Map(old.rows.filter(x=>x.priority==="P0_SAME_TYPE"||x.priority==="P1_ALL_FOUR_DIFFERENT").map(x=>[x.pairId,x]));
 assert.equal(protectedRows.size,24);
 for(const x of master.rows) if(protectedRows.has(x.pairId))assert.deepEqual(x,protectedRows.get(x.pairId),x.pairId);
});
test("P2/P3 112 rows exactly follow generated contents and schema",()=>{
 const byId=new Map(candidates.rows.map(x=>[x.pairId,x]));
 assert.equal(byId.size,112);
 for(const x of master.rows){
  const gen=byId.get(x.pairId); if(!gen)continue;
  assert.equal(x.priority,gen.priority);
  assert.deepEqual(x.typeIds,gen.typeIds);
  assert.deepEqual(x.displayNames,gen.names);
  assert.equal(x.draftDescription,gen.draftDescription);
  assert.deepEqual(x.draftConversationQuestions,gen.draftConversationQuestions);
  assert.deepEqual(x.fourAxisReferences,gen.fourAxisReferences);
 }
});
test("four axes, reviewers absent, nonprediction, no synthetic approval",()=>{
 for(const x of master.rows){
  assert.equal(x.sharedAxes.length+x.differentAxes.length,4,x.pairId);
  assert.deepEqual(new Set([...x.sharedAxes,...x.differentAxes]),new Set(keys));
  assert.equal(x.firstHumanReview,"PENDING",x.pairId);
  assert.equal(x.independentSecondHumanReview,"PENDING",x.pairId);
  assert.deepEqual(x.humanReviewers,[],x.pairId);
  assert.equal(x.draftCopyApproved,false,x.pairId);
  assert.equal(x.scientificClaimApproved,false,x.pairId);
  assert.equal(x.publicationApproved,false,x.pairId);
  assert.equal(x.humanSemanticReviewComplete,false,x.pairId);
  if(x.priority==="P2_B1_DIFFERENCE"||x.priority==="P3_OTHER"){
   assert.equal(x.compatibilityScore,null,x.pairId);
   assert.equal(x.relationshipPrediction,null,x.pairId);
  }
 }
 assert.equal(master.release,"NO_GO");
});
test("no duplicate literal texts or four formerly flagged phrases",()=>{
 const descriptions=master.rows.map(x=>x.draftDescription);
 const qs=master.rows.flatMap(x=>x.draftConversationQuestions);
 assert.equal(new Set(descriptions).size,136);
 assert.equal(qs.length,392);
 assert.equal(new Set(qs).size,392);
 for(const x of master.rows)for(const p of patterns){
  assert.ok(!x.draftDescription.includes(p),x.pairId+" "+p);
  assert.ok(x.draftConversationQuestions.every(q=>!q.includes(p)),x.pairId+" "+p);
 }
 assert.equal(master.numbers.semanticPhraseFlaggedRows,0);
});
