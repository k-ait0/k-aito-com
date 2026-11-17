import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOTIFS, RGBY, resolveVisualDisplay } from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';
import { renderVisualCard, renderVisualPreview } from '../projects/kidp/life-design-lab/a05/visual-preview.mjs';

const ROOT = new URL('../projects/kidp/life-design-lab/a05/', import.meta.url);

test('V-09: reusable presentation card accepts explicit IDs, not any score or T-type', () => {
 assert.equal(MOTIFS.length,16);
 for(const m of MOTIFS) {
  assert.throws(() => renderVisualCard({ motif: 'T01', accent:'R' }), TypeError);
  assert.match(renderVisualCard({ motif:m.id,accent:'R',eAxis:null,motion:false }), /data-a05-visual="explicit"/);
 }
 assert.throws(() => resolveVisualDisplay({motif:'world-tree',accent:'Z'}),TypeError);
 assert.throws(() => resolveVisualDisplay({motif:'world-tree',accent:'R',eAxis:'neutral'}),TypeError);
});
test('V-08: card figure and visible caption are available to assistive tech', () => {
 const html = renderVisualCard({motif:'world-tree',accent:'B',eAxis:'time',motion:false});
 assert.match(html, /^<figure\b/);
 assert.match(html, /<figcaption\b[^>]*>[^]*世界樹/);
 assert.match(html, /<img\b[^>]*alt=""[^>]*aria-hidden="true"/);
 assert.doesNotMatch(html, /role="img"/);
 assert.match(html, /時間的自由/);
 assert.match(html, /RGBY：B/);
 assert.match(renderVisualCard({motif:'world-tree',accent:'R',eAxis:null}),/E軸：未割当/);
});
test('V-07: keyboard controls remain properly labelled and focusable', () => {
 const html=renderVisualPreview({motif:'world-tree',accent:'R',eAxis:null,motion:false});
 assert.match(html,/診断判定とは未連動/);
 assert.equal((html.match(/<label>/g)||[]).length,4);
 assert.equal((html.match(/data-visual-setting="/g)||[]).length,4);
 assert.equal((html.match(/<select\b/g)||[]).length,4);
 assert.match(html,/静止（推奨）/);
 const css=readFileSync(new URL('visual-preview.css',ROOT),'utf8');
 assert.match(css,/select:focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/forced-colors:active/);
 assert.match(css,/@media\(max-width:650px\)/);
});
test('V-06: 16 SVGs have native 128-square viewport and require a visible name at small sizes',()=>{
 for(const m of MOTIFS){
  const svg=readFileSync(new URL('crests/'+m.id+'.svg',ROOT),'utf8');
  assert.match(svg,/viewBox="0 0 128 128"/);
  assert.match(svg,/width="128" height="128"/);
  assert.match(svg,/<title>[^<]+<\/title>/);
  const html=renderVisualCard({motif:m.id,accent:'Y'});
  assert.match(html,new RegExp('<figcaption[^>]*>[^]*'+m.name));
 }
});
test('128 normal 16 x RGBY x E display combinations keep source independent',()=>{
 let count=0;
 for(const motif of MOTIFS)for(const color of Object.keys(RGBY))for(const eAxis of ['money','time']){
  const h=renderVisualCard({motif:motif.id,accent:color,eAxis,motion:false});
  assert.ok(h.includes('crests/'+motif.id+'.svg'));
  assert.ok(h.includes('--a05-vp-color:'+RGBY[color]));
  count++;
 }
 assert.equal(count,128);
});
