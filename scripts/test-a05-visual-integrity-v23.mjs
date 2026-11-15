/** A05 V-06 / V-09 v23: source-only Tier1 asset gate (not a visual approval). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOTIFS, RGBY, resolveVisualDisplay } from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';
import { renderVisualCard } from '../projects/kidp/life-design-lab/a05/visual-preview.mjs';

const root = new URL('../projects/kidp/life-design-lab/a05/', import.meta.url);
const slots = ['00', '01', '10', '11'];

test('v23: exactly one distinct motif per A/B strength slot in each of four groups', () => {
  assert.equal(MOTIFS.length, 16);
  assert.equal(new Set(MOTIFS.map(m => m.id)).size, 16);
  assert.equal(new Set(MOTIFS.map(m => m.slot)).size, 16);
  for (const [prefix, group] of [
    ['SA', '安定×自律'], ['SC', '安定×つながり'],
    ['CA', '変化×自律'], ['CC', '変化×つながり']
  ]) {
    const subset = MOTIFS.filter(m => m.group === group);
    assert.equal(subset.length, 4, group);
    assert.deepEqual(subset.map(m => m.slot), slots.map(s => prefix + '-' + s).reverse(), group);
  }
});

test('v23: all 16 SVGs are self-contained, correctly named, and refer only to defined paint servers', () => {
  const assetBodies = [];
  for (const motif of MOTIFS) {
    const svg = readFileSync(new URL('crests/' + motif.id + '.svg', root), 'utf8');
    assetBodies.push(svg);
    assert.match(svg, /<svg\b[^>]*width="128" height="128" viewBox="0 0 128 128"/);
    assert.ok(svg.includes('<title>' + motif.name + 'の紋章</title>'), motif.id);
    assert.doesNotMatch(svg, /<script\b|<foreignObject\b|<!DOCTYPE|<image\b|<use\b|@import|<style\b/i, motif.id);
    assert.doesNotMatch(svg, /(?:href|src)\s*=\s*["']/i, motif.id);
    const defined = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
    for (const match of svg.matchAll(/url\(#([^)]+)\)/g)) {
      assert.ok(defined.has(match[1]), motif.id + ': undefined paint ' + match[1]);
    }
  }
  assert.equal(new Set(assetBodies).size, 16, 'different motifs must not reuse an identical full SVG');
});

test('v23: RGBY is CSS-frame metadata and never baked into any Tier1 source SVG', () => {
  assert.deepEqual(Object.keys(RGBY).sort(), ['B', 'G', 'R', 'Y']);
  for (const motif of MOTIFS) {
    const svg = readFileSync(new URL('crests/' + motif.id + '.svg', root), 'utf8').toLowerCase();
    for (const value of Object.values(RGBY)) {
      assert.ok(!svg.includes(value.toLowerCase()), motif.id + ': RGBY source contamination');
    }
    const card = renderVisualCard({motif:motif.id,accent:'Y',eAxis:null,motion:false});
    assert.ok(card.includes('--a05-vp-color:' + RGBY.Y), motif.id);
    assert.ok(card.includes('Tier2原画：未接続・美術未承認'), motif.id);
    assert.equal(resolveVisualDisplay({motif:motif.id,accent:'Y'}).assetStatus, 'unapproved-concept');
  }
});
