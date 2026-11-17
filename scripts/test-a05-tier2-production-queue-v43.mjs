import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOTIFS} from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const q=read('../docs/A05_TIER2_PRODUCTION_QUEUE_V43.json');
const canonical=read('../docs/A05_VISUAL_CANONICAL_MOTIFS_V30.json');
const find=id=>q.motifs.find(m=>m.id===id);
test('v43: production queue retains the canonical 16 identities, slots and groups',()=>{
 assert.equal(q.schema,'a05.tier2-production-queue.v43');
 assert.deepEqual(q.motifs.map(m=>[m.slot,m.id,m.name,m.group]),
   canonical.motifs.map(m=>[m.slot,m.id,m.name,m.group]));
 assert.deepEqual(q.motifs.map(m=>m.id),MOTIFS.map(m=>m.id));
});
test('v43: four pilot passes, six review candidates, six unmade',()=>{
 const ids=s=>q.motifs.filter(m=>m.prototypeStatus===s).map(m=>m.id).sort();
 assert.deepEqual(ids('pilot-passed'),['world-tree','pegasus','crow-tengu','carbuncle'].sort());
 assert.deepEqual(ids('candidate-review'),['polaris','sacred-peak','harbor','moon','ocean','rainbow'].sort());
 assert.deepEqual(ids('not-started'),['constellation','phoenix','nine-tailed-fox','cat-sith','twin-dragons','whale-pod'].sort());
 assert.equal(q.pilotPassedCount,4);
 assert.equal(q.newCandidateCount,6);
 assert.deepEqual(q.newCandidateIds,['polaris','sacred-peak','harbor','moon','ocean','rainbow']);
 assert.equal(q.remainingWithoutCandidateCount,6);
 assert.equal(q.formallyApprovedCount,0);
 assert.equal(q.releaseApproved,false);
});
test('v43: new imagery is locally reviewed and never represented as published',()=>{
 const assets={
  ocean:'025eed72b8a643498e3669524276f4f1f0509fc710385a7dbb5a2de35f9e9cbf',
  rainbow:'e1788ddc8831e21e1b457c309a047f4b5a6c14146295c032688c9b2de3a3e9f1'
 };
 for(const [id,sha] of Object.entries(assets)){
  const m=find(id);
  assert.equal(m.prototypeStatus,'candidate-review');
  assert.equal(m.localArtifact.sha256,sha);
  assert.equal(m.localArtifact.size,'1024x1536');
  assert.equal(m.localArtifact.gitHubUploaded,false);
 }
 for(const m of q.motifs){
  assert.equal(m.productionAccepted,false,m.id);
  assert.equal(m.releaseAsset,false,m.id);
  assert.equal(m.artReview,'pending',m.id);
 }
});
