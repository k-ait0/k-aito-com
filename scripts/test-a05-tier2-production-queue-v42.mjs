import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOTIFS} from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const q=read('../docs/A05_TIER2_PRODUCTION_QUEUE_V42.json');
const official=read('../docs/A05_VISUAL_CANONICAL_MOTIFS_V30.json');
test('v42: production queue contains all and only the 16 canonical motifs',()=>{
 assert.equal(q.schema,'a05.tier2-production-queue.v42');
 assert.equal(q.selectedCount,16);
 assert.deepEqual(q.motifs.map(m=>[m.slot,m.id,m.name,m.group]),
   official.motifs.map(m=>[m.slot,m.id,m.name,m.group]));
 assert.deepEqual(q.motifs.map(m=>m.id),MOTIFS.map(m=>m.id));
});
test('v42: four passed pilot artworks, four review candidates, eight unmade',()=>{
 const ids=s=>q.motifs.filter(m=>m.prototypeStatus===s).map(m=>m.id).sort();
 assert.deepEqual(ids('pilot-passed'),['world-tree','pegasus','crow-tengu','carbuncle'].sort());
 assert.deepEqual(ids('candidate-review'),['polaris','sacred-peak','harbor','moon'].sort());
 assert.equal(ids('not-started').length,8);
 assert.equal(q.pilotPassedCount,4);
 assert.equal(q.newCandidateCount,4);
 assert.deepEqual(q.newCandidateIds,['polaris','sacred-peak','harbor','moon']);
 assert.equal(q.remainingWithoutCandidateCount,8);
 assert.equal(q.formallyApprovedCount,0);
 assert.equal(q.releaseApproved,false);
});
test('v42: real quiet cove image is only a local review candidate and not a released asset',()=>{
 const harbor=q.motifs.find(m=>m.id==='harbor');
 assert.equal(harbor.slot,'SA-01');
 assert.equal(harbor.name,'港');
 assert.equal(harbor.prototypeStatus,'candidate-review');
 assert.equal(harbor.localArtifact.sha256,'b551c681a9722748c13b25472684e8fafe9d1eaa4621bb0a93aa73edef4f1a7d');
 assert.equal(harbor.localArtifact.size,'1024x1536');
 assert.equal(harbor.localArtifact.gitHubUploaded,false);
 for(const m of q.motifs){
  assert.equal(m.artReview,'pending',m.id);
  assert.equal(m.productionAccepted,false,m.id);
  assert.equal(m.releaseAsset,false,m.id);
 }
});
