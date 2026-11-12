import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOTIFS } from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(repo, 'projects/kidp/life-design-lab/a05');
const read = (p) => readFileSync(join(root,p),'utf8');

test('all 16 approved motif slots have a v7 Tier1 crest asset', () => {
 assert.equal(MOTIFS.length, 16);
 for(const m of MOTIFS){
  const file = join(root,'crests',m.id+'.svg');
  assert.equal(existsSync(file),true,m.id);
  const svg = readFileSync(file,'utf8');
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/viewBox="0 0 128 128"/);
  assert.ok(svg.includes('<title>'+m.name+'の紋章</title>'),m.id);
  assert.doesNotMatch(svg,/<script|<image|<foreignObject|onload=|javascript:|xlink:href/i);
 }
});
test('result-page preview refers to ordinary same-origin assets only', () => {
 const src=read('visual-preview.mjs');
 assert.match(src,/src="\.\/crests\//);
 assert.doesNotMatch(src,/crests\.svg#/);
 assert.match(src,/alt=""/);
 const app=read('app.mjs');
 assert.match(app,/renderVisualPreview\(state\.visualPreview\)/);
 const html=read('index.html');
 assert.match(html,/img-src 'self' data:/);
 assert.match(html,/visual-preview\.css/);
});
test('crest sprites and files remain separate from scoring and storage', () => {
 const preview=read('visual-preview.mjs');
 const contract=read('visual-contract.mjs');
 assert.doesNotMatch(preview,/scoreAssessment|saveDraft|makeSnapshot|IndexedDB/);
 assert.match(contract,/Missing or unknown motif/);
});
