import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AXES, QUESTIONS, QUESTION_SET_VERSION } from '../projects/kidp/life-design-lab/a05/questions.mjs';
import { SCORING_VERSION, newDraft, makeSnapshot, classifySnapshot, scoreAssessment } from '../projects/kidp/life-design-lab/a05/engine.mjs';
import { TYPES, GROUPS } from '../projects/kidp/life-design-lab/a05/types.mjs';
import { REPORT_VERSION, renderReport } from '../projects/kidp/life-design-lab/a05/report.mjs';
import { MOTIFS, RGBY, resolveVisualDisplay } from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';
import { renderVisualPreview } from '../projects/kidp/life-design-lab/a05/visual-preview.mjs';

// v21 cross-branch compatibility smoke. This does not validate psychometrics.
const HASH='a'.repeat(64),IDS='ABCDE';
function answersFor(index,wealth='time'){
 const group=Math.floor(index/4),within=index%4;
 const signs=[group>=2?1:-1,group%2?1:-1,within>=2?1:-1,within%2?1:-1,wealth==='time'?1:wealth==='money'?-1:0];
 return Object.fromEntries(QUESTIONS.map(q=>{
  const sign=signs[IDS.indexOf(q.axis)];
  return [q.id,sign===0?4:4+3*sign*q.direction];
 }));
}
test('v2 scoring and report contracts coexist with 16 visual motifs',()=>{
 assert.equal(QUESTION_SET_VERSION,'A05-Q-2.0.0-draft');
 assert.equal(SCORING_VERSION,'A05-S-2.0.0-draft');
 assert.equal(REPORT_VERSION,'A05-REPORT-0.2.0-draft');
 assert.equal(QUESTIONS.length,30);
 assert.equal(AXES.length,5);
 assert.equal(TYPES.length,16);
 assert.equal(MOTIFS.length,16);
 assert.deepEqual(GROUPS.map(g=>g.letter),['B','G','R','Y']);
 assert.deepEqual(Object.keys(RGBY),['R','G','B','Y']);
});
test('all 16 v2 snapshots stay verifiable, reportable and distinct from motifs',()=>{
 for(let i=0;i<16;i++){
  const d=newDraft('integration-'+i,HASH);d.answers=answersFor(i);
  const snap=makeSnapshot(d,HASH,false);
  const id='T'+String(i+1).padStart(2,'0');
  assert.equal(snap.result.typeId,id);
  assert.equal(classifySnapshot(snap,HASH),'verified');
  assert.equal(snap.rawAnswers,undefined);
  assert.equal(snap.visualPreview,undefined);
  assert.throws(()=>resolveVisualDisplay({motif:id,accent:'R'}),TypeError);
  const html=renderReport(snap,{sample:true});
  assert.equal((html.match(/class="report-sheet"/g)||[]).length,10);
 }
});
test('older snapshot versions remain legacy, never silently migrated',()=>{
 const d=newDraft('integration-old',HASH);d.answers=answersFor(0);
 const old=JSON.parse(JSON.stringify(makeSnapshot(d,HASH,false)));
 old.versions.question='A05-Q-1.0.0-draft';
 old.versions.scoring='A05-S-1.0.0-draft';
 old.questionHash='f'.repeat(64);
 assert.equal(classifySnapshot(old,HASH),'legacy');
});
test('neutral answers do not imply an assigned symbol, accent or new type',()=>{
 const result=scoreAssessment(Object.fromEntries(QUESTIONS.map(q=>[q.id,4])));
 assert.equal(result.typeId,null);
 assert.equal(result.classification,'withheld');
 assert.equal(result.wealth,'neutral');
 assert.throws(()=>resolveVisualDisplay({motif:'T01',accent:'B'}),TypeError);
 assert.throws(()=>resolveVisualDisplay({motif:'world-tree',accent:'B',eAxis:'neutral'}),TypeError);
 assert.equal(resolveVisualDisplay({motif:'world-tree',accent:'B',eAxis:null}).eAxis,null);
});
test('128 display combinations are manual preview only',()=>{
 let n=0;
 for(const motif of MOTIFS)for(const accent of Object.keys(RGBY))for(const eAxis of ['money','time']){
  const html=renderVisualPreview({motif:motif.id,accent,eAxis,motion:false});
  assert.ok(html.includes('crests/'+motif.id+'.svg'));
  assert.ok(html.includes('--a05-vp-color:'+RGBY[accent]));
  assert.match(html,/診断判定とは未連動/);
  n++;
 }
 assert.equal(n,128);
});
test('legacy typeId is not wired into the visual preview renderer',()=>{
 const app=readFileSync(new URL('../projects/kidp/life-design-lab/a05/app.mjs',import.meta.url),'utf8');
 const preview=readFileSync(new URL('../projects/kidp/life-design-lab/a05/visual-preview.mjs',import.meta.url),'utf8');
 assert.match(app,/renderVisualPreview\(state\.visualPreview\)/);
 assert.doesNotMatch(preview,/\.typeId\b|scoreAssessment|makeSnapshot|finalizeDraft/);
});
