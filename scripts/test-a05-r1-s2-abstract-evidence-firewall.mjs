import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { LITERATURE_CANDIDATES } from "../projects/kidp/life-design-lab/a05/compatibility-literature-candidates.mjs";
import { reviewClaimPermission, CLAIM_KINDS, EVIDENCE_SOURCE_RECORDS } from
 "../projects/kidp/life-design-lab/a05/compatibility-evidence.mjs";
const toBuffer = p=>readFileSync(new URL("../"+p,import.meta.url));
const ledger=JSON.parse(toBuffer("docs/A05_S2_SEVEN_STUDY_ABSTRACT_SCREENING_V01_20261030.json").toString("utf8"));
const toBlobSha = contents=> createHash("sha1").update("blob "+contents.length+"\0").update(contents).digest("hex");

test("S2 seven primary abstract records match original candidates with immutable SHA",()=>{
 const origin=toBuffer(ledger.existingSourceOfTruth);
 assert.equal(toBlobSha(origin),ledger.existingSourceGitBlobSha);
 assert.equal(LITERATURE_CANDIDATES.length,7);
 assert.equal(ledger.sources.length,7);
 assert.equal(new Set(ledger.sources.map(x=>x.id)).size,7);
 for(const row of ledger.sources){
  const old=LITERATURE_CANDIDATES.find(x=>x.id===row.id);
  assert.ok(old,row.id);
  assert.equal(row.doi.toLowerCase(),old.doi.toLowerCase());
  assert.equal(row.checkLevel,"ABSTRACT_OR_AUTHOR_OR_PUBLISHER_TEXT_ONLY");
  assert.equal(row.fullTextMethodReview,"PENDING");
  assert.equal(row.publicationClaimApproval,false);
  assert.equal(row.a05ConstructValidated,false);
  assert.equal(row.a05IndividualPairValidated,false);
  assert.equal(row.authorizesCompatibilityScoring,false);
  assert.equal(row.independentReview,"PENDING");
  assert.ok(row.prohibitedInference);
 }
});
test("S2 source inventory cannot become production evidence automatically",()=>{
 assert.equal(ledger.approvedForPublication,0);
 assert.equal(ledger.ownerApproval,"NOT_GRANTED");
 assert.equal(ledger.independentScienceReviewer,"NOT_ASSIGNED");
 assert.equal(ledger.allSourcesDirectlyValidateA05,false);
 assert.equal(EVIDENCE_SOURCE_RECORDS.length,0);
 assert.equal(ledger.jointEvidenceFindings.length,3);
 assert.ok(ledger.jointEvidenceFindings.every(x=>x.status==="INTERNAL_ONLY"));
 for(const state of Object.values(ledger.claimPolicy))
  assert.ok(state==="BLOCKED" || state==="BLOCKED_PENDING_FULL_REVIEW_AND_OWNER_SIGNOFF" ||
    state==="PERMITTED_AS_INTERNAL_EDITORIAL_FACT_ONLY");
});
test("S2 all 8 claim kinds still fail closed for production and predictions",()=>{
 const claims=Object.values(CLAIM_KINDS);
 assert.equal(claims.length,8);
 for(const kind of claims){
  for(const axes of [[],["A"],["B"],["A","B","C","D"],["E"]]){
   const result=reviewClaimPermission(kind,axes);
   assert.equal(result.productionAllowed,false);
   assert.equal(result.scientificSupportEstablished,false);
   assert.equal(result.sourceIds.length,0);
   if(kind===CLAIM_KINDS.A05_PAIR_COMPATIBILITY ||
      kind===CLAIM_KINDS.RELATIONSHIP_OUTCOME_PREDICTION ||
      kind===CLAIM_KINDS.COMPATIBILITY_SCORE_OR_RANK ||
      kind===CLAIM_KINDS.GENERAL_RESEARCH_ASSOCIATION)
     assert.equal(result.editorialPreviewAllowed,false);
  }
 }
});
