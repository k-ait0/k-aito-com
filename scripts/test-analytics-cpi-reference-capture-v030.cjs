'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const M=require('../lib/analytics/cpi-reference-capture-v030.cjs');
const root=path.resolve(__dirname,'..');
const pub=path.join(root,'research/analytics/bls_private_bundle_public_key_20261111.pem');
const make=()=>Buffer.from('\uFEFF品目符号,品目,202501,202607,202608,202609\r\n'+
 Array.from({length:28},(_,i)=>`${('000'+i).slice(-4)},全国総合,${(100+i*.001).toFixed(3)},${(101+i*.001).toFixed(3)},${(102+i*.001).toFixed(3)},${(103+i*.001).toFixed(3)}`).join('\r\n')+'\r\n');
const dir=()=>fs.mkdtempSync(path.join(os.tmpdir(),'analytics-v30-'));
const clean=d=>fs.rmSync(d,{recursive:true,force:true});
test('pinned Statistics Bureau source is HTTPS and exact',()=>{assert.equal(M.SOURCE_URL,'https://www.stat.go.jp/data/cpi/2025/csv/zmi2025aa.csv');assert.equal(M.PUBLIC_KEY_PEM_SHA256,'bfe78c5a3684d8272a94d778d4d1c49b0ea56c4a9a03fdc5de42bcb437281e28');});
test('reference CSV schema candidate reports source bytes and no false as-of claim',()=>{const x=M.shape(make());assert.equal(x.detected_text_encoding,'utf-8');assert.match(x.sha256,/^[a-f\d]{64}$/);assert.equal(x.year_month_anchors_present.length,4);assert.equal(x.past_publication_vintage,false);assert.equal(x.headline_index_decoded,false);});
test('ASCII/Shift-JIS is accepted only with official YYYYMM tokens',()=>{const buf=Buffer.from('CODE,NAME,202501,202607\n'+'1,ALL,100.000,101.000\n'.repeat(90));assert.equal(M.shape(buf).detected_text_encoding,'utf-8');});
test('reject HTML spoof returned with 200',()=>assert.throws(()=>M.shape(Buffer.from('<html>202501,202607</html>'.repeat(160))),/not CSV/));
test('reject PDF masquerading as CSV',()=>assert.throws(()=>M.shape(Buffer.from('%PDF-1.5\n202501,202607\n'.repeat(80))),/not CSV/));
test('reject zip masquerading as CSV',()=>assert.throws(()=>M.shape(Buffer.concat([Buffer.from([0x50,0x4b,0x03,0x04]),make()])),/not CSV/));
test('reject JSON masquerading as CSV',()=>assert.throws(()=>M.shape(Buffer.from('{"202501":"202607"}'.repeat(180))),/not CSV/));
test('reject NUL bytes in CSV',()=>assert.throws(()=>M.shape(Buffer.concat([make(),Buffer.from([0])])),/Null/));
test('reject absence of official reference year-month anchors',()=>assert.throws(()=>M.shape(Buffer.from('CODE,NAME\n'+'1,FAKE\n'.repeat(300))),/anchors/));
test('reject oversized data',()=>assert.throws(()=>M.shape(Buffer.alloc(2*1024*1024+1,0x61)),/bounded/));
test('reject undersized data',()=>assert.throws(()=>M.shape(Buffer.from('202501,202607')),/bounded/));
test('official existing pinned RSA-3072 public key is verified',()=>{assert.equal(M.publicKey(pub).asymmetricKeyDetails.modulusLength,3072);});
test('reject alternate public key and unpinned public key, even RSA3072',()=>{const d=dir();try{const k=crypto.generateKeyPairSync('rsa',{modulusLength:3072});const f=path.join(d,'wrong.pem');fs.writeFileSync(f,k.publicKey.export({type:'spki',format:'pem'}));assert.throws(()=>M.publicKey(f),/mismatch/);}finally{clean(d)}});
test('reject symlinked private input file',()=>{const d=dir();try{const f=path.join(d,'data.csv'),l=path.join(d,'link.csv');fs.writeFileSync(f,make());fs.symlinkSync(f,l);assert.throws(()=>M.safeFile(l),/Unsafe/);}finally{clean(d)}});
test('reject symlinked public key',()=>{const d=dir();try{const f=path.join(d,'link.pem');fs.symlinkSync(pub,f);assert.throws(()=>M.publicKey(f),/Unsafe/);}finally{clean(d)}});
test('AES-GCM envelope round trip with ephemeral test RSA3072 and ciphertext tamper rejection',()=>{
 const keypair=crypto.generateKeyPairSync('rsa',{modulusLength:3072});const raw=make(),env=M.encrypt(raw,keypair.publicKey,M.shape(raw),{now:new Date('2026-11-13T11:00:00Z')});
 assert.equal(env.capture_timestamp_utc,'2026-11-13T11:00:00.000Z');assert.equal(env.record_is_historical_publication_vintage,false);
 const e=env.encryption;const wrapped=crypto.privateDecrypt({key:keypair.privateKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(e.wrapped_key_b64,'base64'));
 const decrypt=bytes=>{const a=crypto.createDecipheriv('aes-256-gcm',wrapped,Buffer.from(e.nonce_b64,'base64'));a.setAuthTag(Buffer.from(e.tag_b64,'base64'));return Buffer.concat([a.update(bytes),a.final()]);};
 assert.deepEqual(decrypt(Buffer.from(e.ciphertext_b64,'base64')),raw);const tampered=Buffer.from(e.ciphertext_b64,'base64');tampered[2]^=1;assert.throws(()=>decrypt(tampered));
});
test('capture with pinned public key writes encrypted file once with restrictive permissions',()=>{
 const d=dir();try{const input=path.join(d,'data.csv'),out=path.join(d,'secure');fs.writeFileSync(input,make());const a=M.capture({input_path:input,public_key_path:pub,out_dir:out,now:new Date('2026-11-13T11:00:00Z')});assert.equal(a.original_exposed,false);const f=path.join(out,a.encrypted_filename);const env=JSON.parse(fs.readFileSync(f));assert.equal(env.original_file_sha256,a.raw_sha256);assert.ok(!fs.readFileSync(f,'utf8').includes('全国総合'));assert.equal(fs.statSync(f).mode&0o777,0o600);assert.throws(()=>M.capture({input_path:input,public_key_path:pub,out_dir:out,now:new Date('2026-11-13T11:00:00Z')}),/EEXIST/);}
 finally{clean(d)}
});
test('capture never writes raw source or source path in output metadata',()=>{
 const d=dir();try{const input=path.join(d,'my-unpublished.csv'),out=path.join(d,'enc');fs.writeFileSync(input,make());const a=M.capture({input_path:input,public_key_path:pub,out_dir:out});const raw=fs.readFileSync(path.join(out,a.encrypted_filename),'utf8');assert.equal(raw.includes(input),false);assert.equal(raw.includes('my-unpublished.csv'),false);}
 finally{clean(d)}
});
test('CLI rejects missing and duplicate flags',()=>{for(const args of [[],['--input','/tmp/no.csv'],['--input','x','--input','y']]){const r=cp.spawnSync(process.execPath,['scripts/capture-analytics-cpi-reference-v30.cjs',...args],{cwd:root,encoding:'utf8'});assert.equal(r.status,2,r.stderr);assert.match(r.stderr,/BLOCKED/);}});
test('CLI capture output never includes original raw data',()=>{
 const d=dir();try{const input=path.join(d,'source.csv'),out=path.join(d,'private');fs.writeFileSync(input,make());const r=cp.spawnSync(process.execPath,['scripts/capture-analytics-cpi-reference-v30.cjs','--input',input,'--public-key',pub,'--out-dir',out],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);const info=JSON.parse(r.stdout);assert.equal(info.ready_for_asof_rolling,false);assert.ok(!r.stdout.includes('全国総合'));assert.equal(fs.existsSync(path.join(out,info.encrypted_filename)),true);}
 finally{clean(d)}
});
test('workflow must pin official HTTPS source and only upload encrypted JSONs',()=>{
 const flow=fs.readFileSync(path.join(root,'.github/workflows/analytics-cpi-2025-reference-capture-v30.yml'),'utf8');assert.match(flow,/www\.stat\.go\.jp\/data\/cpi\/2025\/csv\/zmi2025aa\.csv/);assert.match(flow,/permissions:\s*\n\s*contents: read/);assert.match(flow,/retention-days: 5/);assert.match(flow,/encrypted\/\*\.encrypted\.json/);assert.doesNotMatch(flow,/(?:contents:\s*write|pull_request_target|repository_dispatch)/);
});
