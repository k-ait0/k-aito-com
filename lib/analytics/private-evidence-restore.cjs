'use strict';
/** Research only: validate pinned encrypted artifacts and locally restore private source evidence.
 * Never sends plaintext, private keys, or source values to GitHub, the browser, or stdout.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const zlib=require('node:zlib');
const {ARTIFACTS,sha,extractOnlyEncryptedJson,auditEncryptedArchive}=require('./encrypted-artifact-audit.cjs');
const MAX_TAR_BYTES=80*1024*1024, MAX_FILES=5000, MAX_FILE_BYTES=50*1024*1024;
const PINNED_PUBLIC_KEY_SHA='bfe78c5a3684d8272a94d778d4d1c49b0ea56c4a9a03fdc5de42bcb437281e28';
const PINNED_ZIP_SHA={
  13824035258:'eddb9243bd9a205d566cae0b99a2c7b3c2187bf5f9acc3915480ad50ccb291b4',
  13824913073:'48a79cddcb5b7364af6bb35138aadbb8e8c4c27879ba3df2b1c50f15e199db28',
  13825223543:'f6f059776d24587acb106cdba56a4e2046bb37e19fcbad7b9d7c156f988d78ba',
  13825636423:'74d7e4a1ef002f4e8ea4fae0018540faffd3b47d19e3e0421652de14a86830d0',
  13826880503:'c70de121f3f12a174ec6d6b286bf1cb0eef1b66630b112c6110c5d141417aaa2'
};
const DIR_NAMES={13824035258:'bls_cpi_us',13824913073:'estat_jp_cpi',13825223543:'fed_h10_locked_2000',
  13825636423:'world_bank_quarantine',13826880503:'fed_ddp_candidate_QUARANTINE'};
const REPO=fs.realpathSync(path.resolve(__dirname,'../..'));
const isWithin=(p,parent)=>p===parent||p.startsWith(parent+path.sep);
function privateDir(p,{create=false}={}){
  if(typeof p!=='string'||!path.isAbsolute(p))throw Error('A private absolute directory path is required');
  const resolved=path.resolve(p);
  if(isWithin(resolved,REPO)||isWithin(REPO,resolved))throw Error('Private directory overlaps source repository');
  if(!fs.existsSync(resolved)){
    if(!create)throw Error('Private directory missing');
    fs.mkdirSync(resolved,{recursive:true,mode:0o700});
  }
  if(fs.lstatSync(resolved).isSymbolicLink())throw Error('Private directory symlink forbidden');
  const real=fs.realpathSync(resolved);
  if(isWithin(real,REPO)||isWithin(REPO,real)||!fs.statSync(real).isDirectory())throw Error('Unsafe private directory');
  return real;
}
function strictPrivateKey(keyPath){
  if(typeof keyPath!=='string'||!path.isAbsolute(keyPath))throw Error('Private key must have absolute path');
  const real=fs.realpathSync(keyPath),lstat=fs.lstatSync(keyPath);
  if(lstat.isSymbolicLink()||!lstat.isFile()||isWithin(real,REPO))throw Error('Private key must be regular outside code repository');
  if(process.platform!=='win32'&&(lstat.mode&0o077)!==0)throw Error('Restrict RSA private key permissions to owner (chmod 600)');
  if(lstat.size>30000||lstat.size<500)throw Error('Unexpected private key file size');
  return fs.readFileSync(real);
}
function readEncryptedEvidence(directory,expected,{requirePinned=true}={}){
  const p=path.join(directory,'encrypted-artifact-'+expected.id+'.zip');
  if(!fs.existsSync(p)||fs.lstatSync(p).isSymbolicLink()||!fs.statSync(p).isFile()||fs.statSync(p).size>16*1024*1024)throw Error('Missing/unsafe artifact '+expected.id);
  const zipped=fs.readFileSync(p),proof=auditEncryptedArchive(zipped,expected);
  if(requirePinned&&proof.archive_sha256!==PINNED_ZIP_SHA[expected.id])throw Error('Artifact SHA256 differs from reviewed receipt: '+expected.id);
  if(proof.public_key_sha256!==PINNED_PUBLIC_KEY_SHA)throw Error('RSA public key fingerprint differs: '+expected.id);
  const content=extractOnlyEncryptedJson(zipped,expected.file);
  const envelope=JSON.parse(content.toString('utf8'));
  return {envelope,proof};
}
function checkAllEncrypted(directory){
  const root=privateDir(directory);
  const items=ARTIFACTS.map(expected=>{
    const {proof}=readEncryptedEvidence(root,expected);
    return {artifact_id:expected.id,archive_sha256:proof.archive_sha256,archive_bytes:proof.archive_bytes,
      candidate_only:expected.candidate_only===true,ciphertext_verified:true,plaintext_verified:false};
  });
  return {status:'ENCRYPTED_EVIDENCE_VALIDATED_ONLY',artifact_count:items.length,publication_approved:false,
    user_durable_backup_confirmed:false,items};
}
function decryptEnvelope(envelope,privatePem){
  if(envelope.format!=='KAITO_ANALYTICS_ENCRYPTED_RESEARCH_V1'||envelope.encryption!=='AES-256-GCM'||
     envelope.key_transport!=='RSA-OAEP-3072-SHA256'||envelope.public_key_sha256!==PINNED_PUBLIC_KEY_SHA)
    throw Error('Unexpected envelope or RSA key fingerprint');
  const privateKey=crypto.createPrivateKey(privatePem);
  if(privateKey.asymmetricKeyType!=='rsa'||privateKey.asymmetricKeyDetails?.modulusLength!==3072)throw Error('Unexpected RSA key algorithm/size');
  const ciphertext=Buffer.from(envelope.ciphertext_b64,'base64');
  if(sha(ciphertext)!==envelope.ciphertext_sha256||ciphertext.length!==envelope.ciphertext_bytes)throw Error('Ciphertext SHA check failed');
  let key;
  try{
    key=crypto.privateDecrypt({key:privateKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(envelope.wrapped_key_b64,'base64'));
    if(key.length!==32)throw Error('Invalid AES key size');
    const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv_b64,'base64'));
    decipher.setAuthTag(Buffer.from(envelope.tag_b64,'base64'));
    const plaintext=Buffer.concat([decipher.update(ciphertext),decipher.final()]);
    if(sha(plaintext)!==envelope.plaintext_sha256)throw Error('Authenticated original plaintext SHA mismatch');
    return plaintext;
  }finally{if(key)key.fill(0);}
}
function tarString(block,start,length){return block.subarray(start,start+length).toString('utf8').split('\0')[0];}
function tarOctal(block,start,length){
  const raw=tarString(block,start,length).trim();
  if(!/^[0-7]+$/.test(raw))throw Error('Unsupported TAR numeric encoding');
  const n=parseInt(raw,8);if(!Number.isSafeInteger(n))throw Error('Unsafe TAR numeric field');return n;
}
function safeName(name,kind){
  if(typeof name!=='string'||name.includes('\uFFFD')||name.includes('\0')||name.includes('\\')||name.startsWith('/')||/^[A-Za-z]:/.test(name))throw Error('Unsafe TAR path');
  const stripped=name.replace(/^\.\//,'').replace(/\/$/,'');
  if(stripped===''||stripped==='.'){
    if(kind==='dir')return null;
    throw Error('Empty TAR file path');
  }
  const components=stripped.split('/');
  if(components.some(x=>x===''||x==='.'||x==='..'||/\p{Cc}/u.test(x)))throw Error('Unsafe TAR path segment');
  return components.join('/');
}
/** Validate entire gzipped tar BEFORE writing a single plaintext file. */
function inspectTarGz(tgz){
  if(!Buffer.isBuffer(tgz)||tgz.length<20||tgz.length>16*1024*1024)throw Error('Invalid encrypted evidence tar.gz size');
  const tar=zlib.gunzipSync(tgz,{maxOutputLength:MAX_TAR_BYTES});
  const entries=[],paths=new Map();let offset=0,done=false;
  try{
    while(offset+512<=tar.length){
      const h=tar.subarray(offset,offset+512);
      if(h.every(v=>v===0)){
        if(offset+1024>tar.length||!tar.subarray(offset).every(x=>x===0))throw Error('Invalid TAR end blocks');
        done=true;break;
      }
      const check=tarOctal(h,148,8);
      let actual=0;for(let i=0;i<512;i++)actual+=i>=148&&i<156?32:h[i];
      if(check!==actual)throw Error('Invalid TAR header checksum');
      const length=tarOctal(h,124,12),type=String.fromCharCode(h[156]);
      if(!['0','\0','5'].includes(type))throw Error('Refusing link, device or unsupported TAR entry type');
      if(length>MAX_FILE_BYTES)throw Error('Oversized TAR entry');
      const name=tarString(h,0,100),prefix=tarString(h,345,155);
      const full=prefix?prefix+'/'+name:name;
      const normalized=safeName(full,type==='5'?'dir':'file');
      if(type==='5'&&length!==0)throw Error('Directory has TAR payload');
      if(offset+512+Math.ceil(length/512)*512>tar.length)throw Error('Truncated TAR payload');
      if(normalized!==null){
        if(paths.has(normalized))throw Error('Repeated TAR path');
        paths.set(normalized,type==='5'?'dir':'file');
        entries.push({name:normalized,type:type==='5'?'dir':'file',offset:offset+512,size:length});
        if(entries.length>MAX_FILES)throw Error('Excess TAR entries');
      }
      offset+=512+Math.ceil(length/512)*512;
    }
    if(!done)throw Error('Missing TAR trailer');
    for(const [name] of paths){
      const parts=name.split('/');
      for(let i=1;i<parts.length;i++)if(paths.get(parts.slice(0,i).join('/'))==='file')throw Error('File path is a TAR directory parent');
    }
    return {tar,entries,file_count:entries.filter(x=>x.type==='file').length};
  }catch(e){tar.fill(0);throw e;}
}
function writeExtracted(tar,entries,base){
  for(const e of entries){
    const destination=path.join(base,...e.name.split('/'));
    if(e.type==='dir'){fs.mkdirSync(destination,{recursive:true,mode:0o700});continue;}
    fs.mkdirSync(path.dirname(destination),{recursive:true,mode:0o700});
    const mode=0o600;
    fs.writeFileSync(destination,tar.subarray(e.offset,e.offset+e.size),{flag:'wx',mode});
  }
}
function restorePrivateEvidence({artifact_dir,private_key_path,out_dir}={}){
  const root=privateDir(artifact_dir),out=privateDir(out_dir,{create:true});
  if(isWithin(root,out)||isWithin(out,root))throw Error('Source archives and output cannot overlap');
  const final=path.join(out,'analytics_private_evidence_v11');
  if(fs.existsSync(final))throw Error('Refusing to overwrite previous private evidence');
  // Pre-validate all downloaded ciphertext BEFORE reading the private key.
  const archive=ARTIFACTS.map(a=>({expected:a,...readEncryptedEvidence(root,a)}));
  const pem=strictPrivateKey(private_key_path);
  const stage=fs.mkdtempSync(path.join(out,'.analytics_restore_staging_'));
  let success=false;
  try{
    fs.chmodSync(stage,0o700);
    const results=[];
    for(const item of archive){
      const tgz=decryptEnvelope(item.envelope,pem);
      const parsed=inspectTarGz(tgz),subdir=path.join(stage,DIR_NAMES[item.expected.id]);
      try{
        fs.mkdirSync(subdir,{mode:0o700});
        writeExtracted(parsed.tar,parsed.entries,subdir);
        results.push({artifact_id:item.expected.id,source_ciphertext_sha256:item.proof.ciphertext_sha256,
          decrypted_tgz_sha256:item.envelope.plaintext_sha256,extracted_files:parsed.file_count,
          encrypted_archive_sha256:item.proof.archive_sha256,quarantine:item.expected.candidate_only===true||item.expected.id===13825636423});
      }finally{parsed.tar.fill(0);tgz.fill(0);}
    }
    const report={schema:'ANALYTICS_PRIVATE_EVIDENCE_RESTORED_V11',status:'OFFLINE_DECRYPTION_AND_TAR_VALIDATION_COMPLETE',
      private_only:true,publication_approved:false,source_rights_approved:false,source_data_ingested_into_analytics:false,
      fed_ddp_candidate_adr_approved:false,shiller_raw_not_in_these_five_artifacts:true,
      note:'Extracted evidence is private and not yet a vetted v0.10 handoff. Shiller raw and manifest require separate provenance. Do not commit to Git.',results};
    fs.writeFileSync(path.join(stage,'PRIVATE_RESTORE_REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
    fs.renameSync(stage,final);success=true;
    return {status:report.status,artifact_count:results.length,report_path:path.join(final,'PRIVATE_RESTORE_REPORT.json'),
      output_dir:final,publication_approved:false,actual_source_values_qa_complete:false};
  }finally{pem.fill(0);if(!success)fs.rmSync(stage,{recursive:true,force:true});}
}
module.exports={PINNED_ZIP_SHA,PINNED_PUBLIC_KEY_SHA,DIR_NAMES,privateDir,strictPrivateKey,checkAllEncrypted,
  decryptEnvelope,inspectTarGz,writeExtracted,restorePrivateEvidence};
