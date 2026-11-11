'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const zlib=require('node:zlib');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {PINNED_PUBLIC_KEY_SHA,checkAllEncrypted,decryptEnvelope,inspectTarGz,
  privateDir,strictPrivateKey,writeExtracted,restorePrivateEvidence}=require('../lib/analytics/private-evidence-restore.cjs');
const {options,main}=require('./restore-analytics-private-evidence.cjs');
function tarHeader(name,size=0,type='0'){
 const h=Buffer.alloc(512);
 h.write(name,0,Math.min(Buffer.byteLength(name),100),'utf8');
 const put=(n,off,width)=>h.write(n.toString(8).padStart(width-1,'0')+'\0',off,'ascii');
 put(type==='5'?0:0o600,100,8);put(0,108,8);put(0,116,8);put(size,124,12);put(0,136,12);
 h.fill(32,148,156);h[156]=type.charCodeAt(0);
 h.write('ustar\0',257,'ascii');h.write('00',263,'ascii');
 let sum=0;for(const byte of h)sum+=byte;
 put(sum,148,8);return h;
}
function tarGz(entries){
 const blocks=[];
 for(const e of entries){
  const content=Buffer.from(e.content||'');blocks.push(tarHeader(e.name,content.length,e.type||'0'),content);
  if(content.length%512)blocks.push(Buffer.alloc(512-content.length%512));
 }
 blocks.push(Buffer.alloc(1024));return zlib.gzipSync(Buffer.concat(blocks));
}
const {privateKey:syntheticPrivateKey,publicKey:syntheticPublicKey}=crypto.generateKeyPairSync('rsa',{
 modulusLength:3072,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}
});
function syntheticEnvelope(tgz){
 const aes=crypto.randomBytes(32),iv=crypto.randomBytes(12);
 const cipher=crypto.createCipheriv('aes-256-gcm',aes,iv);
 const bytes=Buffer.concat([cipher.update(tgz),cipher.final()]);
 const wrapped=crypto.publicEncrypt({key:syntheticPublicKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},aes);
 aes.fill(0);
 return {format:'KAITO_ANALYTICS_ENCRYPTED_RESEARCH_V1',encryption:'AES-256-GCM',key_transport:'RSA-OAEP-3072-SHA256',
  public_key_sha256:PINNED_PUBLIC_KEY_SHA,plaintext_sha256:crypto.createHash('sha256').update(tgz).digest('hex'),
  ciphertext_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),ciphertext_bytes:bytes.length,
  ciphertext_b64:bytes.toString('base64'),iv_b64:iv.toString('base64'),tag_b64:cipher.getAuthTag().toString('base64'),
  wrapped_key_b64:wrapped.toString('base64')};
}
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'analytics-v11-test-'));
test('CLI verify-only requires no private key',()=>assert.deepEqual(options(['--artifact-dir','/tmp/arch','--verify-only']),{'--artifact-dir':'/tmp/arch','--verify-only':true}));
test('CLI blocks duplicate flags and missing values',()=>{assert.throws(()=>options(['--artifact-dir','/tmp','--artifact-dir','/tmp']),/duplicate/);assert.throws(()=>options(['--artifact-dir']),/Missing value/);});
test('CLI never accepts key in verify-only mode',()=>assert.throws(()=>options(['--artifact-dir','/a','--private-key','/b','--verify-only']),/cannot read a key/));
test('CLI restore needs explicit key/output',()=>assert.throws(()=>options(['--artifact-dir','/tmp']),/requires/));
test('CLI restore does not accept unknown options',()=>assert.throws(()=>options(['--artifact-dir','/a','--override']),/Invalid/));
test('private directory must be absolute and outside checkout',()=>{assert.throws(()=>privateDir('relative'),/absolute/);assert.throws(()=>privateDir(path.resolve(__dirname,'..')),/overlaps/);});
test('verify-only missing artifact directory never fabricates success',()=>{const d=temp();try{assert.throws(()=>checkAllEncrypted(d),/Missing/);}finally{fs.rmSync(d,{force:true,recursive:true});}});
test('private key must not be a world-readable file',()=>{const d=temp();try{const p=path.join(d,'key.pem');fs.writeFileSync(p,syntheticPrivateKey,{mode:0o644});fs.chmodSync(p,0o644);if(process.platform!=='win32')assert.throws(()=>strictPrivateKey(p),/chmod 600/);}finally{fs.rmSync(d,{force:true,recursive:true});}});
test('private key accepts owner-only PEM from outside checkout',()=>{const d=temp();try{const p=path.join(d,'key.pem');fs.writeFileSync(p,syntheticPrivateKey,{mode:0o600});fs.chmodSync(p,0o600);assert.ok(strictPrivateKey(p).length>1000);}finally{fs.rmSync(d,{force:true,recursive:true});}});
test('AES-GCM + RSA-OAEP unseals synthetic ciphertext and verifies plaintext SHA',()=>{const b=tarGz([{name:'./source_RAW.csv',content:'month,value\n2020-01,1\n'}]);const dec=decryptEnvelope(syntheticEnvelope(b),syntheticPrivateKey);assert.deepEqual(dec,b);});
test('AES-GCM rejects wrong RSA private key',()=>{const b=tarGz([{name:'./a',content:'x'}]);const wrong=crypto.generateKeyPairSync('rsa',{modulusLength:3072});assert.throws(()=>decryptEnvelope(syntheticEnvelope(b),wrong.privateKey.export({format:'pem',type:'pkcs8'})),/oaep|decrypt|error|padding/i);});
test('AES-GCM rejects tampered ciphertext digest',()=>{const e=syntheticEnvelope(tarGz([{name:'./a',content:'x'}]));e.ciphertext_sha256='0'.repeat(64);assert.throws(()=>decryptEnvelope(e,syntheticPrivateKey),/SHA/);});
test('AES-GCM rejects tampered authentication tag',()=>{const e=syntheticEnvelope(tarGz([{name:'./a',content:'x'}]));e.tag_b64=Buffer.alloc(16).toString('base64');assert.throws(()=>decryptEnvelope(e,syntheticPrivateKey));});
test('AES-GCM refuses mismatched plain hash even with correct tag',()=>{const e=syntheticEnvelope(tarGz([{name:'./a',content:'x'}]));e.plaintext_sha256='0'.repeat(64);assert.throws(()=>decryptEnvelope(e,syntheticPrivateKey),/plaintext SHA/);});
test('reject unapproved envelope format',()=>{const e=syntheticEnvelope(tarGz([{name:'./a',content:'x'}]));e.format='OTHER';assert.throws(()=>decryptEnvelope(e,syntheticPrivateKey),/Unexpected envelope/);});
test('reject non-RSA or incorrect key size',()=>{const e=syntheticEnvelope(tarGz([{name:'./a',content:'x'}]));const p=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey;assert.throws(()=>decryptEnvelope(e,p.export({format:'pem',type:'pkcs8'})),/RSA key/);});
test('TAR parser accepts GNU-like directories and ordinary files',()=>{const gz=tarGz([{name:'./',type:'5'},{name:'./research/',type:'5'},{name:'./research/source_RAW.csv',content:'a,b\n1,2\n'}]);const x=inspectTarGz(gz);assert.deepEqual(x.entries.map(e=>e.name),['research','research/source_RAW.csv']);assert.equal(x.file_count,1);x.tar.fill(0);});
test('TAR parser accepts source filename without explicit parent directory',()=>{const x=inspectTarGz(tarGz([{name:'./abc/source_RAW.html',content:'data'}]));assert.equal(x.entries.length,1);x.tar.fill(0);});
test('TAR rejects traversal paths',()=>{for(const name of ['../x','./a/../../x','/etc/passwd','C:/Windows/system.ini','x\\y'])assert.throws(()=>inspectTarGz(tarGz([{name,content:'hello'}])),/Unsafe TAR/);});
test('TAR rejects symbolic links and special file types',()=>{for(const type of ['2','1','3','4','6','7','x'])assert.throws(()=>inspectTarGz(tarGz([{name:'./a',type}])),/Refusing link/);});
test('TAR rejects duplicate paths',()=>assert.throws(()=>inspectTarGz(tarGz([{name:'./a',content:'x'},{name:'./a',content:'y'}])),/Repeated TAR/));
test('TAR rejects a file that is also parent directory',()=>assert.throws(()=>inspectTarGz(tarGz([{name:'./a',content:'x'},{name:'./a/b',content:'y'}])),/directory parent/));
test('TAR rejects corrupted header checksum',()=>{const raw=zlib.gunzipSync(tarGz([{name:'./a',content:'x'}]));raw[0]^=1;assert.throws(()=>inspectTarGz(zlib.gzipSync(raw)),/checksum/);});
test('TAR rejects incomplete end blocks',()=>{const raw=zlib.gunzipSync(tarGz([{name:'./a',content:'x'}]));assert.throws(()=>inspectTarGz(zlib.gzipSync(raw.subarray(0,raw.length-512))),/end blocks/);});
test('TAR refuses malformed gzip and arbitrary payload',()=>assert.throws(()=>inspectTarGz(Buffer.from('not gzip')),/Invalid encrypted evidence tar.gz/));
test('TAR forbids >50 MB payload without allowing extraction',()=>{const h=tarHeader('./huge',51*1024*1024);const bad=zlib.gzipSync(Buffer.concat([h,Buffer.alloc(1024)]));assert.throws(()=>inspectTarGz(bad),/Oversized TAR/);});
test('restore cannot create output if source archives are missing, even with a valid private key',()=>{
 const d=temp(),a=path.join(d,'a'),o=path.join(d,'out'),p=path.join(d,'key.pem');fs.mkdirSync(a);fs.writeFileSync(p,syntheticPrivateKey,{mode:0o600});fs.chmodSync(p,0o600);
 try{assert.throws(()=>restorePrivateEvidence({artifact_dir:a,private_key_path:p,out_dir:o}),/Missing\/unsafe artifact/);assert.equal(fs.existsSync(path.join(o,'analytics_private_evidence_v11')),false);}finally{fs.rmSync(d,{recursive:true,force:true});}
});
test('restore refuses to use the same directory as ciphertext input/output',()=>{const d=temp();try{assert.throws(()=>restorePrivateEvidence({artifact_dir:d,private_key_path:'/no/key',out_dir:d}),/overlap/);}finally{fs.rmSync(d,{recursive:true,force:true});}});
test('restore must be explicitly invoked and never auto-opens network',()=>{assert.equal(typeof main,'function');assert.ok(!('fetch' in require('../lib/analytics/private-evidence-restore.cjs')));});

