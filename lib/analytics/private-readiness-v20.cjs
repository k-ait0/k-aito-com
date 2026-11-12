'use strict';
/** Single offline readiness check. Does not decrypt, restore, or export private market observations. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {verifyBackup}=require('./private-backup-bridge.cjs');
const {strictPrivateKey,PINNED_PUBLIC_KEY_SHA}=require('./private-evidence-restore.cjs');
const R=require('./private-shiller-recovery.cjs');
const {deriveShillerApproxUsdReturns}=require('./private-shiller-raw-reader.cjs');
const PINNED_PUBLIC_KEY=`-----BEGIN PUBLIC KEY-----\nMIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA3z1Zn8Z23RIg28VQ69v/\ngRtRunzgM7bf96DVQLPqR1aMEP9XHq66PUai93nurLvWAEOOwLacjs75L92TcEw8\n94pF4BgG6kd1Av+YFlWGP1s7UboMy9Yrw2vBdcgPnOMhcfCaXtQmijFff9PYIr5p\npiNYAfmehJpEbwTP3KfhS/lqmLTeip/03GTZUtztUGBr6Hx3jjJr2fsN1D1Lk0DF\nQid9LLyY87zEnncO0KFNWFyA8llS907T/zHbJu+SHcJaFfSZzEi7C3r62HvnMqQp\nV5Zah4C5jQNBRSivFT5pCNzxN2D/gkIK8uS/fuP12YhiVsPCgxpETwBkvsETTY3I\nYf1Fd/E83fL8+CjDrt7SxKif7cMLlMD6ps2lb1Sf/WUCT56FaD0WlsRreZeq/4og\ncH0wPzMPh+vWJfoXH/QlAcB2JbpyhIBAU8akqHZZz65t6Z/Xb2wymozOvY02+94D\nMIFn/uydxkxJgZJCHgUMnDYEjLxcb3OROzZ659cElA4zAgMBAAE=\n-----END PUBLIC KEY-----\n`;
const h=b=>crypto.createHash('sha256').update(b).digest('hex');
if(h(Buffer.from(PINNED_PUBLIC_KEY))!==PINNED_PUBLIC_KEY_SHA)throw Error('Bundled public key pin drift');
function safeAbsoluteRegular(p,description,cap){
 if(typeof p!=='string'||!path.isAbsolute(p))throw Error(description+' requires absolute path');
 const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size<=0||s.size>cap)throw Error('Unsafe '+description);
 const root=fs.realpathSync(path.resolve(__dirname,'../..'));
 const real=fs.realpathSync(p);
 if(real===root||real.startsWith(root+path.sep))throw Error(description+' cannot be inside repository');
 return fs.readFileSync(real);
}
function verifyPrivateKeyIdentity(filename,{publicPem=PINNED_PUBLIC_KEY}={}){
 const expected=crypto.createPublicKey(publicPem).export({type:'spki',format:'der'});
 let pem=strictPrivateKey(filename);
 try{
  const key=crypto.createPrivateKey(pem);
  if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails?.modulusLength!==3072)throw Error('RSA private key is not RSA-3072');
  const actual=crypto.createPublicKey(key).export({type:'spki',format:'der'});
  if(!crypto.timingSafeEqual(expected,actual))throw Error('Private key does not match pinned encrypted archives');
  return {status:'PINNED_RSA_KEY_PAIR_MATCH',matches:true,private_key_exported:false,plaintext_decrypted:false};
 }finally{pem.fill(0);}
}
function inspectReadiness({backup_zip,shiller_file,search_dir,private_key,allowTestKeyOverride=false,testPublicPem}={}){
 if(!backup_zip)throw Error('--backup-zip must be specified');
 if(shiller_file&&search_dir)throw Error('Choose shiller-file or search-dir, not both');
 const zip=safeAbsoluteRegular(backup_zip,'encrypted backup ZIP',8*1024*1024);
 const report=verifyBackup(zip);
 const out={schema:'ANALYTICS_PRIVATE_EVIDENCE_READINESS_V020',status:'BLOCKED_PRIVATE_INPUTS',
  ciphertext_verified:true,encrypted_artifacts_verified:report.file_count,
  key_pair_match_verified:false,legacy_shiller_exact_verified:false,
  not_decrypted:true,real_data_qa_complete:false,simulation_executed:false,
  publication_approved:false,owner_durable_backup_verified:false,blockers:[]};
 // Explicitly overwrite no data and never save a key, raw rows, or path in the report.
 if(private_key){
  try{
   verifyPrivateKeyIdentity(private_key,{publicPem:allowTestKeyOverride?testPublicPem:PINNED_PUBLIC_KEY});
   out.key_pair_match_verified=true;
  }catch(e){out.blockers.push('RSA_KEY_MISMATCH_OR_UNREADABLE');}
 }else out.blockers.push('RSA_PRIVATE_KEY_NOT_CHECKED');
 if(shiller_file){
  try{
   const data=safeAbsoluteRegular(shiller_file,'original Shiller CSV',1024*1024);
   if(h(data)!==R.PINNED_SHILLER_SHA256)throw Error('Pinned original SHA256 mismatch');
   deriveShillerApproxUsdReturns(data,522);
   out.legacy_shiller_exact_verified=true;
  }catch(e){out.blockers.push('LEGACY_SHILLER_BYTES_NOT_PINNED');}
 }else if(search_dir){
  try{
   const scan=R.locateExistingOriginal(search_dir);
   out.legacy_shiller_exact_verified=scan.matches.length>0;
   out.shiller_files_checked=scan.files_scanned;
   if(!out.legacy_shiller_exact_verified)out.blockers.push('LEGACY_SHILLER_ORIGINAL_NOT_FOUND');
  }catch(e){out.blockers.push('LEGACY_SHILLER_SCAN_FAILED');}
 }else out.blockers.push('LEGACY_SHILLER_ORIGINAL_NOT_CHECKED');
 if(out.key_pair_match_verified&&out.legacy_shiller_exact_verified){out.status='READY_FOR_LOCAL_DECRYPTION_AND_SOURCE_QA';}
 out.next_step=out.status==='READY_FOR_LOCAL_DECRYPTION_AND_SOURCE_QA'?
  'Run existing v0.18 stage, v0.11 restore, v0.12 handoff and v0.10 real QA locally with separate provenance manifest and registry':
  'Recover the pinned Shiller bytes and match the RSA private key; retain verified ciphertext and key separately';
 return out;
}
module.exports={PINNED_PUBLIC_KEY,verifyPrivateKeyIdentity,inspectReadiness};
