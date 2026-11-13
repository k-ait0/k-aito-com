'use strict';
/**
 * v0.30 — private capture of the Statistics Bureau's mutable 2025-base 3dp
 * reference CSV. This is an acquisition snapshot, NEVER a past publication
 * vintage. No plaintext raw data belongs in GitHub or in stdout.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {TextDecoder}=require('node:util');
const SOURCE_URL='https://www.stat.go.jp/data/cpi/2025/csv/zmi2025aa.csv';
const SOURCE_PAGE='https://www.stat.go.jp/data/cpi/2025/sokyu.html';
const PUBLIC_KEY_PEM_SHA256='bfe78c5a3684d8272a94d778d4d1c49b0ea56c4a9a03fdc5de42bcb437281e28';
const MAX_BYTES=2*1024*1024,MIN_BYTES=1024;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function shape(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<MIN_BYTES||bytes.length>MAX_BYTES)throw Error('Official candidate CSV outside bounded byte range');
 const sig=bytes.subarray(0,128).toString('latin1').trimStart();
 if(/^\s*(?:<!doctype|<html|<\?xml|\{|\[)/i.test(sig)||sig.startsWith('%PDF-')||bytes.subarray(0,4).equals(Buffer.from([0x50,0x4b,0x03,0x04])))throw Error('Content is not CSV bytes');
 if(bytes.includes(0))throw Error('Null bytes in supposed CSV');
 let decoded,encoding;
 for(const kind of ['utf-8','shift_jis']){
  try{const text=new TextDecoder(kind,{fatal:true}).decode(bytes);if(text.includes('202501')&&text.includes('202607')){decoded=text;encoding=kind;break;}}catch{}
 }
 if(!decoded)throw Error('Reference CSV year-month anchors absent or encoding unsupported');
 const lines=decoded.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/);
 if(lines.length<12||!lines.some(x=>x.includes(',')))throw Error('Reference CSV structure not plausible');
 const anchors=['202501','202607','202608','202609'];
 const found=Object.fromEntries(anchors.map(x=>[x,decoded.includes(x)]));
 const recognized=Object.keys(found).filter(x=>found[x]);
 const yearMonthTokens=[...new Set((decoded.match(/\b20(?:2[5-9]|3\d)(?:0[1-9]|1[0-2])\b/g)||[]))];
 return {byte_count:bytes.length,sha256:sha(bytes),detected_text_encoding:encoding,
  lines:lines.length,year_month_anchors_present:recognized,year_month_token_count:yearMonthTokens.length,
  csv_structure_status:'FORMAT_CANDIDATE_REQUIRES_OFFICIAL_COLUMN_SCHEMA_REVIEW',
  headline_index_decoded:false,official_monthly_change_verified:false,
  past_publication_vintage:false,historical_asof_approved:false,public_redistribution_approved:false};
}
function safeFile(file){
 if(typeof file!=='string'||!path.isAbsolute(file))throw Error('Input path must be absolute');
 const st=fs.lstatSync(file);if(st.isSymbolicLink()||!st.isFile()||st.size<MIN_BYTES||st.size>MAX_BYTES)throw Error('Unsafe input file');
 return fs.readFileSync(file);
}
function publicKey(keyPath){
 if(typeof keyPath!=='string'||!path.isAbsolute(keyPath))throw Error('Public key path must be absolute');
 const st=fs.lstatSync(keyPath);if(st.isSymbolicLink()||!st.isFile()||st.size>4096)throw Error('Unsafe public key path');
 const b=fs.readFileSync(keyPath);
 if(sha(b)!==PUBLIC_KEY_PEM_SHA256)throw Error('Pinned public key bytes mismatch');
 const key=crypto.createPublicKey(b);
 if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails?.modulusLength!==3072)throw Error('Expected 3072-bit RSA public key');
 return key;
}
function encrypt(bytes,key,meta,{now=new Date()}={}){
 const at=now instanceof Date&&Number.isFinite(now.getTime())?now.toISOString():null;
 if(!at)throw Error('Invalid acquisition clock');
 const secret=crypto.randomBytes(32),nonce=crypto.randomBytes(12);
 const cipher=crypto.createCipheriv('aes-256-gcm',secret,nonce),payload=Buffer.concat([cipher.update(bytes),cipher.final()]);
 const tag=cipher.getAuthTag();const wrapped=crypto.publicEncrypt({key,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},secret);
 secret.fill(0);
 return {schema:'ANALYTICS_OFFICIAL_CPI_REFERENCE_CAPTURE_V030',source_url:SOURCE_URL,source_landing_page:SOURCE_PAGE,
  capture_timestamp_utc:at,source_origin:'CLAIMED_OFFICIAL_URL_ACQUIRED_VIA_PINNED_CLIENT',
  data_use:'PRIVATE_RESEARCH_ONLY',source_is_mutable:true,record_is_historical_publication_vintage:false,
  raw_market_values_exported_to_repo:false,original_file_sha256:meta.sha256,original_file_bytes:meta.byte_count,
  metadata:meta,encryption:{scheme:'AES_256_GCM_RSA_3072_OAEP_SHA256',key_file_sha256:PUBLIC_KEY_PEM_SHA256,
   nonce_b64:nonce.toString('base64'),tag_b64:tag.toString('base64'),wrapped_key_b64:wrapped.toString('base64'),ciphertext_b64:payload.toString('base64')}};
}
function outputDir(out){
 if(typeof out!=='string'||!path.isAbsolute(out))throw Error('Private output path must be absolute');
 const work=fs.realpathSync(process.cwd()),p=path.resolve(out);
 if(p===work||p.startsWith(work+path.sep)||work.startsWith(p+path.sep))throw Error('Private output cannot overlap checkout');
 fs.mkdirSync(p,{recursive:true,mode:0o700});
 const real=fs.realpathSync(p);
 if(real===work||real.startsWith(work+path.sep)||work.startsWith(real+path.sep))throw Error('Private output resolves inside checkout');
 return real;
}
function capture({input_path,public_key_path,out_dir,now=new Date()}){
 const bytes=safeFile(input_path),meta=shape(bytes),key=publicKey(public_key_path),dir=outputDir(out_dir);
 const packageJson=encrypt(bytes,key,meta,{now});
 const filename='JP_CPI_2025_3DP_REFERENCE_CANDIDATE_'+meta.sha256.slice(0,16)+'.encrypted.json';
 const full=path.join(dir,filename);
 fs.writeFileSync(full,JSON.stringify(packageJson)+'\n',{flag:'wx',mode:0o600});
 return {status:'ENCRYPTED_SOURCE_SNAPSHOT_CAPTURED_NOT_VINTAGE_QA',source_url:SOURCE_URL,
  raw_sha256:meta.sha256,raw_byte_count:meta.byte_count,encoding:meta.detected_text_encoding,
  detected_anchors:meta.year_month_anchors_present,
  encrypted_filename:filename,output_was_overwritten:false,
  official_origin_independently_authenticated:false,original_exposed:false,
  ready_for_asof_rolling:false,complete_vintage_history:false};
}
module.exports={SOURCE_URL,SOURCE_PAGE,PUBLIC_KEY_PEM_SHA256,shape,safeFile,publicKey,encrypt,outputDir,capture};
