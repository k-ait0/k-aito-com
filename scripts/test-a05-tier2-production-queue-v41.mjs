import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOTIFS} from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';
const parse=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const queue=parse('../docs/A05_TIER2_PRODUCTION_QUEUE_V41.json');
const canonical=parse('../docs/A05_VISUAL_CANONICAL_MOTIFS_V30.json');
const find=id=>queue.motifs.find(m=>m.id===id);
test('v41: 16 names, group and slot are identical to canonical list',()=>{
 assert.equal(queue.schema,'a05.tier2-production-queue.v41');
 assert.deepEqual(queue.motifs.map(m=>[m.slot,m.id,m.name,m.group]), canonical.motifs.map(m=>[m.slot,m.id,m.name,m.group]));
 assert.deepEqual(queue.motifs.map(m=>m.id),MOTIFS.map(m=>m.id));
});
test('v41: four pilot passes, three image review candidates, nine unmade',()=>{
 const ids=status=>queue.motifs.filter(m=>m.prototypeStatus===status).map(m=>m.id).sort();
 assert.deepEqual(ids('pilot-passed'),['world-tree','pegasus','crow-tengu','carbuncle'].sort());
 assert.deepEqual(ids('candidate-review'),['polaris','sacred-peak','moon'].sort());
 assert.equal(ids('not-started').length,9);
 assert.equal(queue.pilotPassedCount,4);
 assert.equal(queue.newCandidateCount,3);
 assert.deepEqual(queue.newCandidateIds,['polaris','sacred-peak','moon']);
 assert.equal(queue.remainingWithoutCandidateCount,9);
 assert.equal(queue.formallyApprovedCount,0);
 assert.equal(queue.releaseApproved,false);
});
test('v41: Moon is a local-only image, Harbor was not accepted after subject drift',()=>{
 assert.equal(find('moon').localArtifact.sha256,'fd3e0098f5c62f81e6b021c85dd0f04073602b1cbe7e51c0eb47c6ae1ea959ec');
 assert.equal(find('moon').localArtifact.size,'1024x1536');
 assert.equal(find('moon').localArtifact.gitHubUploaded,false);
 assert.equal(find('moon').prototypeStatus,'candidate-review');
 assert.equal(find('harbor').prototypeStatus,'not-started');
 assert.equal(Object.hasOwn(find('harbor'),'localArtifact'),false);
 assert.ok(queue.notes.some(n=>n.includes('商業港')));
 for(const m of queue.motifs){
  assert.equal(m.artReview,'pending',m.id);
  assert.equal(m.productionAccepted,false,m.id);
  assert.equal(m.releaseAsset,false,m.id);
 }
});
