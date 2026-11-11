'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {ARTIFACTS,sha,crc32,extractOnlyEncryptedJson,auditEncryptedArchive,verifyArtifactMetadata}=require('../lib/analytics/encrypted-artifact-audit.cjs');
const {preserve,privateDirectory}=require('./backup-analytics-encrypted-artifacts.cjs');
function envelope(){const cipher=Buffer.from('test-encrypted-content-not-plaintext');return {
 format:'KAITO_ANALYTICS_ENCRYPTED_RESEARCH_V1',encryption:'AES-256-GCM',key_transport:'RSA-OAEP-3072-SHA256',plaintext_sha256:'f'.repeat(64),ciphertext_sha256:sha(cipher),ciphertext_bytes:cipher.length,
 iv_b64:Buffer.alloc(12,1).toString('base64'),tag_b64:Buffer.alloc(16,2).toString('base64'),wrapped_key_b64:Buffer.alloc(384,3).toString('base64'),ciphertext_b64:cipher.toString('base64'),public_key_sha256:'a'.repeat(64)
};}
function zipFixture(name,plaintext,{deflated=false}={}){
 const payload=Buffer.from(plaintext),file=Buffer.from(name),data=deflated?zlib.deflateRawSync(payload):payload,crc=crc32(payload),method=deflated?8:0;
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(method,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(payload.length,22);local.writeUInt16LE(file.length,26);
 const start=Buffer.concat([local,file,data]);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(method,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(payload.length,24);central.writeUInt16LE(file.length,28);central.writeUInt32LE(0,42);
 const directory=Buffer.concat([central,file]),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(start.length,16);
 return Buffer.concat([start,directory,end]);
}
function artifact(a,opts={}){return zipFixture(opts.name??a.file,JSON.stringify(opts.env??envelope()),{deflated:opts.deflated??false});}
const meta=a=>({id:a.id,name:a.name,expired:false,expires_at:a.expires});
test('five fixed encrypted artifacts, unique IDs, known 2026-11-18 expiration',()=>{
 assert.equal(ARTIFACTS.length,5);assert.equal(new Set(ARTIFACTS.map(x=>x.id)).size,5);
 assert.ok(ARTIFACTS.every(x=>x.expires.startsWith('2026-11-18')));
 assert.equal(ARTIFACTS.filter(x=>x.candidate_only).length,1);
});
test('GitHub artifact metadata checked by ID, exact name and expiry',()=>{
 for(const a of ARTIFACTS)assert.equal(verifyArtifactMetadata(meta(a),a,Date.parse('2026-11-12')).id,a.id);
});
test('must reject expired artifacts and nonmatching names, IDs, deadlines',()=>{
 const a=ARTIFACTS[0];assert.throws(()=>verifyArtifactMetadata(meta(a),a,Date.parse('2026-11-19')),/expired/);
 for(const field of ['id','name','expires_at','expired']){
  const value={...meta(a)};value[field]=field==='expired'?true:field==='id'?-1:field==='expires_at'?'2026-12-18T00:00:00Z':'WRONG';
  assert.throws(()=>verifyArtifactMetadata(value,a,0),/mismatch/);
 }
});
test('single original ZIP encrypted envelope checks pass for STORE and DEFLATE',()=>{
 const a=ARTIFACTS[0];for(const deflated of [false,true]){
  const zip=artifact(a,{deflated}),r=auditEncryptedArchive(zip,a);
  assert.equal(r.archive_sha256,sha(zip));assert.equal(r.plaintext_decrypted,false);assert.equal(r.envelope_verified,true);
  assert.equal(r.ciphertext_bytes,Buffer.from('test-encrypted-content-not-plaintext').length);
 }
});
test('ZIP cannot contain wrong filename even if encrypted',()=>assert.throws(()=>auditEncryptedArchive(artifact(ARTIFACTS[0],{name:'../../raw.csv'}),ARTIFACTS[0]),/Wrong encrypted payload name/));
test('plaintext JSON cannot masquerade as encrypted envelope',()=>assert.throws(()=>auditEncryptedArchive(zipFixture(ARTIFACTS[0].file,JSON.stringify({raw:'not encrypted'})),ARTIFACTS[0]),/Unrecognized ciphertext envelope/));
test('ZIP CRC corruption detected',()=>{const zip=artifact(ARTIFACTS[0]);zip[30+Buffer.byteLength(ARTIFACTS[0].file)+4]^=1;assert.throws(()=>auditEncryptedArchive(zip,ARTIFACTS[0]),/CRC mismatch/)});
test('ZIP must have exactly one member',()=>{const zip=artifact(ARTIFACTS[0]);zip.writeUInt16LE(2,zip.length-22+10);assert.throws(()=>auditEncryptedArchive(zip,ARTIFACTS[0]),/exactly one/)});
test('invalid envelope cipher SHA detected',()=>{const env=envelope();env.ciphertext_sha256='b'.repeat(64);assert.throws(()=>auditEncryptedArchive(artifact(ARTIFACTS[0],{env}),ARTIFACTS[0]),/Invalid ciphertext/)});
test('wrong RSA transport field detected',()=>{const env=envelope();env.key_transport='RSA-OAEP-SHA1';assert.throws(()=>auditEncryptedArchive(artifact(ARTIFACTS[0],{env}),ARTIFACTS[0]),/Unrecognized ciphertext/)});
test('unknown artifact ID blocked',()=>assert.throws(()=>auditEncryptedArchive(artifact(ARTIFACTS[0]),{...ARTIFACTS[0],id:-1}),/Unknown pinned/));
test('base64 and GCM IV/tag/RSA length checks',()=>{
 const cases=[['ciphertext_b64','NON BASE64!'],['iv_b64',Buffer.alloc(8).toString('base64')],['tag_b64',Buffer.alloc(14).toString('base64')],['wrapped_key_b64',Buffer.alloc(200).toString('base64')]];
 for(const [field,value] of cases){const env=envelope();env[field]=value;assert.throws(()=>auditEncryptedArchive(artifact(ARTIFACTS[0],{env}),ARTIFACTS[0]),/base64|Invalid ciphertext/)}
});
test('decompressed input parser rejects arbitrary non-ZIP bytes',()=>assert.throws(()=>extractOnlyEncryptedJson(Buffer.from('ABCD'),ARTIFACTS[0].file),/Archive byte size/));
test('unsafe repo-relative backup path rejected',()=>assert.throws(()=>privateDirectory(path.resolve(__dirname,'../tmp-private')),/overlap repository/));
test('relative path rejected',()=>assert.throws(()=>privateDirectory('backup'),/absolute/));
test('full ciphertext-only backup writes 5 ZIPs and private manifest',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kaito-encrypted-'));
 try{
 const result=await preserve({outDir:dir,clock:()=>Date.parse('2026-11-12'),getMetadata:async a=>meta(a),getZip:async a=>artifact(a)});
 assert.equal(result.artifacts.length,5);assert.equal(result.all_five_encrypted_artifacts_saved,true);
 assert.equal(fs.readdirSync(dir).length,6);
 for(const a of ARTIFACTS){const f=path.join(dir,'encrypted-artifact-'+a.id+'.zip');assert.equal(fs.statSync(f).mode&0o777,0o600);assert.equal(sha(fs.readFileSync(f)),sha(artifact(a)));}
 const m=fs.readFileSync(path.join(dir,'encrypted-artifacts-manifest.json'),'utf8');assert.ok(!m.includes('test-encrypted-content-not-plaintext'));
 assert.equal(fs.statSync(path.join(dir,'encrypted-artifacts-manifest.json')).mode&0o777,0o600);
 assert.throws(()=>preserve({outDir:dir,getMetadata:async a=>meta(a),getZip:async a=>artifact(a)}),/refusing overwrite/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('failure before final archive never claims full 5-file manifest',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kaito-encrypted-fail-'));
 try{await assert.rejects(()=>preserve({outDir:dir,clock:()=>0,getMetadata:async a=>meta(a),getZip:async a=>{if(a.id===ARTIFACTS[2].id)throw Error('download blocked');return artifact(a)}}),/download blocked/);
 assert.equal(fs.existsSync(path.join(dir,'encrypted-artifacts-manifest.json')),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('candidate artifact stays explicitly unapproved',()=>{const a=ARTIFACTS.find(x=>x.candidate_only);const r=auditEncryptedArchive(artifact(a),a);assert.equal(r.candidate_only,true);});