test('validated tar extracts private file and enforces restricted file permission',()=>{
 const d=temp();try{const p=inspectTarGz(tarGz([{name:'./x/y.csv',content:'secret,bytes\n'}]));
 writeExtracted(p.tar,p.entries,d);const f=path.join(d,'x/y.csv');assert.equal(fs.readFileSync(f,'utf8'),'secret,bytes\n');
 if(process.platform!=='win32')assert.equal(fs.statSync(f).mode&0o077,0);p.tar.fill(0);
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});
test('validated tar does not overwrite an existing file',()=>{const d=temp();try{
 const p=inspectTarGz(tarGz([{name:'./x.txt',content:'first'}]));
 fs.writeFileSync(path.join(d,'x.txt'),'EXISTING');
 assert.throws(()=>writeExtracted(p.tar,p.entries,d),/EEXIST/);
 assert.equal(fs.readFileSync(path.join(d,'x.txt'),'utf8'),'EXISTING');p.tar.fill(0);
 }finally{fs.rmSync(d,{recursive:true,force:true});}});
test('invalid Unicode TAR names are rejected',()=>{const p=tarGz([{name:'./bad_\uFFFD.txt',content:'x'}]);assert.throws(()=>inspectTarGz(p),/Unsafe TAR/)});
test('private backup output folder cannot reside inside checkout',()=>{const d=path.resolve(__dirname,'../priv-recovered');assert.throws(()=>privateDir(d,{create:true}),/overlaps/);});
