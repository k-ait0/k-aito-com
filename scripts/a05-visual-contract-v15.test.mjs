import test from 'node:test';
import assert from 'node:assert/strict';
import {MOTIFS,RGBY,resolveVisualDisplay} from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';
test('16 fixed motif identities and unique slots', () => {
 assert.equal(MOTIFS.length,16);
 assert.equal(new Set(MOTIFS.map(m=>m.id)).size,16);
 assert.equal(new Set(MOTIFS.map(m=>m.slot)).size,16);
});
test('128 explicit combinations', () => {
 let n=0;
 for(const m of MOTIFS)for(const c of Object.keys(RGBY))for(const eAxis of ['money','time']){
  const value=resolveVisualDisplay({motif:m.id,accent:c,eAxis});
  assert.equal(value.hex,RGBY[c]); n++;
 }
 assert.equal(n,128);
});
test('withheld/neutral E has no assigned symbol', () => {
 assert.equal(resolveVisualDisplay({motif:'world-tree',accent:'R',eAxis:null}).eAxis,null);
});
test('legacy classification IDs must never silently map to visual motifs', () => {
 assert.throws(()=>resolveVisualDisplay({motif:'T01',accent:'R'}),TypeError);
 assert.throws(()=>resolveVisualDisplay({motif:'world-tree',accent:'invalid'}),TypeError);
 assert.throws(()=>resolveVisualDisplay({motif:'world-tree',accent:'R',eAxis:'neutral'}),TypeError);
});
