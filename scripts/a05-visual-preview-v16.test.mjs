import test from 'node:test';
import assert from 'node:assert/strict';
import { MOTIFS, RGBY } from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';
import { renderVisualPreview } from '../projects/kidp/life-design-lab/a05/visual-preview.mjs';

test('16 motifs appear as independent manual choices',()=>{
 const html=renderVisualPreview({motif:'world-tree',accent:'R',eAxis:null,motion:false});
 assert.equal((html.match(/<option value="(?:polaris|sacred-peak|harbor|moon|world-tree|ocean|rainbow|constellation|pegasus|phoenix|nine-tailed-fox|cat-sith|twin-dragons|crow-tengu|whale-pod|carbuncle)"/g)||[]).length,16);
 assert.match(html,/診断判定とは未連動/);
 assert.match(html,/Tier2原画：未接続/);
 assert.match(html,/src="\.\/crests\/world-tree\.svg"/);
 assert.match(html,/--a05-vp-color:#FF3B5C/);
});
test('128 explicit display combinations and E-axis withheld',()=>{
 let count=0;
 for(const motif of MOTIFS)for(const accent of Object.keys(RGBY))for(const eAxis of ['money','time']){
  const html=renderVisualPreview({motif:motif.id,accent,eAxis,motion:false});
  assert.match(html,/data-visual-setting="motif"/);
  assert.ok(html.includes('--a05-vp-color:'+RGBY[accent]));
  assert.ok(html.includes('crests/'+motif.id+'.svg'));
  count++;
 }
 assert.equal(count,128);
 assert.match(renderVisualPreview({motif:'world-tree',accent:'R',eAxis:null}),/未割当/);
});
test('legacy T types never resolve into a new motif',()=>{
 assert.throws(()=>renderVisualPreview({motif:'T01',accent:'R'}),TypeError);
 assert.throws(()=>renderVisualPreview({motif:'world-tree',accent:'Z'}),TypeError);
});
