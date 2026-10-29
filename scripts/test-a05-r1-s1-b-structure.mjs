import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { experimentalB, isLegacyBCompatible, validateExperimentalB } from
  "../projects/kidp/life-design-lab/a05/b-experiment.mjs";
import { TYPE_STRUCTURE_MODES, structurePreview } from
  "../projects/kidp/life-design-lab/a05/type-structure-experiment.mjs";

const b85=JSON.parse(readFileSync(new URL(
  "../docs/A05_D85_B_MODE_COMPARISON_20261026.json",import.meta.url),"utf8"));
const d86=JSON.parse(readFileSync(new URL(
  "../docs/A05_D86_TYPE_STRUCTURE_DECISION_20261026.json",import.meta.url),"utf8"));

test("S1 B2 priority never silently resolves unapproved B classification",()=>{
  assert.equal(d86.decision.formalWinner,"PENDING");
  assert.equal(d86.decision.humanOwnerSignoff,"PENDING");
  assert.deepEqual(TYPE_STRUCTURE_MODES,["B1","B2","B3"]);
  assert.equal(isLegacyBCompatible(experimentalB({mode:"independent",self:7,others:7})),false);
});
test("S1 D85 eight fictional B cases are distinct input contracts",()=>{
  assert.equal(b85.syntheticScenarios.length,8);
  for(const caseRecord of b85.syntheticScenarios){
    assert.equal(caseRecord.fictional,true);
    const a=experimentalB(caseRecord.inputs.bipolar);
    const b=experimentalB(caseRecord.inputs.independent);
    assert.deepEqual(a,caseRecord.expected.bipolar);
    assert.deepEqual(b,caseRecord.expected.independent);
    assert.equal(isLegacyBCompatible(a),false);
    assert.equal(isLegacyBCompatible(b),false);
  }
  const bothHigh=experimentalB({mode:"independent",self:7,others:7});
  const bothLow=experimentalB({mode:"independent",self:1,others:1});
  assert.notDeepEqual(bothHigh, bothLow);
  assert.equal(experimentalB({mode:"bipolar",answer:4}).relativePosition,0);
  assert.equal(experimentalB({mode:"independent",self:7,others:null}).responseStatus,"partial");
  assert.throws(()=>validateExperimentalB({mode:"independent",self:7,others:7,legacyType:"T01"}),TypeError);
});
test("S1 all 8 fictional contexts and three structures withhold public classification",()=>{
  for(const record of b85.syntheticScenarios)for(const mode of TYPE_STRUCTURE_MODES){
    const context={
      bipolar:record.inputs.bipolar.answer,
      self:record.inputs.independent.self,
      others:record.inputs.independent.others
    };
    const result=structurePreview(mode,context);
    assert.equal(result.mode,mode);
    assert.equal(result.typeId,null);
    assert.equal(result.groupId,null);
    assert.equal(result.classificationStatus,"WITHHELD");
    assert.equal(result.measurementValidity,"UNVALIDATED");
    assert.equal(result.productionApproved,false);
    assert.equal(result.oldTypeCompatible,false);
    assert.equal(result.possibleConfigurations,mode==="B1"?16:8);
    assert.deepEqual(result.hypotheticalAxes,mode==="B1"?["A","B","C","D"]:["A","C","D"]);
    assert.deepEqual(result.separateBFields,mode==="B2"?["self","others"]:[]);
  }
});
test("S1 count scenarios are mathematical only, never inferred type count",()=>{
  assert.equal(2**4,16);assert.equal(16*17/2,136);
  assert.equal(2**5,32);assert.equal(32*33/2,528);
  assert.equal(2**3,8);assert.equal(8*9/2,36);
  const result=structurePreview("B2",{bipolar:4,self:7,others:7});
  assert.equal(result.possibleConfigurations,8);
  assert.equal(result.typeId,null);
  assert.equal(result.groupId,null);
  assert.equal(result.productionApproved,false);
});
