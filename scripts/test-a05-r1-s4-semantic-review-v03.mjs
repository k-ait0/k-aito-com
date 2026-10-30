import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const read=path=>readFileSync(new URL("../"+path,import.meta.url));
const json=path=>JSON.parse(read(path).toString("utf8"));
const master2=json("docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V02_20261030.json");
const master3=json("docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V03_20261030.json");
const audit=json("docs/A05_S4_SEMANTIC_RISK_AUDIT_V01_20261030.json");
const p1=json("docs/A05_S4_P1_EIGHT_CONTEXTUAL_REWRITES_V01_20261030.json");
const pack=json("docs/A05_S4_P0P1_24PAIR_INDEPENDENT_REVIEW_PACKET_V01_20261030.json");
const gitBlobSha=bytes=>createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
const patternCodes={
 FORCED_SAME_DAY:"同じ日に考えるなら",
 META_QUESTION:"どんな問い方が適切ですか",
 ABSTRACT_GENERIC_QUESTION:"どんな希望の違いや共通点を確認しますか",
 AXIS_LIST_AS_NARRATIVE:"暫定4軸で異なる表示は"
};
const codesFor=x=>Object.entries(patternCodes).filter(([code,needle])=>
 code==="AXIS_LIST_AS_NARRATIVE"?
 x.draftDescription.includes(needle):x.draftConversationQuestions.some(q=>q.includes(needle))).map(([code])=>code);

test("S4 v0.3 source provenance matches pinned Git blob SHAs",()=>{
 for(const [sourcePath,expectedSha] of Object.entries(master3.sourceFiles))
  assert.equal(gitBlobSha(read(sourcePath)),expectedSha,sourcePath);
 for(const [sourcePath,expectedSha] of Object.entries(pack.basis))
  assert.equal(gitBlobSha(read(sourcePath)),expectedSha,sourcePath);
 assert.equal(audit.sourceGitBlobSha,gitBlobSha(read(audit.sourcePath)));
 assert.equal(p1.sourceMasterGitBlobSha,gitBlobSha(read(p1.sourceMasterPath)));
});

test("S4 edits precisely 8 P1 pairs and preserves 16 P0 and 112 P2/P3",()=>{
 const prev=new Map(master2.rows.map(r=>[r.pairId,r]));
 const proposals=new Map(p1.proposals.map(r=>[r.pairId,r]));
 assert.equal(master3.rows.length,136);
 assert.equal(new Set(master3.rows.map(r=>r.pairId)).size,136);
 assert.equal(proposals.size,8);
 let changed=0,unchanged=0;
 for(const row of master3.rows){
  const old=prev.get(row.pairId);
  assert.ok(old,row.pairId);
  assert.deepEqual(row.sharedAxes,old.sharedAxes);
  assert.deepEqual(row.differentAxes,old.differentAxes);
  assert.deepEqual(row.typeIds,old.typeIds);
  const proposal=proposals.get(row.pairId);
  if(proposal){
   changed++;
   assert.equal(row.priority,"P1_ALL_FOUR_DIFFERENT");
   assert.equal(row.draftDescription,proposal.proposedDescription);
   assert.deepEqual(row.draftConversationQuestions,proposal.proposedQuestions);
   assert.deepEqual(row.focusAxisIds,proposal.focusAxisIds);
  }else{
   unchanged++;
   assert.equal(row.draftDescription,old.draftDescription);
   assert.deepEqual(row.draftConversationQuestions,old.draftConversationQuestions);
  }
  assert.equal(row.firstHumanReview,"PENDING");
  assert.equal(row.independentSecondHumanReview,"PENDING");
  assert.equal(row.humanSemanticReviewComplete,false);
  assert.equal(row.draftCopyApproved,false);
  assert.equal(row.publicationApproved,false);
 }
 assert.equal(changed,8);assert.equal(unchanged,128);
});

test("S4 exact phrase risk declines from 120 to 112 and all groups stay visible",()=>{
 assert.equal(audit.results.flaggedPairs,120);
 assert.equal(master3.numbers.semanticPhraseFlaggedRows,112);
 const byPriority=Object.fromEntries(["P0_SAME_TYPE","P1_ALL_FOUR_DIFFERENT","P2_B1_DIFFERENCE","P3_OTHER"].map(k=>[
 k,master3.rows.filter(r=>r.priority===k&&codesFor(r).length>0).length
 ]));
 assert.deepEqual(byPriority,{
  P0_SAME_TYPE:0,P1_ALL_FOUR_DIFFERENT:0,P2_B1_DIFFERENCE:56,P3_OTHER:56
 });
 assert.deepEqual(byPriority,master3.numbers.semanticPhraseFlagsByPriority);
 const q=master3.rows.flatMap(x=>x.draftConversationQuestions);
 assert.equal(q.length,392);
 assert.equal(new Set(q).size,392);
 assert.equal(new Set(master3.rows.map(x=>x.draftDescription)).size,136);
 assert.equal(master3.release,"NO_GO");
 assert.equal(master3.numbers.firstHumanApproved,0);
 assert.equal(master3.numbers.independentSecondApproved,0);
});

test("S4 P0/P1 reviewer packet has 24 distinct pending records with seven unreviewed criteria",()=>{
 assert.equal(pack.entries.length,24);
 assert.equal(new Set(pack.entries.map(x=>x.pairId)).size,24);
 assert.equal(pack.summary.P0OriginalsWithEditorialRiskNotes,16);
 assert.equal(pack.summary.P1RevisedCandidates,8);
 assert.equal(pack.summary.firstHumanApproved,0);
 assert.equal(pack.summary.independentSecondHumanApproved,0);
 const required=["C1_SPECIFICITY","C2_CROSS_AXIS","C3_NATURALNESS","C4_NONPREDICTIVE","C5_B1_B2_BOUNDARY","C6_CONTEXT_APPLICABILITY","C7_CLAIM_PROVENANCE"];
 for(const row of pack.entries){
  assert.deepEqual(Object.keys(row.reviewCriteria),required);
  assert.ok(Object.values(row.reviewCriteria).every(x=>x==="NOT_REVIEWED"));
  assert.equal(row.firstReviewer,null);
  assert.equal(row.firstApproval,"PENDING");
  assert.equal(row.secondIndependentReviewer,null);
  assert.equal(row.secondApproval,"PENDING");
  assert.equal(row.humanReviewed,false);
  assert.equal(row.publicApproved,false);
 }
 assert.equal(pack.productionDecision,"NO_GO");
});
