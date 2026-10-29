import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
 B2_PROTOTYPE_VERSION, B2_PROTOTYPE_SCENARIOS, B2_PROTOTYPE_STATUSES,
 inspectSyntheticB2Fixture
} from "../projects/kidp/life-design-lab/a05/b2-prototype-contract.mjs";
const data=JSON.parse(readFileSync(new URL(
  "../docs/A05_S1_B2_ITEM_PROTOTYPES_V01_20261030.json",import.meta.url),"utf8"));
const answered=value=>({status:"answered",value});
const missed=status=>({status});
const result=(self,others,scenarioId="B2P01")=>
  inspectSyntheticB2Fixture({scenarioId,self,others});
test("S1 B2 editorial candidate is 6 contexts x 2 independent prompts, NOT a published questionnaire",()=>{
 assert.equal(data.scenarios.length,6);
 assert.equal(data.userApproval,"NOT_GRANTED_FOR_NEW_ITEMS");
 assert.equal(data.noActualParticipantData,true);
 assert.equal(data.noLegacyBConversion,true);
 assert.equal(data.noAutomaticTypeAssignment,true);
 assert.equal(data.noUserFacingRelease,true);
 assert.equal(data.notInCurrent30Questions,true);
 assert.deepEqual(data.scenarios.map(x=>x.id),B2_PROTOTYPE_SCENARIOS);
 assert.equal(new Set(data.scenarios.flatMap(x=>[x.self.itemId,x.others.itemId])).size,12);
 assert.deepEqual(B2_PROTOTYPE_STATUSES,
 ["answered","not_applicable","cannot_judge","prefer_not_to_answer","unanswered"]);
});
test("S1 B2 synthetic all-high/all-low/mixed remain distinguishable without type scores",()=>{
 for(const [a,b] of [[7,7],[1,1],[7,1],[1,7],[5,5],[4,4]]){
  const v=result(answered(a),answered(b));
  assert.equal(v.schema,B2_PROTOTYPE_VERSION);
  assert.equal(v.responseCompleteness,"two_answered");
  assert.equal(v.self.value,a);assert.equal(v.others.value,b);
  assert.equal(v.legacyBBinary,null);assert.equal(v.typeId,null);
  assert.equal(v.groupId,null);assert.equal(v.interpersonalCompatibility,null);
  assert.equal(v.productionApproved,false);
  assert.equal(v.measurementValidated,false);
  assert.equal(v.syntheticExampleOnly,true);
  assert.ok(Object.isFrozen(v));
  assert.ok(Object.isFrozen(v.self));assert.ok(Object.isFrozen(v.others));
 }
 assert.notDeepEqual(result(answered(7),answered(7)),result(answered(1),answered(1)));
});
test("S1 B2 omission causes distinct explicit missingness, never imputed midpoint",()=>{
 for(const status of B2_PROTOTYPE_STATUSES.filter(x=>x!=="answered")){
  const v=result(answered(4),missed(status));
  assert.equal(v.responseCompleteness,"partial");
  assert.equal(v.others.status,status);
  assert.equal(v.others.value,null);
  assert.equal(v.self.value,4);
  const both=result(missed(status),missed(status));
  assert.equal(both.responseCompleteness,"none_answered");
  assert.equal(both.self.value,null);
 }
});
test("S1 B2 rejects invalid values, extra fields, accidental legacy type inference",()=>{
 const invalid=[
  {scenarioId:"T01",self:answered(4),others:answered(5)},
  {scenarioId:"B2P01",self:answered(4),others:answered(5),typeId:"T01"},
  {scenarioId:"B2P01",self:answered(0),others:answered(5)},
  {scenarioId:"B2P01",self:answered(8),others:answered(5)},
  {scenarioId:"B2P01",self:answered(4.5),others:answered(5)},
  {scenarioId:"B2P01",self:answered(null),others:answered(5)},
  {scenarioId:"B2P01",self:{status:"not_applicable",value:4},others:answered(5)},
  {scenarioId:"B2P01",self:missed("not-a-status"),others:answered(5)}
 ];
 for(const input of invalid)assert.throws(()=>inspectSyntheticB2Fixture(input),TypeError);
});
