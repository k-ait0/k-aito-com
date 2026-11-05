import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { structurePreview, TYPE_STRUCTURE_MODES, TYPE_STRUCTURE_EXPERIMENT_VERSION }
 from "../projects/kidp/life-design-lab/a05/type-structure-experiment.mjs";
import { B_SCENARIOS } from "../projects/kidp/life-design-lab/a05/b-preview-scenarios.mjs";
import { TYPES, GROUPS, TYPE_VERSION, CONTENT_VERSION } from "../projects/kidp/life-design-lab/a05/types.mjs";
import { QUESTIONS, QUESTION_SET_VERSION } from "../projects/kidp/life-design-lab/a05/questions.mjs";
import { SCORING_VERSION } from "../projects/kidp/life-design-lab/a05/engine.mjs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const matrix=JSON.parse(read("docs/A05_D86_TYPE_STRUCTURE_DECISION_20261026.json"));
const d82=JSON.parse(read("docs/A05_D82_V2_CONTRACT_BLUEPRINT_20261026.json"));
const d85=JSON.parse(read("docs/A05_D85_B_MODE_COMPARISON_20261026.json"));
const caseInput=s=>({bipolar:s.bipolar,self:s.self,others:s.others});

test("D86 B1/B2/B3 theoretical options align with decision table, not adopted types",()=>{
 assert.equal(matrix.schema,"A05-D86-TYPE-STRUCTURE-DECISION-1");
 assert.equal(matrix.status,"RECOMMENDATION_ONLY_HUMAN_DECISION_PENDING");
 assert.deepEqual(TYPE_STRUCTURE_MODES,["B1","B2","B3"]);
 assert.deepEqual(matrix.candidates.map(x=>x.id),TYPE_STRUCTURE_MODES);
 assert.deepEqual(matrix.candidates.map(x=>x.theoreticalCombinations),[16,8,8]);
 assert.deepEqual(matrix.candidates.map(x=>x.bFormat),["bipolar","independent","unclassified"]);
 assert.deepEqual(matrix.candidates.map(x=>x.BInBinaryType),[true,false,false]);
 assert.deepEqual(matrix.candidates.map(x=>x.theoreticalBinaryAxes),[
  ["A","B","C","D"],["A","C","D"],["A","C","D"]]);
 assert.deepEqual(matrix.candidates.map(x=>x.independentBFields),[[],["self","others"],[]]);
 assert.ok(matrix.candidates.every(x=>x.typeIdAllowed===false));
 assert.ok(matrix.candidates.every(x=>x.proposedPublicClassification==="WITHHELD_UNVALIDATED"));
 assert.equal(matrix.decision.formalWinner,"PENDING");
 assert.equal(matrix.decision.humanOwnerSignoff,"PENDING");
 assert.equal(matrix.decision.recommendedInitialNonClassification,"B3");
 assert.equal(matrix.decision.recommendedResearchContrast,"B1_vs_B2");
});

test("D86 every synthetic case withholds type and preserves independent B answers",()=>{
 assert.equal(TYPE_STRUCTURE_EXPERIMENT_VERSION,"A05-STRUCTURE-D86-0.1-unvalidated");
 assert.equal(B_SCENARIOS.length,8);
 for(const scenario of B_SCENARIOS){
  for(const candidate of matrix.candidates){
   const result=structurePreview(candidate.id,caseInput(scenario));
   assert.equal(result.schema,TYPE_STRUCTURE_EXPERIMENT_VERSION);
   assert.equal(result.mode,candidate.id);
   assert.equal(result.bFormat,candidate.bFormat);
   assert.deepEqual(result.hypotheticalAxes,candidate.theoreticalBinaryAxes);
   assert.deepEqual(result.separateBFields,candidate.independentBFields);
   assert.equal(result.possibleConfigurations,candidate.theoreticalCombinations);
   assert.equal(result.typeId,null);
   assert.equal(result.groupId,null);
   assert.equal(result.classificationStatus,"WITHHELD");
   assert.equal(result.measurementValidity,"UNVALIDATED");
   assert.equal(result.oldTypeCompatible,false);
   assert.equal(result.productionApproved,false);
   assert.ok(Object.isFrozen(result));
   assert.ok(Object.isFrozen(result.hypotheticalAxes));
   if(candidate.id==="B1"){
    assert.equal(result.illustrativeB.mode,"bipolar");
    assert.equal(result.illustrativeB.answer,scenario.bipolar);
   }else if(candidate.id==="B2"){
    assert.equal(result.illustrativeB.mode,"independent");
    assert.deepEqual(result.illustrativeB.ratings,{self:scenario.self,others:scenario.others});
   }else{
    assert.equal(result.illustrativeB,null);
   }
  }
 }
});

