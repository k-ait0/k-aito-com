import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS, QUESTION_SET_VERSION, questionSetHash, AXES } from '../projects/kidp/life-design-lab/a05/questions.mjs';
import { resolveAxis, scoreAssessment, newDraft, makeSnapshot, classifySnapshot, SCORING_VERSION } from '../projects/kidp/life-design-lab/a05/engine.mjs';
import { buildReport, renderReport, REPORT_VERSION } from '../projects/kidp/life-design-lab/a05/report.mjs';

const sha = await questionSetHash();
const full = Object.fromEntries(QUESTIONS.map(q => [q.id, 4]));
function draftFor(id, answers) {
 const draft = newDraft(id, sha);
 draft.answers = {...answers};
 return draft;
}
test('v2 manifest: five axes, 30 unique questions, fixed left/right polarity and versions', () => {
 assert.equal(QUESTION_SET_VERSION, 'A05-Q-2.0.0-draft');
 assert.equal(SCORING_VERSION, 'A05-S-2.0.0-draft');
 assert.equal(REPORT_VERSION, 'A05-REPORT-0.2.0-draft');
 assert.match(sha, /^[a-f0-9]{64}$/);
 assert.equal(QUESTIONS.length, 30);
 assert.equal(new Set(QUESTIONS.map(q => q.id)).size, 30);
 for (const axis of AXES) assert.equal(QUESTIONS.filter(q => q.axis===axis.id).length, 6);
 assert.ok(QUESTIONS.every(q => q.direction === 1));
 assert.ok(QUESTIONS.every(q => typeof q.left === 'string' && typeof q.right === 'string' && q.left!==q.right));
 const e05=QUESTIONS.find(q=>q.id==='E05');
 assert.doesNotMatch(e05.left+e05.right,/3万円|週3時間/);
});
test('33.3 percent threshold: exact and adjacent integer sums', () => {
 for(const [sum,status] of [[-7,'classified'],[-6,'provisional'],[-4,'provisional'],[0,'withheld'],[4,'provisional'],[6,'provisional'],[7,'classified']]){
  assert.equal(resolveAxis(6,sum).status,status,'sum='+sum);
 }
 assert.equal(resolveAxis(5,5).status,'provisional');
 assert.equal(resolveAxis(3,9).status,'withheld');
});
test('same axis structure and snapshot fields; no implicit storage migration', () => {
 const draft=draftFor('v2-shape',Object.fromEntries(QUESTIONS.map(q=>[q.id,7])));
 const snapshot=makeSnapshot(draft,sha,false);
 assert.equal(snapshot.schemaVersion,1);
 assert.equal(snapshot.rawAnswers,undefined);
 for(const axis of snapshot.result.axes)
  assert.deepEqual(Object.keys(axis),['id','n','sum','value','direction','status']);
 assert.equal(classifySnapshot(snapshot,sha),'verified');
 const old=structuredClone(snapshot);
 old.versions.question='A05-Q-1.0.0-draft';
 old.versions.scoring='A05-S-1.0.0-draft';
 old.questionHash='f'.repeat(64);
 assert.equal(classifySnapshot(old,sha),'legacy');
 assert.deepEqual(snapshot.result,makeSnapshot(draft,sha,false).result,'no hidden rescore');
});
test('neutral average is not asserted to be conflict or strong preference',()=>{
 const a={...full};
 for(const q of QUESTIONS.filter(q=>q.axis==='A').slice(0,3)) a[q.id]=7;
 for(const q of QUESTIONS.filter(q=>q.axis==='A').slice(3)) a[q.id]=1;
 const snap=makeSnapshot(draftFor('v2-mixed-extremes',a),sha,false);
 const h=renderReport(snap);
 assert.equal(snap.result.axes[0].sum,0);
 assert.equal(snap.result.axes[0].status,'withheld');
 assert.match(h,/中立・葛藤などの理由は数値だけでは判断できません/);
 assert.doesNotMatch(h,/強いストレスを感じる|譲れない核/);
});
test('page 7/8/9 choose data-grounded axis names, preserve A4 ten pages',()=>{
 const values={A:[7,7,7,7,7,7],B:[6,6,6,6,6,6],C:[6,6,5,5,5,4],D:[5,5,5,4,4,4],E:[4,4,4,4,4,4]};
 const a=Object.fromEntries(QUESTIONS.map(q=>[q.id,values[q.axis][Number(q.id.slice(1))-1]]));
 const snap=makeSnapshot(draftFor('v2-personalized',a),sha,false);
 const rep=buildReport(snap), html=renderReport(snap);
 assert.equal(rep.pages.length,10);
 assert.equal((html.match(/class="report-sheet"/g)||[]).length,10);
 assert.equal((html.match(/href="#a05-report-p\d+"/g)||[]).length,10);
 assert.match(rep.pages[6],/E · 豊かさ/);
 assert.match(rep.pages[6],/D · 経験/);
 assert.match(rep.pages[7],/A · 環境/);
 assert.match(rep.pages[7],/B · 関係/);
 assert.match(rep.pages[8],/WEEK 01/);
 assert.match(rep.pages[8],/A · 環境/);
 assert.match(rep.pages[8],/E · 豊かさ/);
});
test('unanswered/withheld axes do not cause invented priorities',()=>{
 const draft=draftFor('v2-all-skipped',Object.fromEntries(QUESTIONS.map(q=>[q.id,null])));
 const snap=makeSnapshot(draft,sha,false);
 assert.equal(snap.result.classification,'withheld');
 assert.equal(buildReport(snap).pages.length,10);
 const pages=buildReport(snap).pages;
 assert.doesNotMatch(pages[7],/今回の回答で相対的に方向が表れた軸/);
 assert.match(pages[8],/最近大切にしたいと感じた条件/);
});
test('untrusted snapshot labels escaped and raw answer keys not included',()=>{
 const snap=makeSnapshot(draftFor('v2-escaped',Object.fromEntries(QUESTIONS.map(q=>[q.id,7]))),sha,true);
 snap.presentation.name='<script>alert(1)</script>';
 const html=renderReport(snap);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/rawAnswers|assessmentId|questionHash|v2-escaped/);
});
