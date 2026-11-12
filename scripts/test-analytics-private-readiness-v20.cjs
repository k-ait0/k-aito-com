'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const X=require('../lib/analytics/private-readiness-v20.cjs');
const CLI=require('./check-analytics-private-readiness-v20.cjs');
const backup='/mnt/data/K_Aito_Analytics_Encrypted_Evidence_Backup_20261112.zip';
const temp=fn=>t=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'analytics_readiness_v20_'));try{return fn(t,d)}finally{fs.rmSync(d,{recursive:true,force:true})}};
test('v20 public key is the previously pinned public PEM',()=>{
 assert.equal(crypto.createHash('sha256').update(X.PINNED_PUBLIC_KEY).digest('hex'),'bfe78c5a3684d8272a94d778d4d1c49b0ea56c4a9a03fdc5de42bcb437281e28');
});
test('v20 RSA-3072 private key identity checks with a matching synthetic public key',temp((t,d)=>{
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:3072,publicExponent:65537});
 const p=path.join(d,'synthetic-key.pem');fs.writeFileSync(p,privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
 assert.equal(X.verifyPrivateKeyIdentity(p,{publicPem:publicKey.export({type:'spki',format:'pem'})}).matches,true);
}));
test('v20 RSA-3072 different private key is rejected',temp((t,d)=>{
 const pair=()=>crypto.generateKeyPairSync('rsa',{modulusLength:3072,publicExponent:65537});
 const a=pair(),b=pair(),p=path.join(d,'synthetic-key.pem');
 fs.writeFileSync(p,b.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
 assert.throws(()=>X.verifyPrivateKeyIdentity(p,{publicPem:a.publicKey.export({type:'spki',format:'pem'})}),/does not match/);
}));
test('v20 refuses weak RSA-2048 even when key matches fixture public key',temp((t,d)=>{
 const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});const p=path.join(d,'weak-key.pem');
 fs.writeFileSync(p,pair.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
 assert.throws(()=>X.verifyPrivateKeyIdentity(p,{publicPem:pair.publicKey.export({type:'spki',format:'pem'})}),/RSA-3072/);
}));
test('v20 refuses a symlink to an RSA secret',temp((t,d)=>{
 const pair=crypto.generateKeyPairSync('rsa',{modulusLength:3072});const p=path.join(d,'key.pem');
 fs.writeFileSync(p,pair.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});fs.symlinkSync(p,path.join(d,'alias.pem'));
 assert.throws(()=>X.verifyPrivateKeyIdentity(path.join(d,'alias.pem'),{publicPem:pair.publicKey.export({type:'spki',format:'pem'})}),/regular|symlink/);
}));
test('v20 requires an explicit encrypted backup ZIP path',()=>assert.throws(()=>X.inspectReadiness({}),/backup-zip/));
test('v20 CLI forbids unknown flags',()=>assert.throws(()=>CLI.parse(['--backup-zip','/a','--force']),/Unknown/));
test('v20 CLI forbids both Shiller search and explicit Shiller CSV',()=>assert.throws(()=>X.inspectReadiness({backup_zip:backup,shiller_file:'/a',search_dir:'/b'}),/Choose shiller/));
test('v20 actual encrypted backup accepts five artifact pins but does not claim real QA', {skip:!fs.existsSync(backup)},()=>{
 const r=X.inspectReadiness({backup_zip:backup});
 assert.equal(r.ciphertext_verified,true);assert.equal(r.encrypted_artifacts_verified,5);
 assert.equal(r.status,'BLOCKED_PRIVATE_INPUTS');assert.deepEqual(r.blockers,['RSA_PRIVATE_KEY_NOT_CHECKED','LEGACY_SHILLER_ORIGINAL_NOT_CHECKED']);
 assert.equal(r.real_data_qa_complete,false);assert.equal(r.simulation_executed,false);
});
test('v20 wrong Shiller file is not treated as pinned', {skip:!fs.existsSync(backup)},temp((t,d)=>{
 const f=path.join(d,'shiller.csv');fs.writeFileSync(f,'not official data');
 const r=X.inspectReadiness({backup_zip:backup,shiller_file:f});
 assert.equal(r.legacy_shiller_exact_verified,false);assert.ok(r.blockers.includes('LEGACY_SHILLER_BYTES_NOT_PINNED'));
}));
test('v20 bad synthetic private key never appears in output', {skip:!fs.existsSync(backup)},temp((t,d)=>{
 const pair=crypto.generateKeyPairSync('rsa',{modulusLength:3072});const f=path.join(d,'private-super-secret.pem');
 fs.writeFileSync(f,pair.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
 const r=X.inspectReadiness({backup_zip:backup,private_key:f});
 assert.equal(r.key_pair_match_verified,false);assert.ok(r.blockers.includes('RSA_KEY_MISMATCH_OR_UNREADABLE'));
 assert.equal(JSON.stringify(r).includes('private-super-secret'),false);
}));
test('v20 bad encrypted backup fails closed, cannot claim readiness',temp((t,d)=>{
 const f=path.join(d,'fake-backup.zip');fs.writeFileSync(f,Buffer.alloc(200,0));
 assert.throws(()=>X.inspectReadiness({backup_zip:f}),/ZIP|Invalid|backup/);
}));
