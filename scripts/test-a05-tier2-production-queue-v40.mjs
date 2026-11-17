import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOTIFS } from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const queue=read('../docs/A05_TIER2_PRODUCTION_QUEUE_V40.json');
const canonical=read('../docs/A05_VISUAL_CANONICAL_MOTIFS_V30.json');
test('v40: all 16 production slots match approved canonical motif names and ids',()=>{
 assert.equal(queue.schema,'a05.tier2-production-queue.v40');
 assert.deepEqual(queue.motifs.map(m=>[m.slot,m.id,m.name,m.group]),
   canonical.motifs.map(m=>[m.slot,m.id,m.name,m.group]));
 assert.deepEqual(queue.motifs.map(m=>m.id),MOTIFS.map(m=>m.id));
});
test('v40: count four passed pilots, two review candidates and ten not started',()=>{
 const pick=status=>queue.motifs.filter(m=>m.prototypeStatus===status).map(m=>m.id);
 assert.deepEqual(pick('pilot-passed').sort(),['world-tree','pegasus','crow-tengu','carbuncle'].sort());
 assert.deepEqual(pick('candidate-review').sort(),['polaris','sacred-peak']);
 assert.equal(pick('not-started').length,10);
 assert.equal(queue.pilotPassedCount,4);
 assert.equal(queue.newCandidateCount,2);
 assert.deepEqual(queue.newCandidateIds,['polaris','sacred-peak']);
 assert.equal(queue.remainingWithoutCandidateCount,10);
 assert.equal(queue.formallyApprovedCount,0);
 assert.equal(queue.releaseApproved,false);
});
test('v40: sacred peak is a single local-only candidate, harbor stays unmade',()=>{
 const find=id=>queue.motifs.find(m=>m.id===id);
 assert.equal(find('sacred-peak').localArtifact.sha256,
  'e85fc30130f2ce502b9b63d93252372b73428a77aeccdd0c105db833871699d6');
 assert.equal(find('sacred-peak').localArtifact.size,'1024x1536');
 assert.equal(find('sacred-peak').localArtifact.gitHubUploaded,false);
 for(const id of ['harbor','moon','ocean','rainbow','constellation',
   'phoenix','nine-tailed-fox','cat-sith','twin-dragons','whale-pod']){
   assert.equal(find(id).prototypeStatus,'not-started',id);
   assert.equal(Object.hasOwn(find(id),'localArtifact'),false,id);
 }
 for(const m of queue.motifs){
   assert.equal(m.productionAccepted,false,m.id);
   assert.equal(m.releaseAsset,false,m.id);
   assert.equal(m.artReview,'pending',m.id);
 }
});
