/** A05 v37: Tier2 art review uses approved motif IDs and remains an opt-in preview. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOTIFS, RGBY } from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';
import {
 renderTier2Review, validateTier2ReviewImageSrc, TIER2_REVIEW_MOTIFS
} from '../projects/kidp/life-design-lab/a05/tier2-review.mjs';

const assetRoot = new URL('../projects/kidp/life-design-lab/a05/',import.meta.url);
const sampleData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

test('v37: the four art-review motifs are exactly the agreed 4 works', () => {
 assert.deepEqual(TIER2_REVIEW_MOTIFS, ['world-tree','pegasus','crow-tengu','carbuncle']);
 for (const id of TIER2_REVIEW_MOTIFS) assert.ok(MOTIFS.find(m => m.id === id));
 assert.throws(() => renderTier2Review({motif:'unicorn'}),TypeError);
 assert.throws(() => renderTier2Review({motif:'T01'}),TypeError);
});
test('v37: missing art falls back to a named Tier1 crest, explicitly not approved', () => {
 const html=renderTier2Review();
 assert.match(html,/data-a05-tier2-review="opt-in"/);
 assert.match(html,/世界樹/);
 assert.match(html,/crests\/world-tree\.svg/);
 assert.match(html,/未読込：Tier1紋章/);
 assert.doesNotMatch(html,/data-tier2-art/);
 assert.match(html,/a05-t2-stage--natural/);
 assert.match(html,/alt=""/);
});
test('v37: arbitrary or unsafe image URLs are rejected, only local raster data accepted',()=>{
 for(const src of [
  'https://example.com/a.png','javascript:alert(1)',"data:image/svg+xml;base64,PHN2Zy8+",
  'data:text/html;base64,PHNjcmlwdD4=','data:image/png;base64,AAAA"onerror="x'
 ]) assert.throws(()=>validateTier2ReviewImageSrc(src),TypeError);
 assert.equal(validateTier2ReviewImageSrc(null),null);
 assert.equal(validateTier2ReviewImageSrc(sampleData),sampleData);
});
test('v37: every RGBY and E direction uses CSS separately, no fixed color in art',()=>{
 for(const motif of TIER2_REVIEW_MOTIFS)for(const accent of Object.keys(RGBY))
 for(const eAxis of ['money','time',null]) {
  const html=renderTier2Review({motif,accent,eAxis,imageSrc:sampleData});
  assert.ok(html.includes('--a05-t2-accent:'+RGBY[accent]));
  assert.ok(html.includes('data-tier2-art'));
  assert.ok(html.includes(sampleData));
  assert.ok(html.includes('data-tier2-setting="motif"'));
  assert.ok(html.includes('data-tier2-upload'));
  assert.ok(html.includes('未承認'));
 }
});
test('v37: Pegasus thumbnails are optional and the principal image preserves containment',()=>{
 const p=renderTier2Review({motif:'pegasus',imageSrc:sampleData});
 assert.match(p,/a05-t2-thumbnails/);
 assert.match(p,/寄り表示（採用未定）/);
 const w=renderTier2Review({motif:'world-tree',imageSrc:sampleData,worldTreeRatio:'portrait'});
 assert.doesNotMatch(w,/a05-t2-stage--natural/);
 assert.doesNotMatch(w,/a05-t2-thumbnails/);
 assert.match(w,/data-tier2-setting="worldTreeRatio"/);
 assert.doesNotMatch(p,/data-tier2-setting="worldTreeRatio"/);
 assert.doesNotMatch(renderTier2Review({motif:'crow-tengu'}),/data-tier2-setting="worldTreeRatio"/);
 assert.doesNotMatch(renderTier2Review({motif:'carbuncle'}),/data-tier2-setting="worldTreeRatio"/);
 const css=readFileSync(new URL('tier2-review.css',assetRoot),'utf8');
 assert.match(css,/\.a05-t2-art\{[^}]*object-fit:contain/);
 assert.match(css,/\.a05-t2-mini--crop img\{object-fit:cover/);
 assert.match(css,/@media\(max-width:650px\)/);
});
test('v37: real A05 result only mounts local review with explicit URL opt-in',()=>{
 const app=readFileSync(new URL('app.mjs',assetRoot),'utf8');
 assert.match(app,/URLSearchParams\(window\.location\.search\)\.get\("a05_tier2_review"\) === "1"/);
 assert.match(app,/TIER2_REVIEW_ENABLED \? renderTier2Review/);
 assert.match(app,/tier2Images = Object\.create\(null\)/);
 assert.match(app,/imageSrc: tier2Images\[state\.tier2Review\.motif\] \?\? null/);
 assert.match(app,/data-tier2-upload/);
 const index=readFileSync(new URL('index.html',assetRoot),'utf8');
 assert.match(index,/href="\.\/tier2-review\.css"/);
});
