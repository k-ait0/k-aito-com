import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOTIFS } from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';
const queue=JSON.parse(readFileSync(new URL('../docs/A05_TIER2_PRODUCTION_QUEUE_V39.json',import.meta.url),'utf8'));
const canonical=JSON.parse(readFileSync(new URL('../docs/A05_VISUAL_CANONICAL_MOTIFS_V30.json',import.meta.url),'utf8'));
test('v39: queue matches canonical 16 identity, slot and order, without surrogate characters',()=>{
 assert.equal(queue.schema,'a05.tier2-production-queue.v39');
 assert.equal(queue.motifs.length,16);
 assert.deepEqual(queue.motifs.map(m=>[m.id,m.name,m.slot,m.group]),
   canonical.motifs.map(m=>[m.id,m.name,m.slot,m.group]));
 assert.deepEqual(queue.motifs.map(m=>m.id),MOTIFS.map(m=>m.id));
 for(const m of queue.motifs) assert.ok(m.subjectGate.length>=20,m.id);
});
test('v39: passed pilots, new candidates and missing art are never miscounted',()=>{
 const statuses=Object.groupBy(queue.motifs,m=>m.prototypeStatus);
 assert.deepEqual((statuses['pilot-passed']||[]).map(m=>m.id).sort(),
   ['world-tree','pegasus','crow-tengu','carbuncle'].sort());
 assert.deepEqual((statuses['candidate-review']||[]).map(m=>m.id),['polaris']);
 assert.equal((statuses['not-started']||[]).length,11);
 assert.equal(queue.pilotPassedCount,4);
 assert.equal(queue.newCandidateCount,1);
 assert.deepEqual(queue.newCandidateIds,['polaris']);
 assert.equal(queue.remainingWithoutCandidateCount,11);
 assert.equal(queue.formallyApprovedCount,0);
 assert.equal(queue.releaseApproved,false);
 for(const m of queue.motifs){
  assert.equal(m.productionAccepted,false);
  assert.equal(m.releaseAsset,false);
  assert.equal(m.artReview,'pending');
 }
});
test('v39: the Polaris review candidate has a verified local hash, not a published asset',()=>{
 const p=queue.motifs.find(m=>m.id==='polaris');
 assert.equal(p.localArtifact.filename,'A05_Tier2_v39_polaris_candidate.png');
 assert.equal(p.localArtifact.sha256,'1247b27543edc662a9629abf107d57ce44dfd31368e755f4bb1945d434b23fee');
 assert.equal(p.localArtifact.size,'1024x1536');
 assert.equal(p.localArtifact.gitHubUploaded,false);
 assert.equal(p.alternateLocalArtifacts.length,1);
 assert.equal(p.alternateLocalArtifacts[0].label,'v39-B');
 assert.equal(p.alternateLocalArtifacts[0].sha256,'0c57a4829e362a20e91f47ff79a6f6e99c9ed0dc33e005764b68bf1931d066f2');
 assert.equal(p.alternateLocalArtifacts[0].gitHubUploaded,false);
 assert.equal(queue.newCandidateCount,1,'two Polaris variants count as one motif');
 assert.ok(queue.notes.some(n=>n.includes('霊峰')));
});
