/**
 * A05 D-118: contract checks for fictional B/C comparison cases.
 * Standalone fixture test. Does not claim to validate mental constructs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data=JSON.parse(readFileSync(new URL('../research/a05/d118-bc-synthetic-counterexamples.json',import.meta.url),'utf8'));
const cases=data.cases;
const byId=id=>cases.find(c=>c.id===id);
const isAnswer=v=>v===null||(Number.isInteger(v)&&v>=1&&v<=7);
function expectedKeys(axis){
 return axis==='B'?['self','others']:['future','present'];
}
function independentTuple(c){
 const keys=expectedKeys(c.axis);
 return keys.map(k=>c.formats.independent[k]);
}

test('D118 manifest is research-only, complete, unique and fully fictional',()=>{
 assert.equal(data.schema,'A05-D118-BC-SYNTHETIC-COUNTEREXAMPLES-1.0.0');
 assert.equal(data.status,'RESEARCH_ONLY_SYNTHETIC_NOT_APPROVED');
 assert.equal(cases.length,20);
 assert.equal(new Set(cases.map(c=>c.id)).size,20);
 assert.equal(cases.filter(c=>c.axis==='B').length,8);
 assert.equal(cases.filter(c=>c.axis==='C').length,12);
 assert.ok(cases.every(c=>c.fictional && c.doNotConvertRelativeFromIndependent && c.doNotScoreAsExistingType));
});

test('D118 no B or C fixture implies type assignment or validated measurement',()=>{
 for(const c of cases){
  assert.equal(c.formats.withheld.typeId,null,c.id);
  assert.equal(c.formats.withheld.classificationStatus,'WITHHELD',c.id);
  assert.equal(c.formats.withheld.legacy16Compatible,false,c.id);
  assert.equal(c.formats.withheld.answeredByRealPerson,false,c.id);
  assert.equal(c.formats.withheld.notATraitPrediction,true,c.id);
  assert.equal(c.formats.relative.unvalidated,true,c.id);
  assert.equal(c.formats.independent.unvalidated,true,c.id);
 }
});

test('D118 all input values use explicit 1..7 or null, not zero or implicit missing',()=>{
 for(const c of cases){
  assert.ok(isAnswer(c.formats.relative.value),c.id);
  const x=c.formats.independent;
  assert.ok(independentTuple(c).every(isAnswer),c.id);
  if(independentTuple(c).some(v=>v===null))assert.ok(x.missingReason,c.id);
  if(c.formats.relative.value===null)assert.ok(c.risk,c.id);
 }
});

test('D118 B1 midpoint collapses three distinct independent B2 states',()=>{
 const three=['B-HH','B-LL','B-MM'].map(byId);
 assert.ok(three.every(c=>c.formats.relative.value===4));
 assert.deepEqual(three.map(independentTuple),[[7,7],[1,1],[4,4]]);
 assert.equal(new Set(three.map(c=>independentTuple(c).join(':'))).size,3);
});

test('D118 C1 midpoint collapses three distinct independent C2 states',()=>{
 const three=['C-HH','C-LL','C-MM'].map(byId);
 assert.ok(three.every(c=>c.formats.relative.value===4));
 assert.deepEqual(three.map(independentTuple),[[7,7],[1,1],[4,4]]);
 assert.equal(new Set(three.map(c=>independentTuple(c).join(':'))).size,3);
});

test('D118 context shifts cannot be presented as stable B/C type traits',()=>{
 for(const [left,right] of [['B-CONTEXT-1','B-CONTEXT-2'],['C-HORIZON-1','C-HORIZON-2']]){
  const a=byId(left),b=byId(right);
  assert.equal(a.hypotheticalContextPair,b.id);
  assert.equal(b.hypotheticalContextPair,a.id);
  assert.equal(a.axis,b.axis);
  assert.ok(a.context!==b.context);
  assert.ok(a.formats.relative.value<4 && b.formats.relative.value>4,'reversal '+left);
  assert.equal(a.formats.withheld.typeId,null);
  assert.equal(b.formats.withheld.typeId,null);
 }
});

test('D118 incomplete/NA values stay missing, not 4 or low',()=>{
 for(const id of ['B-ONE-NA','B-PARTIAL','C-PARTIAL','C-NA']){
  const c=byId(id);
  assert.equal(c.formats.relative.value,null,id);
  assert.ok(independentTuple(c).some(x=>x===null));
  assert.ok(['not_applicable','cannot_judge'].includes(c.formats.independent.missingReason));
  assert.notDeepEqual(independentTuple(c),new Array(2).fill(4));
 }
});

test('D118 simultaneous high valuations and contingent tradeoffs are distinct',()=>{
 const b=byId('B-HH-TILT'),c=byId('C-HH-TILT');
 assert.equal(b.formats.relative.value,3);
 assert.equal(c.formats.relative.value,3);
 assert.deepEqual(independentTuple(b),[7,6]);
 assert.deepEqual(independentTuple(c),[7,6]);
 assert.ok(['C-UNCERTAINTY','C-COST'].every(id=>independentTuple(byId(id)).join(':')==='7:7'));
});

test('D118 structures remain unapproved research options, not numeric cross-mode conversions',()=>{
 assert.ok(data.interpretationRules.some(s=>s.includes('not a valid conversion')));
 assert.ok(data.interpretationRules.some(s=>s.includes('B3/C3')));
 assert.equal(data.acceptanceGates.release,'NO_GO');
 assert.equal(data.linkedPriorSources.length,4);
});
