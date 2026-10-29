import test from "node:test";
import assert from "node:assert/strict";
import { TYPES } from "../projects/kidp/life-design-lab/a05/types.mjs";
import { getCompatibilityPair } from "../projects/kidp/life-design-lab/a05/compatibility.mjs";
import { compareManualCharacterPair, R1_MANUAL_PAIR_CONTRACT_VERSION } from
  "../projects/kidp/life-design-lab/a05/r1-manual-pair-contract.mjs";

test("R1 manual-only adapter covers all 256 ordered selections and 136 unordered pairs",()=>{
  let total=0;
  const pairIds=new Set();
  for(const a of TYPES) for(const b of TYPES) {
    const r=compareManualCharacterPair({leftTypeId:a.id,rightTypeId:b.id});
    const original=getCompatibilityPair(a.id,b.id);
    assert.equal(r.version,R1_MANUAL_PAIR_CONTRACT_VERSION);
    assert.equal(r.mode,"TWO_DRAFT_CHARACTERS_SELECTED_MANUALLY");
    assert.equal(r.pairId,original.id);
    assert.equal(r.selectedTypes[0].id,a.id);
    assert.equal(r.selectedTypes[1].id,b.id);
    assert.equal(r.sameType,a.id===b.id);
    assert.equal(r.structure.sharedAxisCount+r.structure.differentAxisCount,4);
    assert.equal(r.shared.length+r.differences.length,4);
    assert.equal(r.shared.every(x=>x.axis!=="E"),true);
    assert.equal(r.differences.every(x=>x.axis!=="E"),true);
    assert.equal(r.personalAssessmentPerformed,false);
    assert.equal(r.inferredPersonalTypeId,null);
    assert.equal(r.compatibilityScore,null);
    assert.equal(r.compatibilityRank,null);
    assert.equal(r.successPrediction,null);
    assert.equal(r.researchValidated,false);
    assert.equal(r.publicationApproved,false);
    assert.equal(r.structure.isRelationshipQualityMeasure,false);
    assert.ok(Object.isFrozen(r));
    assert.ok(Object.isFrozen(r.shared));
    assert.ok(Object.isFrozen(r.differences));
    pairIds.add(r.pairId);
    total++;
  }
  assert.equal(total,256);
  assert.equal(pairIds.size,136);
});
test("R1 all sixteen same-type selections mean draft structure, not positive match",()=>{
  for(const item of TYPES){
    const r=compareManualCharacterPair({leftTypeId:item.id,rightTypeId:item.id});
    assert.equal(r.sameType,true);
    assert.equal(r.structure.sharedAxisCount,4);
    assert.equal(r.structure.differentAxisCount,0);
    assert.equal(r.compatibilityScore,null);
    assert.equal(r.successPrediction,null);
    assert.match(r.disclaimer,/相性/);
  }
});
test("R1 selection order is symmetric but displayed left/right semantics follow selection",()=>{
  for(const a of TYPES) for(const b of TYPES) {
    const ab=compareManualCharacterPair({leftTypeId:a.id,rightTypeId:b.id});
    const ba=compareManualCharacterPair({leftTypeId:b.id,rightTypeId:a.id});
    assert.equal(ab.pairId,ba.pairId);
    assert.deepEqual(ab.shared,ba.shared);
    assert.deepEqual(ab.differences.map(d=>[d.axis,d.left,d.right]),
      ba.differences.map(d=>[d.axis,d.right,d.left]));
    assert.deepEqual(ab.selectedTypes.map(x=>x.id),[a.id,b.id]);
  }
});
test("R1 rejects participant answers, non-type codes, extra attributes, and prototype B2",()=>{
  const invalid=[
    null,[],{}, {leftTypeId:"T01"},{leftTypeId:"T01",rightTypeId:1},
    {leftTypeId:"T17",rightTypeId:"T01"},
    {leftTypeId:"T01",rightTypeId:"T02",score:12},
    {leftTypeId:"T01",rightTypeId:"T02",answers:{}},
    {leftTypeId:"T01",rightTypeId:"T02",assessmentResult:"T03"},
    {leftTypeId:"T01",rightTypeId:"T02",relation:"marriage"},
    {leftTypeId:"T01",rightTypeId:"T02",b2:{self:7,others:7}},
    {leftTypeId:"T01",rightTypeId:"T02",userName:"Person"}
  ];
  for(const input of invalid) assert.throws(()=>compareManualCharacterPair(input),TypeError);
});
