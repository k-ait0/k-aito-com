'use strict';
/**
 * v0.18: offline, ciphertext-only transfer from the owner backup ZIP to the
 * v0.11 encrypted-artifact directory. No key access, decryption or networking.
 * Fail closed on ZIP entries, per-archive pinned digests and public key pins.
 */
const fs=require('node:fs');
const path=require('node:path');
const {inflateRawSync}=require('node:zlib');
const {
  ARTIFACTS,sha,crc32,auditEncryptedArchive
}=require('./encrypted-artifact-audit.cjs');
const {
  PINNED_ZIP_SHA,PINNED_PUBLIC_KEY_SHA,privateDir
}=require('./private-evidence-restore.cjs');
const MAX_OUTER=8*1024*1024,MAX_ENTRY=4*1024*1024,MAX_DECODED=8*1024*1024;
const expectedNames=new Set([
  ...ARTIFACTS.map(a=>`encrypted-artifact-${a.id}.zip`),
  'encrypted-artifacts-manifest.json','ZIP_SHA256SUMS.txt'
]);
function getUInt16(b,n){if(n<0||n+2>b.length)throw Error('Truncated backup ZIP');return b.readUInt16LE(n)}
function getUInt32(b,n){if(n<0||n+4>b.length)throw Error('Truncated backup ZIP');return b.readUInt32LE(n)}
function parseBackupZip(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<22||bytes.length>MAX_OUTER)throw Error('Invalid outer backup ZIP byte size');
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
  if(getUInt32(bytes,i)===0x06054b50){end=i;break;}
 }
 if(end<0||end+22+getUInt16(bytes,end+20)!==bytes.length)throw Error('Invalid outer ZIP end record');
 if(getUInt16(bytes,end+4)!==0||getUInt16(bytes,end+6)!==0)throw Error('Split archives not allowed');
 const count=getUInt16(bytes,end+10),diskCount=getUInt16(bytes,end+8),cdSize=getUInt32(bytes,end+12),cdAt=getUInt32(bytes,end+16);
 if(count!==expectedNames.size||diskCount!==count||cdAt+cdSize!==end)throw Error('Outer ZIP must have exactly seven pinned entries');
 const files=new Map(),ranges=[];let cursor=cdAt,total=0;
 for(let i=0;i<count;i++){
  if(getUInt32(bytes,cursor)!==0x02014b50||cursor+46>end)throw Error('Broken central ZIP entry');
  const flags=getUInt16(bytes,cursor+8),method=getUInt16(bytes,cursor+10),crc=getUInt32(bytes,cursor+16),compressed=getUInt32(bytes,cursor+20),uncompressed=getUInt32(bytes,cursor+24);
  const len=getUInt16(bytes,cursor+28),extra=getUInt16(bytes,cursor+30),comment=getUInt16(bytes,cursor+32),offset=getUInt32(bytes,cursor+42);
  if(flags&~2||![0,8].includes(method)||compressed>MAX_ENTRY||uncompressed>MAX_ENTRY||cursor+46+len+extra+comment>end)throw Error('Unsafe outer ZIP entry');
  const name=bytes.subarray(cursor+46,cursor+46+len).toString('utf8');
  if(!expectedNames.has(name)||files.has(name))throw Error('Unexpected or duplicate outer ZIP name');
  if(getUInt32(bytes,offset)!==0x04034b50)throw Error('Missing local ZIP header');
  if(getUInt16(bytes,offset+6)!==flags||getUInt16(bytes,offset+8)!==method)throw Error('ZIP local/central metadata drift');
  const localLen=getUInt16(bytes,offset+26),localExtra=getUInt16(bytes,offset+28);
  if(bytes.subarray(offset+30,offset+30+localLen).toString('utf8')!==name)throw Error('Local ZIP filename mismatch');
  const payloadStart=offset+30+localLen+localExtra,payloadEnd=payloadStart+compressed;
  if(payloadEnd>cdAt||payloadStart<offset+30||offset>=cdAt)throw Error('Out-of-range ZIP payload');
  ranges.push([offset,payloadEnd]);
  const packed=bytes.subarray(payloadStart,payloadEnd);
  const content=method===8?inflateRawSync(packed,{maxOutputLength:MAX_ENTRY}):packed;
  if(content.length!==uncompressed||crc32(content)!==crc)throw Error('Outer ZIP CRC/size mismatch '+name);
  total+=content.length;if(total>MAX_DECODED)throw Error('Too much decoded outer ZIP content');
  files.set(name,Buffer.from(content));
  cursor+=46+len+extra+comment;
 }
 if(cursor!==end)throw Error('Trailing central ZIP data');
 ranges.sort((a,b)=>a[0]-b[0]);
 for(let i=1;i<ranges.length;i++)if(ranges[i][0]<ranges[i-1][1])throw Error('Overlapping ZIP local entries');
 if(ranges.at(-1)?.[1]>cdAt)throw Error('ZIP local entries overlap directory');
 return files;
}
function verifyBackup(zip){
 const files=parseBackupZip(zip);
 let manifest;
 try{manifest=JSON.parse(files.get('encrypted-artifacts-manifest.json').toString('utf8'));}
 catch(e){throw Error('Invalid backup manifest JSON');}
 if(manifest.schema!=='KAITO_ANALYTICS_ENCRYPTED_BACKUP_V1'||manifest.artifact_count!==5||!Array.isArray(manifest.artifacts)||manifest.artifacts.length!==5||manifest.plaintext_decrypted!==false)
   throw Error('Unrecognized or incomplete backup manifest');
 const checksums=files.get('ZIP_SHA256SUMS.txt').toString('utf8');
 const listed=new Map();
 for(const line of checksums.trimEnd().split('\n')){
   const match=/^([a-f0-9]{64})  (encrypted-artifact-\d+\.zip)$/.exec(line);
   if(!match||listed.has(match[2]))throw Error('Invalid SHA256SUMS entries');
   listed.set(match[2],match[1]);
 }
 if(listed.size!==ARTIFACTS.length)throw Error('Incomplete SHA256SUMS');
 const verified=[];
 for(const a of ARTIFACTS){
   const name=`encrypted-artifact-${a.id}.zip`,bytes=files.get(name),record=manifest.artifacts.find(x=>x.artifact_id===a.id);
   if(!record||record.name!==a.name||listed.get(name)!==PINNED_ZIP_SHA[a.id]||sha(bytes)!==PINNED_ZIP_SHA[a.id]||record.archive_sha256!==PINNED_ZIP_SHA[a.id]||record.archive_bytes!==bytes.length)
     throw Error('Backup identity or pinned SHA mismatch for '+a.id);
   const audit=auditEncryptedArchive(bytes,a);
   if(audit.public_key_sha256!==PINNED_PUBLIC_KEY_SHA||audit.ciphertext_sha256!==record.ciphertext_sha256)
     throw Error('Backup RSA fingerprint or ciphertext mismatch '+a.id);
   verified.push({id:a.id,name:a.name,sha256:audit.archive_sha256,bytes:audit.archive_bytes,encrypted_only:true,quarantine:a.candidate_only===true||a.id===13825636423});
 }
 return {schema:'ANALYTICS_PRIVATE_BACKUP_BRIDGE_V018',status:'CIPHERTEXT_ONLY_VERIFIED',
  file_count:verified.length,publication_approved:false,plaintext_decrypted:false,
  raw_market_data_QA:false,owner_durable_backup_verified:false,verified,files};
}
function stageBackup({backup_zip,out_dir,inspect_only=false}={}){
 if(typeof backup_zip!=='string'||!path.isAbsolute(backup_zip))throw Error('Backup ZIP must be an absolute path');
 const s=fs.lstatSync(backup_zip);if(!s.isFile()||s.isSymbolicLink()||s.size>MAX_OUTER)throw Error('Unsafe backup ZIP file');
 const report=verifyBackup(fs.readFileSync(backup_zip));
 if(inspect_only){const {files,...safe}=report;return safe;}
 if(typeof out_dir!=='string'||!path.isAbsolute(out_dir))throw Error('Output directory must be absolute');
 const root=privateDir(out_dir,{create:true});
 const src=fs.realpathSync(backup_zip);
 if(src===root||src.startsWith(root+path.sep)||root.startsWith(path.dirname(src)+path.sep)&&path.dirname(src)===root)throw Error('Backup source and output overlap');
 const final=path.join(root,'analytics_encrypted_artifacts_v18');
 if(fs.existsSync(final))throw Error('Encrypted staging directory already exists; refusing overwrite');
 const tmp=fs.mkdtempSync(path.join(root,'.analytics_ciphertext_stage_'));
 let complete=false;
 try{
  fs.chmodSync(tmp,0o700);
  for(const a of ARTIFACTS){const name=`encrypted-artifact-${a.id}.zip`;fs.writeFileSync(path.join(tmp,name),report.files.get(name),{flag:'wx',mode:0o600});}
  const {files,...safe}=report;
  fs.writeFileSync(path.join(tmp,'BRIDGE_V018_RECEIPT.json'),JSON.stringify(safe,null,2)+'\n',{flag:'wx',mode:0o600});
  fs.renameSync(tmp,final);complete=true;
  return {...safe,encrypted_artifact_directory:final};
 }finally{if(!complete)fs.rmSync(tmp,{recursive:true,force:true});}
}
module.exports={parseBackupZip,verifyBackup,stageBackup};