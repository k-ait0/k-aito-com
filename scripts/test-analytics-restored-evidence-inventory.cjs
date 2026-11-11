'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {PINNED,REQUIREMENTS,inventoryRestoredEvidence}=require('../lib/analytics/restored-evidence-inventory.cjs');
const d=()=>fs.mkdtempSync(path.join(os.tmpdir(),'analytics-inventory-v11-'));
function validRoot(root){
 for(const name of ['bls_cpi_us','estat_jp_cpi','fed_h10_locked_2000','world_bank_quarantine','fed_ddp_candidate_QUARANTINE'])fs.mkdirSync(path.join(root,name));
 const receipt={schema:'ANALYTICS_PRIVATE_EVIDENCE_RESTORED_V11',status:'OFFLINE_DECRYPTION_AND_TAR_VALIDATION_COMPLETE',results:Array.from({length:5},(_,i)=>({artifact_id:i}))};
 fs.writeFileSync(path.join(root,'PRIVATE_RESTORE_REPORT.json'),JSON.stringify(receipt));
}
test('all six handoff requirements have explicit canonical hashes',()=>{assert.equal(REQUIREMENTS.length,6);for(const r of REQUIREMENTS)assert.match(PINNED[r.key],/^[0-9a-f]{64}$/);});
test('inventory distinguishes successfully restored archives from the six v10 handoff files',()=>{
 const root=d();try{validRoot(root);const r=inventoryRestoredEvidence(root);assert.equal(r.matched,0);assert.equal(r.required,6);assert.equal(r.ready_for_v10,false);assert.equal(r.expected_v10_inputs.find(x=>x.source==='shiller').reason,'NOT_INCLUDED_IN_ENCRYPTED_ARTIFACTS');assert.equal(r.expected_v10_inputs.find(x=>x.source==='fx_canonical').reason,'NOT_GENERATED_BY_FED_SOURCE_WORKFLOW');}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('missing restoration receipt is rejected',()=>{const root=d();try{assert.throws(()=>inventoryRestoredEvidence(root),/Missing private restoration receipt/);}finally{fs.rmSync(root,{recursive:true,force:true});}});
test('incomplete restoration receipt is rejected',()=>{const root=d();try{validRoot(root);fs.writeFileSync(path.join(root,'PRIVATE_RESTORE_REPORT.json'),'{}');assert.throws(()=>inventoryRestoredEvidence(root),/incomplete or unrecognized/);}finally{fs.rmSync(root,{recursive:true,force:true});}});
test('restoration receipt with incorrect artifact count is rejected',()=>{const root=d();try{validRoot(root);const p=path.join(root,'PRIVATE_RESTORE_REPORT.json');const r=JSON.parse(fs.readFileSync(p));r.results.pop();fs.writeFileSync(p,JSON.stringify(r));assert.throws(()=>inventoryRestoredEvidence(root),/incomplete/);}finally{fs.rmSync(root,{recursive:true,force:true});}});
test('restored evidence missing a group fails before QA',()=>{const root=d();try{validRoot(root);fs.rmdirSync(path.join(root,'fed_h10_locked_2000'));assert.throws(()=>inventoryRestoredEvidence(root),/Missing restored evidence group/);}finally{fs.rmSync(root,{recursive:true,force:true});}});
test('untrusted raw original cannot be mistaken for pinned evidence',()=>{const root=d();try{validRoot(root);const p=path.join(root,'fed_h10_locked_2000','FED_H10_USDJPY__fake');fs.mkdirSync(p);fs.writeFileSync(path.join(p,'source_RAW.html'),'not the official raw');assert.throws(()=>inventoryRestoredEvidence(root),/SHA differs/);}finally{fs.rmSync(root,{recursive:true,force:true});}});
test('unexpected symlink is rejected, not followed',()=>{const root=d();try{validRoot(root);fs.symlinkSync('/etc/hosts',path.join(root,'fed_h10_locked_2000','source_RAW.html'));assert.throws(()=>inventoryRestoredEvidence(root),/symlink/);}finally{fs.rmSync(root,{recursive:true,force:true});}});
test('duplicate candidate paths are rejected rather than arbitrarily selected',()=>{const root=d();try{validRoot(root);for(const suffix of ['a','b']){const p=path.join(root,'fed_h10_locked_2000','FED_H10_USDJPY__'+suffix);fs.mkdirSync(p);fs.writeFileSync(path.join(p,'source_RAW.html'),'fake');}assert.throws(()=>inventoryRestoredEvidence(root),/Ambiguous private original/);}finally{fs.rmSync(root,{recursive:true,force:true});}});
test('inventories never imply licensed or usable indexed total returns',()=>{const root=d();try{validRoot(root);const r=inventoryRestoredEvidence(root);for(const k of ['actual_market_values_not_loaded_into_portfolio','public_display_approved','raw_redistribution_approved','source_change_adr_approved'])assert.equal(r[k],k==='actual_market_values_not_loaded_into_portfolio');}finally{fs.rmSync(root,{recursive:true,force:true});}});
