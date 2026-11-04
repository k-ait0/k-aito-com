/**
 * A05 diagnostic core: property and corruption regression tests.
 * Local-only; do not enable GitHub Actions.
 * node --test scripts/test-a05-diagnostic-core-virtual-20261104.mjs
 * Passing these tests does not validate the scientific construct.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AXES, QUESTIONS } from '../projects/kidp/life-design-lab/a05/questions.mjs';
import { TYPES } from '../projects/kidp/life-design-lab/a05/types.mjs';
import {
 validateQuestions, validateAnswers, resolveAxis, scoreAssessment,
 newDraft, verifyDraft, makeSnapshot, classifySnapshot
} from '../projects/kidp/life-design-lab/a05/engine.mjs';

const sha='f'.repeat(64);
function answersFor(index, fifth='money') {
 const direction=[index>=8?1:-1,Math.floor(index/4)%2?1:-1,index%4>=2?1:-1,index%2?1:-1];
 const answer={};
 for(const q of QUESTIONS) {
  const i='ABCDE'.indexOf(q.axis);
  const desired=i===4?(fifth==='time'?1:-1):direction[i];
  answer[q.id]=(desired*q.direction===1)?7:1;
 }
 return answer;
}
test('30 questions, 16 provisional type labels, 5 axes',()=>{
 validateQuestions();
 assert.equal(QUESTIONS.length,30);
 assert.equal(TYPES.length,16);
 assert.deepEqual(AXES.map(x=>x.id),['A','B','C','D','E']);
});
test('16x2 scenarios: all types classify and E money/time does not change type',()=>{
 for(let i=0;i<16;i++){
  const expected='T'+String(i+1).padStart(2,'0');
  const a=scoreAssessment(answersFor(i,'money'));
  const b=scoreAssessment(answersFor(i,'time'));
  assert.equal(a.typeId,expected);
  assert.equal(b.typeId,expected);
  assert.equal(a.classification,'classified');
  assert.equal(b.classification,'classified');
  assert.equal(a.wealth,'money');
  assert.equal(b.wealth,'time');
  assert.deepEqual(a.axes.slice(0,4),b.axes.slice(0,4));
 }
});
test('0/8/string/unknown answers reject; absent/null/neutral handled as withheld',()=>{
 assert.throws(()=>validateAnswers({A01:0}));
 assert.throws(()=>validateAnswers({A01:8}));
 assert.throws(()=>validateAnswers({A01:'4'}));
 assert.throws(()=>validateAnswers({Z99:4}));
 const empty=scoreAssessment({});
 assert.equal(empty.typeId,null);
 assert.equal(empty.classification,'withheld');
 assert.equal(empty.wealth,'withheld');
 const skipped=scoreAssessment(Object.fromEntries(QUESTIONS.map(q=>[q.id,null])));
 assert.equal(skipped.typeId,null);
 const neutral=scoreAssessment(Object.fromEntries(QUESTIONS.map(q=>[q.id,4])));
 assert.equal(neutral.typeId,null);
 assert.equal(neutral.wealth,'neutral');
});
test('precise integer threshold and missing-answer status',()=>{
 assert.equal(resolveAxis(6,3).status,'provisional');
 assert.equal(resolveAxis(6,4).status,'classified');
 assert.equal(resolveAxis(3,9).status,'withheld');
 assert.throws(()=>resolveAxis(7,0));
 assert.throws(()=>resolveAxis(6,19));
});
test('draft/snapshot consistent, tampering quarantined, old version remains legacy',()=>{
 const d=newDraft('test-candidate',sha);
 for(const q of QUESTIONS)d.answers[q.id]=4;
 assert.equal(verifyDraft(d,sha),true);
 const noRaw=makeSnapshot(d,sha,false),withRaw=makeSnapshot(d,sha,true);
 assert.equal(classifySnapshot(noRaw,sha),'verified');
 assert.equal(classifySnapshot(withRaw,sha),'verified');
 assert.equal(Object.hasOwn(noRaw,'rawAnswers'),false);
 assert.equal(Object.hasOwn(withRaw,'rawAnswers'),true);
 const modified={...noRaw,result:{...noRaw.result,wealth:'time'}};
 assert.equal(classifySnapshot(modified,sha),'quarantined');
 const old={...noRaw,versions:{...noRaw.versions,content:'historical-version'}};
 assert.equal(classifySnapshot(old,sha),'legacy');
});