test("D86 B format cannot be converted to old four-bit types or to new eight types",()=>{
 const high=B_SCENARIOS.find(x=>x.id==="both-high");
 const low=B_SCENARIOS.find(x=>x.id==="both-low");
 assert.equal(high.bipolar,4);
 assert.equal(low.bipolar,4);
 assert.deepEqual([high.self,high.others],[7,7]);
 assert.deepEqual([low.self,low.others],[1,1]);
 for(const candidate of matrix.candidates){
  const h=structurePreview(candidate.id,caseInput(high));
  const l=structurePreview(candidate.id,caseInput(low));
  assert.equal(h.typeId,null);
  assert.equal(l.typeId,null);
  assert.equal(h.oldTypeCompatible,false);
  assert.equal(l.oldTypeCompatible,false);
  assert.equal(h.possibleConfigurations,l.possibleConfigurations);
 }
 assert.equal(matrix.typeOutputPolicy.noAutomaticBScoreFromB2,true);
 assert.equal(matrix.typeOutputPolicy.no8TypeAutoRelease,true);
 assert.equal(matrix.typeOutputPolicy.no16TypeAutoRelease,true);
 assert.equal(matrix.typeOutputPolicy.allModes.typeId,null);
 assert.equal(matrix.typeOutputPolicy.oldResultSnapshot,"READ_ONLY_FROZEN_OLD_VERSION");
 assert.equal(matrix.typeOutputPolicy.missingOrBorderlineResponse,"WITHHOLD_CLASSIFICATION_NOT_FORCE_MIDPOINT");
 assert.deepEqual(d85.nonEquivalence.sameBipolarMiddle,["both-high","both-low","both-middle"]);
});

test("D86 missing data is retained; malformed or inferred values are refused",()=>{
 const unknown={bipolar:null,self:null,others:null};
 assert.equal(structurePreview("B1",unknown).illustrativeB.responseStatus,"unanswered");
 assert.equal(structurePreview("B2",unknown).illustrativeB.responseStatus,"unanswered");
 assert.equal(structurePreview("B3",unknown).illustrativeB,null);
 assert.equal(structurePreview("B2",{bipolar:null,self:7,others:null}).illustrativeB.responseStatus,"partial");
 for(const config of [null,[],{}, {bipolar:4,self:4},{bipolar:4,self:4,others:4,extra:1}])
  assert.throws(()=>structurePreview("B1",config),TypeError);
 for(const mode of ["foo","",null,"bipolar"])
  assert.throws(()=>structurePreview(mode,unknown),TypeError);
 assert.throws(()=>structurePreview("B1",{bipolar:8,self:7,others:7}),TypeError);
 assert.throws(()=>structurePreview("B2",{bipolar:4,self:3,others:8}),TypeError);
});

test("D86 old A05 versions and questionnaire are untouched; all human gates remain pending",()=>{
 assert.equal(TYPES.length,16);
 assert.equal(GROUPS.length,4);
 assert.equal(QUESTIONS.length,30);
 assert.deepEqual(d82.versioning.legacyFrozen,{
  question:QUESTION_SET_VERSION,scoring:SCORING_VERSION,type:TYPE_VERSION,content:CONTENT_VERSION
 });
 assert.equal(matrix.assumptions.existingTypeVersion,TYPE_VERSION);
 assert.equal(matrix.releaseGates.ABlock,3);
 assert.equal(matrix.releaseGates.overallBlocks,7);
 assert.equal(matrix.releaseGates.g1ApprovalsPending,12);
 assert.equal(matrix.releaseGates.d42AcceptancePending,16);
 for(const key of ["humanProductApproval","ownerSelectABDefinition","newQuestionItemsApproved",
  "psychometricValidated","realParticipantResearchAuthorized","persistNewAssessmentsAuthorized",
  "mergeAuthorized","productionReleaseAuthorized"])
  assert.equal(matrix.releaseGates[key],false,key);
 assert.equal(matrix.typeOutputPolicy.no16TypeAutoRelease,true);
 const doc=read("docs/A05_D86_TYPE_STRUCTURE_REVIEW_20261026.md");
 assert.match(doc,/決裁票/);
 assert.match(doc,/未承認/);
 assert.match(doc,/改訂履歴/);
});

test("D86 static preview is noindex, fictional, and contains no persistence or network APIs",()=>{
 const html=read("projects/kidp/life-design-lab/a05/type-structure-preview.html");
 const js=read("projects/kidp/life-design-lab/a05/type-structure-preview.mjs");
 const engine=read("projects/kidp/life-design-lab/a05/type-structure-experiment.mjs");
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(html,/id="mode"/);
 assert.match(html,/id="case"/);
 assert.match(html,/合成/);
 assert.match(js,/structurePreview/);
 assert.equal(js.includes("typeId"),false);
 for(const forbidden of ["localStorage","sessionStorage","indexedDB","fetch(",
  "XMLHttpRequest","sendBeacon","navigator.serviceWorker","innerHTML","https://","http://"])
  assert.equal([html,js,engine].some(s=>s.includes(forbidden)),false,forbidden);
});
