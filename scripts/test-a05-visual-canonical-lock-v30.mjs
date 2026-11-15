/**
 * A05 v30 canonical selection lock.
 * Source: user-approved A05_16寓意_採用16種_v13.xlsx (2026-11-10).
 * This checks motif identity and display separation, NOT psychometric validity or art approval.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOTIFS, RGBY, resolveVisualDisplay } from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';
import { renderVisualCard } from '../projects/kidp/life-design-lab/a05/visual-preview.mjs';

const lock = JSON.parse(readFileSync(new URL('../docs/A05_VISUAL_CANONICAL_MOTIFS_V30.json', import.meta.url), 'utf8'));
const approvedSelection = [
 ['SA-11','polaris','北極星','安定×自律'],
 ['SA-10','sacred-peak','霊峰','安定×自律'],
 ['SA-01','harbor','港','安定×自律'],
 ['SA-00','moon','月','安定×自律'],
 ['SC-11','world-tree','世界樹','安定×つながり'],
 ['SC-10','ocean','大海','安定×つながり'],
 ['SC-01','rainbow','虹','安定×つながり'],
 ['SC-00','constellation','星座','安定×つながり'],
 ['CA-11','pegasus','ペガサス','変化×自律'],
 ['CA-10','phoenix','フェニックス','変化×自律'],
 ['CA-01','nine-tailed-fox','九尾狐','変化×自律'],
 ['CA-00','cat-sith','ケット・シー','変化×自律'],
 ['CC-11','twin-dragons','双龍','変化×つながり'],
 ['CC-10','crow-tengu','鴉天狗','変化×つながり'],
 ['CC-01','whale-pod','鯨の群れ','変化×つながり'],
 ['CC-00','carbuncle','カーバンクル','変化×つながり']
];

test('v30: immutable 2026-11-10 selection matches JSON mirror and runtime IDs', () => {
 assert.equal(lock.schema, 'a05.canonical-motif-lock.v30');
 assert.equal(approvedSelection.length, 16);
 assert.deepEqual(lock.motifs.map(m => [m.slot,m.id,m.name,m.group]), approvedSelection);
 assert.deepEqual(MOTIFS.map(m => [m.slot,m.id,m.name,m.group]), approvedSelection);
 assert.equal(new Set(MOTIFS.map(m => m.id)).size,16);
 assert.equal(new Set(MOTIFS.map(m => m.name)).size,16);
});

test('v30: names from rejected generative posters cannot become runtime motifs', () => {
 for (const unauthorized of [
  'ユニコーン','フェンリル','ケルベロス','白狼','ゴーレム',
  'シルフ','リヴァイアサン','大天使','ガルーダ','スフィンクス','賢者の書'
 ]) {
  assert.ok(!MOTIFS.some(m => m.name === unauthorized), unauthorized);
  assert.throws(() => resolveVisualDisplay({ motif: unauthorized, accent:'R' }), TypeError);
 }
});

test('v30: each motif retains four RGBY UI accents and both E directions (128), without a fixed motif color', () => {
 assert.deepEqual(Object.keys(RGBY).sort(), ['B','G','R','Y']);
 assert.equal(lock.displayContract.rgbYScoreMapping,'unapproved');
 assert.equal(lock.displayContract.typeScoreMapping,'unapproved');
 assert.equal(lock.displayContract.originalArtMustContainUI,false);
 let count=0;
 for (const motif of MOTIFS) {
  assert.equal(Object.hasOwn(motif,'accent'),false);
  assert.equal(Object.hasOwn(motif,'color'),false);
  for (const accent of ['R','G','B','Y']) {
   for (const eAxis of ['money','time']) {
    const value=resolveVisualDisplay({motif:motif.id,accent,eAxis,motion:false});
    const html=renderVisualCard({motif:motif.id,accent,eAxis,motion:false});
    assert.equal(value.id,motif.id);
    assert.equal(value.hex,RGBY[accent]);
    assert.equal(value.assetStatus,'unapproved-concept');
    assert.ok(html.includes('crests/'+motif.id+'.svg'));
    assert.ok(html.includes('--a05-vp-color:'+RGBY[accent]));
    count++;
   }
  }
 }
 assert.equal(count,128);
});

test('v30: prototype assets cannot be counted as final art or a release', () => {
 assert.equal(lock.productionState.tier2ApprovedCount,0);
 assert.deepEqual(lock.productionState.tier2ProductionAssetPaths,[]);
 assert.equal(lock.productionState.publicReleaseApproved,false);
 assert.match(lock.productionState.tier1, /drafts/);
});
