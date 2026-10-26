import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
 B_EXPERIMENT_VERSION,B_EXPERIMENT_MODES,experimentalB,validateExperimentalB,isLegacyBCompatible
} from "../projects/kidp/life-design-lab/a05/b-experiment.mjs";
import {
 B_SCENARIO_VERSION,B_SCENARIOS
} from "../projects/kidp/life-design-lab/a05/b-preview-scenarios.mjs";
import { QUESTIONS,QUESTION_SET_VERSION } from "../projects/kidp/life-design-lab/a05/questions.mjs";
import { SCORING_VERSION } from "../projects/kidp/life-design-lab/a05/engine.mjs";
import { TYPES,TYPE_VERSION,CONTENT_VERSION } from "../projects/kidp/life-design-lab/a05/types.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const matrix=JSON.parse(read("docs/A05_D85_B_MODE_COMPARISON_20261026.json"));
test("D85 B experimental contracts validate exact fields and explicit missing states",()=>{
 assert.equal(B_EXPERIMENT_VERSION,"A05-B-EXP-0.1.0-unvalidated");
 assert.deepEqual(B_EXPERIMENT_MODES,["bipolar","independent"]);
 for(const answer of [1,4,7,null]) assert.equal(validateExperimentalB({mode:"bipolar",answer}),true);
 for(const self of [1,4,7,null])for(const others of [1,4,7,null])
  assert.equal(validateExperimentalB({mode:"independent",self,others}),true);
 for(const item of [
  {mode:"bipolar"},{mode:"bipolar",answer:0},{mode:"bipolar",answer:8},
  {mode:"bipolar",answer:4.3},{mode:"bipolar",answer:"4"},
  {mode:"independent",self:7},{mode:"independent",self:7,others:8},
  {mode:"independent",self:null,others:"4"},{mode:"omitted"},
  {mode:"bipolar",answer:4,self:4},null,[],{}
 ]) assert.throws(()=>validateExperimentalB(item),TypeError,JSON.stringify(item));
 const missing=experimentalB({mode:"independent",self:7,others:null});
 assert.equal(missing.responseStatus,"partial");
 assert.equal(experimentalB({mode:"bipolar",answer:null}).responseStatus,"unanswered");
 assert.equal(experimentalB({mode:"independent",self:null,others:null}).responseStatus,"unanswered");
 assert.equal(Object.isFrozen(missing),true);
 assert.equal(Object.isFrozen(missing.ratings),true);
});
test("D85 eight fictional scenario records exactly mirror the decision matrix",()=>{
 assert.equal(matrix.schema,"A05-D85-B-MODE-COMPARISON-1");
 assert.equal(matrix.version,"D85-001");
 assert.equal(matrix.state,"SYNTHETIC_DESIGN_REVIEW_ONLY");
 assert.equal(B_SCENARIO_VERSION,"D85-001-synthetic");
 assert.equal(B_SCENARIOS.length,8);
 assert.deepEqual(B_SCENARIOS.map(x=>x.id),matrix.syntheticScenarios.map(x=>x.id));
 for(const example of matrix.syntheticScenarios){
  const linked=B_SCENARIOS.find(x=>x.id===example.id);
  assert.ok(linked);
  assert.deepEqual({bipolar:linked.bipolar,self:linked.self,others:linked.others}, {
   bipolar:example.inputs.bipolar.answer,
   self:example.inputs.independent.self,
   others:example.inputs.independent.others
  });
  assert.equal(linked.name,example.name);
  assert.equal(linked.focus,example.focus);
  assert.equal(example.fictional,true);
  for(const key of ["bipolar","independent"]){
   const actual=experimentalB(example.inputs[key]);
   assert.equal(actual.schema,B_EXPERIMENT_VERSION);
   const {schema,...rest}=actual;
   assert.deepEqual(rest,example.expected[key],example.id+" "+key);
   assert.equal(isLegacyBCompatible(actual),false);
   assert.equal("typeId" in actual,false);
   assert.equal("wealth" in actual,false);
  }
 }
});
test("D85 identical bipolar midpoint does not identify both-high versus both-low",()=>{
 const middle=matrix.nonEquivalence;
 assert.deepEqual(middle.sameBipolarMiddle,["both-high","both-low","both-middle"]);
 assert.equal(middle.sameBipolarValue,4);
 const fixtures=middle.sameBipolarMiddle.map(id=>matrix.syntheticScenarios.find(x=>x.id===id));
 assert.ok(fixtures.every(x=>x.inputs.bipolar.answer===4));
 const pairs=fixtures.map(x=>JSON.stringify(x.inputs.independent));
 assert.equal(new Set(pairs).size,3);
 assert.equal(middle.crossModeNumericalConversion,"PROHIBITED");
 assert.equal(middle.empiricalComparabilityProven,false);
});
test("D85 preview and document preserve noindex, no-answer and non-production limits",()=>{
 const html=read("projects/kidp/life-design-lab/a05/b-preview.html");
 const js=read("projects/kidp/life-design-lab/a05/b-preview.mjs");
 const contract=read("projects/kidp/life-design-lab/a05/b-experiment.mjs");
 const cases=read("projects/kidp/life-design-lab/a05/b-preview-scenarios.mjs");
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(html,/id="scenario"/);
 assert.match(html,/id="bipolar-result"/);
 assert.match(html,/id="independent-result"/);
 assert.match(html,/合成例/);
 for(const forbidden of ["localStorage","sessionStorage","indexedDB","fetch(","XMLHttpRequest",
  "sendBeacon","navigator.serviceWorker","innerHTML","https://","http://"]){
  assert.equal([html,js,contract,cases].some(source=>source.includes(forbidden)),false,forbidden);
 }
 for(const key of ["studyAuthorized","mergeAuthorized","productionReleaseAuthorized","legacyScoringChanged",
                   "oldHistoryRescored","typeMappingApproved"])
  assert.equal(matrix.guards[key],false,key);
 assert.equal(matrix.guards.humanChoice,"PENDING");
 assert.equal(matrix.guards.participantsCollected,0);
 assert.equal(matrix.guards.scaleValidated,false);
 assert.equal(QUESTIONS.length,30);
 assert.equal(TYPES.length,16);
 const d82=JSON.parse(read("docs/A05_D82_V2_CONTRACT_BLUEPRINT_20261026.json"));
 assert.deepEqual(d82.versioning.legacyFrozen,{
  question:QUESTION_SET_VERSION,scoring:SCORING_VERSION,type:TYPE_VERSION,content:CONTENT_VERSION
 });
});
