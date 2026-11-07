/** A05 beta-release contract: 30-question engine -> immutable result snapshot -> 10-page report. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { QUESTIONS } from '../projects/kidp/life-design-lab/a05/questions.mjs';
import { TYPES } from '../projects/kidp/life-design-lab/a05/types.mjs';
import { newDraft, scoreAssessment, makeSnapshot } from '../projects/kidp/life-design-lab/a05/engine.mjs';
import { buildReport, renderReport } from '../projects/kidp/life-design-lab/a05/report.mjs';

const ROOT = new URL('../projects/kidp/life-design-lab/a05/', import.meta.url);
const hash = 'a'.repeat(64);
function sample(index, wealth = 'time') {
  const group = Math.floor(index / 4), within = index % 4;
  const signs = [group >= 2 ? 1 : -1, group % 2 ? 1 : -1,
    within >= 2 ? 1 : -1, within % 2 ? 1 : -1, wealth === 'time' ? 1 : -1];
  const draft = newDraft('synthetic-' + index + '-' + wealth, hash);
  draft.answers = Object.fromEntries(QUESTIONS.map(q => [
    q.id, 4 + 3 * signs['ABCDE'.indexOf(q.axis)] * q.direction
  ]));
  return draft;
}

test('all 32 base-type x money/time combinations flow through the original 30Q engine', () => {
  assert.equal(QUESTIONS.length, 30);
  for (let i = 0; i < 16; i++) {
    for (const wealth of ['money', 'time']) {
      const draft = sample(i, wealth);
      const pre = JSON.stringify(draft);
      const calculated = scoreAssessment(draft.answers);
      const snapshot = makeSnapshot(draft, hash, false);
      const report = buildReport(snapshot);
      const html = renderReport(snapshot);
      assert.equal(calculated.typeId, TYPES[i].id);
      assert.equal(snapshot.result.typeId, TYPES[i].id);
      assert.equal(snapshot.result.classification, 'classified');
      assert.equal(snapshot.result.wealth, wealth);
      assert.equal(report.pages.length, 10);
      assert.equal((html.match(/class="report-sheet"/g) ?? []).length, 10);
      assert.equal((html.match(/href="#a05-report-p\d+"/g) ?? []).length, 10);
      assert.ok(html.includes(TYPES[i].name));
      assert.ok(!html.includes(draft.assessmentId));
      assert.equal(JSON.stringify(draft), pre, 'report must not mutate source draft');
      assert.equal(snapshot.rawAnswers, undefined);
    }
  }
});

test('withheld dimensions never force a fabricated type or incomplete numerical conclusion', () => {
  const draft = sample(10);
  for (const q of QUESTIONS.filter(q => q.axis === 'A')) draft.answers[q.id] = null;
  const snapshot = makeSnapshot(draft, hash, false);
  assert.equal(snapshot.result.typeId, null);
  assert.equal(snapshot.result.classification, 'withheld');
  const report = buildReport(snapshot);
  assert.equal(report.pages.length, 10);
  assert.ok(renderReport(snapshot).includes('判定保留'));
});

test('beta entrypoint remains unindexed, warns that the scale is unvalidated and preserves user-initiated print', () => {
  const html = readFileSync(new URL('index.html', ROOT), 'utf8');
  const app = readFileSync(new URL('app.mjs', ROOT), 'utf8');
  const report = readFileSync(new URL('report.mjs', ROOT), 'utf8');
  const css = readFileSync(new URL('report.css', ROOT), 'utf8');
  assert.match(html, /name="robots" content="noindex,nofollow"/);
  assert.match(html, /report\.css/);
  assert.match(app, /data-view="report"/);
  assert.match(app, /renderReport\(snapshot/);
  assert.match(app, /button\.dataset\.action === "print-report"/);
  assert.match(report, /非標準化/);
  assert.match(css, /@page\{size:A4;margin:0\}/);
  assert.doesNotMatch(report, /\bfetch\s*\(|sendBeacon|XMLHttpRequest|localStorage|indexedDB/);
});


test('1500 seeded mixed answers never invent a type or leak answers into report HTML',()=>{
 let seed=0x120526;
 const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const counts={classified:0,provisional:0,withheld:0};
 for(let k=0;k<1500;k++){
  const draft=newDraft('QA-SYNTH-'+k,hash);
  draft.answers=Object.fromEntries(QUESTIONS.map(q=>{
   const r=rand();
   return [q.id,r<0.13?null:1+Math.floor(rand()*7)];
  }));
  const before=JSON.stringify(draft);
  const snapshot=makeSnapshot(draft,hash,false);
  const report=buildReport(snapshot),html=renderReport(snapshot);
  assert.equal(report.pages.length,10);
  assert.equal((html.match(/class="report-sheet"/g)||[]).length,10);
  assert.equal((html.match(/href="#a05-report-p\d+"/g)||[]).length,10);
  assert.doesNotMatch(html,/QA-SYNTH-|rawAnswers|assessmentId|questionHash/);
  assert.match(html,/非標準化/);
  assert.equal(JSON.stringify(draft),before);
  assert.equal(report.axes.length,5);
  for(const axis of report.axes){
   assert.ok(axis.value===null||(Number.isFinite(axis.value)&&Math.abs(axis.value)<=100));
  }
  const type=snapshot.result.typeId;
  if(snapshot.result.classification==='withheld')assert.equal(type,null);
  else assert.ok(TYPES.some(t=>t.id===type));
  counts[snapshot.result.classification]++;
 }
 assert.ok(counts.classified>0);
 assert.ok(counts.provisional>0);
 assert.ok(counts.withheld>0);
});


test('beta-only .htaccess restricts browser resources and serves ES modules correctly',()=>{
 const html=readFileSync(new URL('index.html',ROOT),'utf8');
 const headers=readFileSync(new URL('.htaccess',ROOT),'utf8');
 assert.match(html,/http-equiv="Content-Security-Policy"/);
 for(const directive of ["default-src 'none'","script-src 'self'","connect-src 'none'","object-src 'none'","form-action 'none'"]){
  assert.ok(html.includes(directive), 'meta CSP missing '+directive);
  assert.ok(headers.includes(directive), 'header CSP missing '+directive);
 }
 assert.match(headers,/AddType text\/javascript \.mjs/);
 assert.match(headers,/Header always set X-Content-Type-Options "nosniff"/);
 assert.match(headers,/Header always set X-Robots-Tag "noindex, nofollow"/);
 assert.match(headers,/Header always set X-Frame-Options "DENY"/);
 assert.match(headers,/Header always set Referrer-Policy "no-referrer"/);
 assert.match(headers,/Header always set Cache-Control "no-store"/);
 assert.doesNotMatch(headers,/RewriteRule|Redirect|Options\s+-Indexes/);
});
