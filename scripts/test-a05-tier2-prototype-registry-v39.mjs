/** A05 v39: guard prototype status against conflation with final-art approval. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOTIFS} from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';
const registry=JSON.parse(readFileSync(new URL('../docs/A05_TIER2_V39_PROTOTYPE_REGISTRY.json',import.meta.url),'utf8'));

test('v39: every prototype-registry entry matches the official sixteen, in order',()=>{
 assert.equal(registry.schema,'a05.tier2.prototype-registry.v39');
 assert.deepEqual(registry.entries.map(({slot,id,name,group})=>({slot,id,name,group})),MOTIFS.map(m=>({
  slot:m.slot,id:m.id,name:m.name,group:m.group
 })));
});

test('v39: prototype-pass is distinct from candidate and formal art approval',()=>{
 const status=Object.groupBy(registry.entries,e=>e.prototypeStatus);
 assert.equal(status.prototype_pass.length,4);
 assert.equal(status.candidate_pending_review.length,1);
 assert.equal(status.not_started.length,11);
 assert.equal(registry.counts.prototypePass,4);
 assert.equal(registry.counts.newCandidatePendingReview,1);
 assert.equal(registry.counts.withoutCandidate,11);
 assert.equal(registry.counts.formalArtApproval,0);
 assert.equal(registry.permissions.publishApproved,false);
 assert.equal(registry.permissions.automaticMotifScoringLink,false);
 assert.ok(registry.entries.every(e=>!e.formalArtApproved&&!e.githubAssetRegistered));
 assert.deepEqual(status.prototype_pass.map(x=>x.id).sort(),
  ['world-tree','pegasus','crow-tengu','carbuncle'].sort());
 assert.equal(status.candidate_pending_review[0].id,'polaris');
 assert.ok(registry.entries.filter(e=>e.prototypeStatus==='not_started').every(x=>x.sha256===null));
 for(const e of [...status.prototype_pass,...status.candidate_pending_review]) {
  assert.match(e.sha256,/^[a-f0-9]{64}$/);
 }
});

test('v39: rejected poster attempts never create an approved candidate',()=>{
 assert.deepEqual(registry.rejects.map(x=>x.motif),['sacred-peak','harbor']);
 for(const x of registry.rejects)
  assert.equal(registry.entries.find(e=>e.id===x.motif).prototypeStatus,'not_started');
});
