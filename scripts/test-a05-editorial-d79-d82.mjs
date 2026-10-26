import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QUESTIONS, QUESTION_SET_VERSION } from "../projects/kidp/life-design-lab/a05/questions.mjs";
import { SCORING_VERSION, validateQuestions } from "../projects/kidp/life-design-lab/a05/engine.mjs";
import { TYPES, TYPE_VERSION, CONTENT_VERSION } from "../projects/kidp/life-design-lab/a05/types.mjs";
const read = p => readFileSync(new URL("../"+p, import.meta.url),"utf8");
const readJson = p => JSON.parse(read(p));
const d73=readJson("docs/A05_D73_ITEM_CONSTRUCT_CROSSWALK_20261026.json");
const d79=readJson("docs/A05_D79_AXIS_SELECTION_MATRIX_20261026.json");
const d80=readJson("docs/A05_D80_PILOT_CANDIDATES_20261026.json");
const d81=readJson("docs/A05_D81_E_PRODUCT_GATE_20261026.json");
const d82=readJson("docs/A05_D82_V2_CONTRACT_BLUEPRINT_20261026.json");
test("D79 A/B recommendation includes L/M/R with selection pending",()=>{
 assert.equal(d79.status,"EDITORIAL_RECOMMENDATION_NOT_APPROVED");
 assert.deepEqual(d79.axes.map(x=>x.id),["A","B"]);
 for(const axis of d79.axes) {
  assert.deepEqual(axis.options.map(x=>x.id),["L","M","R"]);
  assert.equal(axis.selection,"PENDING");
  assert.ok(axis.editorialPriority.startsWith("R"));
  assert.ok(axis.goNoGo.length>=3);
  for(const option of axis.options) assert.deepEqual(Object.keys(option.ratings),d79.rubric.dimensions.map(x=>x.id));
 }
 assert.equal(d79.gates.humanAdoptionApproval,false);
 assert.equal(d79.gates.constructChoiceByOwner,"PENDING");
 assert.equal(d79.typePolicy.conditionalCopies,"D75_L_AND_M_NOT_REUSABLE_AS_R_COPY");
 assert.match(read("docs/A05_D79_AXIS_SELECTION_RECOMMENDATION_20261026.md"),/未承認/);
});
test("D80 stores 30 original IDs, 24 non-E candidate slots and all seven BLOCK items",()=>{
 assert.equal(d80.state,"CANDIDATE_INVENTORY_NOT_A_QUESTIONNAIRE");
 assert.equal(d80.items.length,30);
 assert.equal(new Set(d80.items.map(x=>x.id)).size,30);
 assert.deepEqual(d80.items.map(x=>x.id),d73.items.map(x=>x.id));
 assert.deepEqual(d80.selectionBasis,{AB:"D79 R is an editorial priority, not owner choice.",CD:"D57/D59 candidate copy, unchanged.",E:"Quarantined until D81 selection. Engineering baseline E-C only.",lockedQuestionCount:30,comparisonPoolSlots:24,readyToAdopt:0});
 const blocked=d80.items.filter(x=>x.oldEditorialVerdict==="BLOCK");
 assert.deepEqual(blocked.map(x=>x.id),["A04","B02","C04","D03","E04","A05","E05"].sort((a,b)=>d73.items.findIndex(x=>x.id===a)-d73.items.findIndex(x=>x.id===b)));
 assert.equal(blocked.length,7);
 assert.equal(d80.items.filter(x=>x.axis!=="E").length,24);
 assert.equal(d80.items.filter(x=>x.axis==="E").length,6);
 for(const x of d80.items) {
  const original=d73.items.find(z=>z.id===x.id);
  assert.deepEqual(x.sourceCurrent,original.current,x.id);
  assert.equal(x.approved,false,x.id);
  assert.equal(x.researchValidation,false,x.id);
  if(x.axis==="E") {
   assert.equal(x.candidateR,null);
   assert.equal(x.disposition,"NOT_IN_24_ITEM_BASELINE");
  } else {
   assert.ok(x.candidateR.negative && x.candidateR.positive,x.id);
   assert.notEqual(x.candidateR.negative,x.candidateR.positive,x.id);
   if(["C","D"].includes(x.axis)){
    assert.equal(x.candidateR.negative,original.candidate.negative,x.id);
    assert.equal(x.candidateR.positive,original.candidate.positive,x.id);
   }
   if(original.editorialStatus==="BLOCK") assert.equal(x.disposition,"BLOCK_PENDING_REWRITE_OR_DELETE",x.id);
  }
 }
 assert.equal(d80.gates.blockersRemaining,7);
 assert.equal(d80.gates.activeABCDblockersRemaining,5);
 assert.equal(d80.gates.newQuestionHashAssigned,false);
 assert.equal(d80.gates.questionCountApproved,false);
 assert.throws(()=>validateQuestions(d80.items.filter(x=>x.axis!=="E")),/exactly 30/);
 assert.match(read("docs/A05_D80_PILOT_POOL_REVIEW_20261026.md"),/正式採用なし/);
});
test("D81 E-C engineering fallback does not authorize E classification",()=>{
 assert.equal(d81.state,"TECHNICAL_RECOMMENDATION_ONLY");
 assert.equal(d81.engineeringSafeBaseline,"E-C");
 assert.equal(d81.productDecision,"PENDING");
 assert.deepEqual(d81.unapprovedAlternatives,["E-A","E-B","E-C"]);
 assert.equal(d81.gates.eSelected,false);
 assert.equal(d81.securityContract.convertLegacyWealth,false);
 assert.equal(d81.securityContract.writeNewEIntoLegacyWealth,false);
 assert.equal(d81.securityContract.publishDerived32Types,false);
 assert.match(read("docs/A05_D81_E_RECOMMENDATION_20261026.md"),/未承認/);
});
test("D82 blueprint is versionless, read-only legacy and cannot pretend to be production",()=>{
 assert.equal(d82.status,"INTERFACE_BLUEPRINT_NO_IMPLEMENTATION");
 assert.deepEqual(d82.scope.candidateAxes,["A","B","C","D"]);
 assert.equal(d82.scope.candidateItemSlots,24);
 assert.equal(d82.scope.legacyItems,QUESTIONS.length);
 assert.equal(d82.scope.legacyTypes,TYPES.length);
 assert.deepEqual(d82.versioning.legacyFrozen,{question:QUESTION_SET_VERSION,scoring:SCORING_VERSION,type:TYPE_VERSION,content:CONTENT_VERSION});
 assert.deepEqual(Object.values(d82.versioning.candidate),Array(5).fill("UNASSIGNED"));
 assert.equal(d82.dataContracts.legacy.policy,"READ_ONLY_NO_MUTATION_NO_AUTO_RESCORING_NO_SCHEMA_CAST");
 assert.equal(d82.dataContracts.result.wealth,"FORBIDDEN_ON_NEW_RESULT");
 assert.equal(d82.dataContracts.result.optionalE,"ABSENT_IN_SAFE_BASELINE");
 assert.equal(d82.gates.pilotProductionReady,false);
 assert.equal(d82.gates.versionIdentifiersIssued,false);
 assert.ok(d82.blockedImplementation.length>=6);
 assert.match(read("docs/A05_D82_VERSIONED_RUNTIME_BLUEPRINT_20261026.md"),/設計文書/);
});
test("D79-D82 safety properties cannot turn CI green into real approval",()=>{
 for(const j of [d79,d80,d81,d82]) {
  assert.equal(j.gates.studyAuthorized,false);
  assert.equal(j.gates.productionReleaseAuthorized,false);
  assert.equal(j.gates.mergeAuthorized,false);
  assert.equal(j.gates.humanAdoptionApproval,false);
  assert.equal(j.gates.legacyRescoringAllowed,false);
  assert.equal(j.gates.questionRuntimeChanged,false);
  assert.equal(j.changeHistory.length,1);
 }
});
