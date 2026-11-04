/**
 * A05 Phase 1: all 16 + 136 six-section simplified reports, local-only QA.
 * Usage: node --test scripts/test-a05-phase1-short-reports-20261104.mjs
 * Does not validate psychology, human review or editorial quality.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const file = path => readFileSync(new URL(path,root),'utf8');
const self = JSON.parse(file('docs/A05_PHASE1_SELF16_SHORT_REPORTS_20261104.json'));
const pair = JSON.parse(file('docs/A05_PHASE1_PAIR136_SHORT_REPORTS_20261104.json'));
const html = file('projects/kidp/life-design-lab/a05/phase1-short-report-preview-20261104.html');
const digits = i => 'T' + String(i).padStart(2,'0');
const pairId = (i,j) => digits(i)+'-'+digits(j);
const counts = str => [...str].length;
const sameIds = (list, expected) => {
 assert.equal(list.length,expected.length);
 assert.equal(new Set(list).size,expected.length);
 assert.deepEqual([...list].sort(),[...expected].sort());
};
const axis = id => {
 const i = Number(id.slice(1))-1,g=Math.floor(i/4),w=i%4;
 return {A:g>=2?'変化寄り':'安定寄り',
 B:g%2?'つながり寄り':'自律寄り',
 C:w>=2?'現在寄り':'将来寄り',
 D:w%2?'深耕寄り':'探索寄り'};
};
test('16 self-reflection reports have required chapters and safe status',()=>{
 assert.equal(self.reports.length,16);
 sameIds(self.reports.map(x=>x.typeId),Array.from({length:16},(_,i)=>digits(i+1)));
 for (const s of self.reports) {
  assert.equal(s.sections.length,6);
  assert.deepEqual(s.sections.map(x=>x.id),['living','axes','choices','dilemmas','relationships','actions']);
  assert.equal(s.sections[1].items.length,4);
  assert.equal(s.sections[5].questions.length,3);
  assert.ok(counts(s.sections.map(x=>x.body||'').join('')+s.sections[1].items.map(x=>x.text).join('')+s.sections[5].questions.join(''))>=420);
  assert.ok(!s.scientificValidated&&!s.humanReviewed&&!s.independentReviewed&&!s.ownerApprovedForPublication&&!s.production);
  const signs=axis(s.typeId);
  for(const item of s.sections[1].items)assert.equal(item.orientation,signs[item.axis],s.typeId+' '+item.axis);
 }
});

test('all unordered 136 pairings including 16 same-type comparisons are covered',()=>{
 assert.equal(pair.reports.length,136);
 const expected=[];
 for(let i=1;i<=16;i++)for(let j=i;j<=16;j++)expected.push(pairId(i,j));
 sameIds(pair.reports.map(x=>x.pairId),expected);
 assert.equal(pair.reports.filter(x=>x.sameType).length,16);
 assert.equal(pair.reports.filter(x=>x.structuralDifferentAxisCount===4).length,8);
});
test('136 pair reports have six chapters, three unique prompts, exact 4-axis alignment',()=>{
 const typeMap=new Map(self.reports.map(x=>[x.typeId,x]));
 const allPrompts=[];
 const scenes=[];
 const intros=[];
 for(const p of pair.reports){
  assert.equal(p.sections.length,6,p.pairId);
  assert.deepEqual(p.sections.map(x=>x.id),['shared','different','scenario','dilemma','questions','usage']);
  assert.equal(p.sections[4].questions.length,3);
  assert.equal(new Set(p.sections[4].questions).size,3);
  allPrompts.push(...p.sections[4].questions);
  scenes.push(p.sections[2].body);
  intros.push(p.sections[0].body);
  assert.equal(p.axisComparison.length,4);
  assert.equal(p.typeIds.length,2);
  assert.deepEqual(p.typeNames,p.typeIds.map(id=>typeMap.get(id).name));
  const signs=p.typeIds.map(axis);
  for(const x of p.axisComparison){
   assert.equal(x.first,signs[0][x.axis]);
   assert.equal(x.second,signs[1][x.axis]);
   assert.equal(x.relation,x.first===x.second?'shared':'different');
  }
  assert.equal(p.structuralDifferentAxisCount,p.axisComparison.filter(x=>x.relation==='different').length);
  assert.equal(p.structuralSharedAxisCount,4-p.structuralDifferentAxisCount);
  assert.ok(p.sections.reduce((n,s)=>n+counts(s.body||'')+counts((s.questions||[]).join('')),0)>=600,p.pairId);
  assert.equal(p.production,false);
  assert.equal(p.humanReviewed,false);
  assert.equal(p.independentReviewed,false);
  assert.equal(p.ownerApprovedForPublication,false);
  assert.equal(p.scientificValidated,false);
 }
 assert.equal(new Set(allPrompts).size,408);
 assert.equal(new Set(scenes).size,136);
 assert.equal(new Set(intros).size,136);
});
test('preview embeds exact drafts offline without network or local answer storage',()=>{
 const begSelf='const SELF=',sep=';\nconst PAIRS=',end=';\nconst ids=';
 const s=html.indexOf(begSelf),t=html.indexOf(sep,s),e=html.indexOf(end,t);
 assert.ok(s>=0&&t>s&&e>t);
 assert.deepEqual(JSON.parse(html.slice(s+begSelf.length,t)),self.reports);
 assert.deepEqual(JSON.parse(html.slice(t+sep.length,e)),pair.reports);
 assert.ok(html.includes('noindex,nofollow,noarchive'));
 assert.ok(html.includes('connect-src \'none\''));
 assert.ok(html.includes('[hidden]{display:none!important}'));
 assert.doesNotMatch(html,/fetch\(|XMLHttpRequest|localStorage|indexedDB|sendBeacon|https?:\/\//);
});
