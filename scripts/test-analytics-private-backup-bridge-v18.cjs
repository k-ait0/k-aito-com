'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const zlib=require('node:zlib');
const {crc32,ARTIFACTS}=require('../lib/analytics/encrypted-artifact-audit.cjs');
const {parseBackupZip,verifyBackup,stageBackup}=require('../lib/analytics/private-backup-bridge.cjs');
const {parse}=require('./stage-analytics-private-backup-v18.cjs');
const expectedNames=[...ARTIFACTS.map(x=>`encrypted-artifact-${x.id}.zip`),'encrypted-artifacts-manifest.json','ZIP_SHA256SUMS.txt'];
function zip(entries){
 const locals=[],centers=[];let offset=0;
 for(const [name,data,method=0] of entries){
  const n=Buffer.from(name),raw=Buffer.from(data),payload=method===8?zlib.deflateRawSync(raw):raw;
  const local=Buffer.alloc(30),cd=Buffer.alloc(46);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(method,8);
  local.writeUInt32LE(crc32(raw),14);local.writeUInt32LE(payload.length,18);local.writeUInt32LE(raw.length,22);local.writeUInt16LE(n.length,26);
  cd.writeUInt32LE(0x02014b50,0);cd.writeUInt16LE(20,4);cd.writeUInt16LE(20,6);cd.writeUInt16LE(method,10);
  cd.writeUInt32LE(crc32(raw),16);cd.writeUInt32LE(payload.length,20);cd.writeUInt32LE(raw.length,24);cd.writeUInt16LE(n.length,28);cd.writeUInt32LE(offset,42);
  const a=Buffer.concat([local,n,payload]),b=Buffer.concat([cd,n]);locals.push(a);centers.push(b);offset+=a.length;
 }
 const central=Buffer.concat(centers),end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);
 end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,central,end]);
}
const entries=()=>expectedNames.map((n,i)=>[n,Buffer.from('FAKE_ENCRYPTED_FIXTURE_'+i),i%2?8:0]);
function mutant(fn){const e=entries();fn(e);return zip(e);}
test('strict ZIP parser reads exact seven pinned names, store+deflate',()=>{
 const m=parseBackupZip(zip(entries()));assert.equal(m.size,7);assert.equal(m.get(expectedNames[0]).toString(),'FAKE_ENCRYPTED_FIXTURE_0');
});
test('missing backup entry rejected',()=>assert.throws(()=>parseBackupZip(zip(entries().slice(0,6))),/exactly seven/));
test('extra backup entry rejected',()=>assert.throws(()=>parseBackupZip(zip([...entries(),['extra.txt','X']])),/exactly seven/));
test('duplicate pinned filename rejected',()=>assert.throws(()=>parseBackupZip(mutant(e=>e[1][0]=e[0][0])),/duplicate/));
test('malicious path traversal never accepted',()=>assert.throws(()=>parseBackupZip(mutant(e=>e[0][0]='../../evil.zip')),/Unexpected/));
test('wrong naming scheme never accepted',()=>assert.throws(()=>parseBackupZip(mutant(e=>e[1][0]='encrypted-artifact-999.zip')),/Unexpected/));
test('outer ZIP CRC catches altered uncompressed payload',()=>{
 const x=zip(entries());x[30+Buffer.byteLength(expectedNames[0])]^=1;
 assert.throws(()=>parseBackupZip(x),/CRC/);
});
test('central metadata tampering rejected',()=>{
 const x=zip(entries());const end=x.length-22,cd=x.readUInt32LE(end+16);x.writeUInt16LE(99,cd+10);
 assert.throws(()=>parseBackupZip(x),/Unsafe/);
});
test('truncated ZIP rejected',()=>assert.throws(()=>parseBackupZip(zip(entries()).subarray(0,100)),/ZIP/));
test('trailing bytes rejected',()=>assert.throws(()=>parseBackupZip(Buffer.concat([zip(entries()),Buffer.from('extra')])),/end record/));
test('manifest forged without cryptographic records cannot pass',()=>assert.throws(()=>verifyBackup(zip(entries())),/manifest/));
test('out-of-range outer ZIP rejected',()=>assert.throws(()=>parseBackupZip(Buffer.alloc(9*1024*1024)),/byte size/));
test('CLI refuses missing paths and unknown flags',()=>{
 assert.throws(()=>parse(['--inspect-only']),/Usage/);
 assert.throws(()=>parse(['--backup-zip','/tmp/x','--bogus']),/Unknown/);
});
test('CLI parsed inspect-only never requires a secret',()=>{
 assert.deepEqual(parse(['--backup-zip','/tmp/backup.zip','--inspect-only']),{'--backup-zip':'/tmp/backup.zip','--inspect-only':true});
});
test('stageBackup rejects relative input paths',()=>assert.throws(()=>stageBackup({backup_zip:'relative.zip',inspect_only:true}),/absolute/));
test('stageBackup rejects symlink input',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'analytics-v18-'));
 try {const target=path.join(temp,'backup.bin'),link=path.join(temp,'link.bin');fs.writeFileSync(target,'x');fs.symlinkSync(target,link);
 assert.throws(()=>stageBackup({backup_zip:link,inspect_only:true}),/Unsafe/);
 }finally{fs.rmSync(temp,{force:true,recursive:true});}
});