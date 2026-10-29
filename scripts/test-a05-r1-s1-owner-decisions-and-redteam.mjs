import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TYPES } from "../projects/kidp/life-design-lab/a05/types.mjs";
import { compareManualCharacterPair } from "../projects/kidp/life-design-lab/a05/r1-manual-pair-contract.mjs";
import { inspectSyntheticB2Fixture } from "../projects/kidp/life-design-lab/a05/b2-prototype-contract.mjs";
const read = p => JSON.parse(readFileSync(new URL("../docs/"+p,import.meta.url),"utf8"));
const pack=read("A05_S1_OWNER_DECISION_PACKET_V01_20261030.json");
const redteam=read("A05_S1_INTERPRETATION_REDTEAM_V01_20261030.json");
const ledger=read("A05_R1_RELEASE_GATE_LEDGER_V01_20261029.json");
const legacy=read("A05_S1_TAXONOMY_MIGRATION_TRACE_V01_20261030.json");

test("S1 decision pack never promotes research recommendations to human approvals",()=>{
 assert.equal(pack.approvalStatus,"DRAFT_FOR_OWNER_SIGNOFF");
 assert.equal(pack.ownerSignoff,null);
 assert.equal(pack.independentScienceReview,"NOT_PERFORMED");
 assert.equal(pack.individualParticipantResearch,"NOT_AUTHORIZED");
 assert.equal(pack.publication,"NO_GO");
 assert.deepEqual(pack.decisions.map(x=>x.gate),["S1-2","S1-3","S1-4","S1-5","S1-7","S1-8"]);
 for(const x of pack.decisions) {
  assert.equal(x.ownerChoice,null);
  assert.equal(x.scientificallyEstablished,false);
  assert.ok(Array.isArray(x.neededEvidence));
  assert.ok(x.neededEvidence.length>0);
 }
 assert.equal(ledger.stages[0].acceptedCount,6);
 assert.equal(ledger.stages[1].acceptedCount,2);
 assert.equal(ledger.overallReleaseStatus,"NO_GO");
 assert.equal(ledger.releaseDecisionGranted,false);
 assert.equal(legacy.ownerApproval,"PENDING");
});
test("S1 adversarial scenarios cover 15 distinct misleading user assumptions",()=>{
 assert.equal(redteam.kind,"SYNTHETIC_EDITORIAL_QA_NO_REAL_USER_TEST");
 assert.equal(redteam.cases.length,15);
 assert.equal(new Set(redteam.cases.map(x=>x.id)).size,15);
 assert.equal(redteam.realUserComprehensionTestComplete,false);
 assert.equal(redteam.ownerApproval,null);
 assert.equal(redteam.release,"NO_GO");
 assert.equal(redteam.invariants.sameTypePairs,16);
 assert.equal(redteam.invariants.unorderedPairs,136);
 assert.equal(redteam.invariants.orderedSelections,256);
 for(const scenario of redteam.cases){
  assert.ok(scenario.claim && scenario.mitigation && scenario.codeBound);
 }
});
test("S1 R1 only returns structural four-axis comparison for 256 manual selections",()=>{
 let same=0;const unique=new Set();
 for(const a of TYPES)for(const b of TYPES){
  const x=compareManualCharacterPair({leftTypeId:a.id,rightTypeId:b.id});
  unique.add(x.pairId);
  assert.equal(x.mode,"TWO_DRAFT_CHARACTERS_SELECTED_MANUALLY");
  assert.equal(x.structure.sharedAxisCount+x.structure.differentAxisCount,4);
  assert.equal(x.compatibilityScore,null);
  assert.equal(x.compatibilityRank,null);
  assert.equal(x.successPrediction,null);
  assert.equal(x.inferredPersonalTypeId,null);
  assert.equal(x.personalAssessmentPerformed,false);
  assert.equal(x.publicationApproved,false);
  assert.equal(x.researchValidated,false);
  assert.match(x.axisBWarning,/未検証/);
  assert.match(x.disclaimer,/判定するものではありません/);
  if(a.id===b.id) {
   same++;
   assert.equal(x.sameType,true);
   assert.equal(x.structure.sharedAxisCount,4);
   assert.equal(x.structure.differentAxisCount,0);
  }
 }
 assert.equal(unique.size,136);
 assert.equal(same,16);
});
test("S1 B2 synthetic data never produces B1 bit or legacy T-ID",()=>{
 const v=inspectSyntheticB2Fixture({
  scenarioId:"B2P01",
  self:{status:"answered",value:7},
  others:{status:"answered",value:7}
 });
 assert.equal(v.legacyBBinary,null);
 assert.equal(v.typeId,null);
 assert.equal(v.groupId,null);
 assert.equal(v.scoresGenerated,false);
 assert.equal(v.productionApproved,false);
 assert.equal(v.measurementValidated,false);
 assert.equal(v.syntheticExampleOnly,true);
 assert.throws(()=>compareManualCharacterPair({
  leftTypeId:"T01",rightTypeId:"T02",b2Results:v
 }),TypeError);
});
