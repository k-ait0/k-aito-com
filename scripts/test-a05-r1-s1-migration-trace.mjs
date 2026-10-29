import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const fromDocs = file=>JSON.parse(readFileSync(new URL("../docs/"+file,import.meta.url),"utf8"));
const ledger=fromDocs("A05_R1_RELEASE_GATE_LEDGER_V01_20261029.json");
const migration=fromDocs("A05_S1_TAXONOMY_MIGRATION_TRACE_V01_20261030.json");
const prototypes=fromDocs("A05_S1_B2_ITEM_PROTOTYPES_V01_20261030.json");

test("S1 continued research does not silently grant taxonomy or release approval",()=>{
 assert.equal(ledger.stages[0].acceptedCount,6);
 assert.equal(ledger.stages[1].acceptedCount,2);
 assert.equal(ledger.overallReleaseStatus,"NO_GO");
 assert.equal(ledger.releaseDecisionGranted,false);
 assert.equal(ledger.implementationValidationPassed,false);
 assert.equal(migration.ownerApproval,"PENDING");
 assert.equal(migration.productionRelease,"NO_GO");
 assert.equal(prototypes.scientificValidity,"NOT_ESTABLISHED");
 assert.equal(prototypes.userApproval,"NOT_GRANTED_FOR_NEW_ITEMS");
});
test("S1 legacy frozen IDs, 136 pair IDs and downstream gates remain separate from B2",()=>{
 assert.equal(migration.legacy.typeCount,16);
 assert.equal(migration.legacy.unorderedPairs,136);
 assert.equal(migration.legacy.r1Meaning,"DRAFT_EDITORIAL_CHARACTER_NOT_PERSONALITY_MEASUREMENT");
 assert.equal(migration.branches.length,4);
 assert.ok(migration.branches.every(b=>
  b.autoAssignUsers===false && b.legacyScoreCompatible===false &&
  b.publicReleaseApproved===false));
 assert.equal(migration.syntheticProofPoints.length,3);
 for (const item of migration.syntheticProofPoints){
  assert.equal(item.typeId,null);
  assert.equal(item.legacyB,"NOT_DERIVABLE");
 }
 assert.deepEqual(migration.downstreamImpacts.map(x=>x.step),["S3","S4","S5","S6","S7"]);
});
test("S1 B2 draft contains alternative missingness and explicit content-validity risks",()=>{
 assert.equal(prototypes.scenarios.length,6);
 assert.equal(new Set(prototypes.scenarios.flatMap(x=>[
  x.self.itemId,x.others.itemId])).size,12);
 assert.equal(prototypes.noActualParticipantData,true);
 assert.equal(prototypes.noLegacyBConversion,true);
 assert.equal(prototypes.noUserFacingRelease,true);
 assert.ok(prototypes.responseDraft.distinctNoAnswerStates.includes("not_applicable"));
 assert.ok(prototypes.responseDraft.distinctNoAnswerStates.includes("prefer_not_to_answer"));
 assert.equal(prototypes.contentValidityPreconditions.length,8);
 assert.ok(prototypes.sources.some(s=>s.role==="METHODOLOGICAL_GUIDANCE_NOT_A05_VALIDATION"));
});
