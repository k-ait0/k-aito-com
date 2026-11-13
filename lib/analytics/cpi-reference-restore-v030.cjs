'use strict';
/** Offline restore for v0.30 official CPI reference snapshot, user-key-only. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('./cpi-reference-capture-v030.cjs');
const SPKI_SHA256='98f6dcdcd31b185d6bfebcaab67c8203b67e76bc54eebdc5f2d120e4300a105c';
// Verified GitHub Actions run 43427925063, never a vintage or column-schema approval.
const OBSERVED_RAW_SHA256='c5893ac45a0f124277d92c2ec286451be15ce0b7d5bbc84152e4f4226cedbce2';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const topKeys=['schema','source_url','source_landing_page','capture_timestamp_utc','source_origin','data_use','source_is_mutable','record_is_historical_publication_vintage','raw_market_values_exported_to_repo','original_file_sha256','original_file_bytes','metadata','encryption'];
const encKeys=['scheme','key_file_sha256','nonce_b64','tag_b64','wrapped_key_b64','ciphertext_b64'];
function keys(o,allowed){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).length!==allowed.length||allowed.some(k=>!Object.hasOwn(o,k)))throw Error('Unexpected or missing encrypted snapshot fields');}
function b64(s,expected){
 if(typeof s!=='string'||s.length<4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s))throw Error('Noncanonical encrypted base64');
 const b=Buffer.from(s,'base64');if(b.length!==expected||b.toString('base64')!==s)throw Error('Encrypted field length/base64 mismatch');return b;
}
function envelope(doc){
 keys(doc,topKeys);keys(doc.encryption,encKeys);
 if(doc.schema!=='ANALYTICS_OFFICIAL_CPI_REFERENCE_CAPTURE_V030'||doc.source_url!==C.SOURCE_URL||doc.source_landing_page!==C.SOURCE_PAGE||doc.data_use!=='PRIVATE_RESEARCH_ONLY'||doc.source_is_mutable!==true||doc.record_is_historical_publication_vintage!==false||doc.raw_market_values_exported_to_repo!==false||doc.source_origin!=='CLAIMED_OFFICIAL_URL_ACQUIRED_VIA_PINNED_CLIENT')throw Error('Source or status contract violation');
 if(doc.encryption.scheme!=='AES_256_GCM_RSA_3072_OAEP_SHA256'||doc.encryption.key_file_sha256!==C.PUBLIC_KEY_PEM_SHA256)throw Error('Encryption/key pin violation');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(doc.capture_timestamp_utc)||!Number.isFinite(Date.parse(doc.capture_timestamp_utc)))throw Error('Invalid acquisition clock');
 if(!/^([a-f0-9]{64})$/.test(doc.original_file_sha256)||!Number.isInteger(doc.original_file_bytes)||doc.original_file_bytes<1024||doc.original_file_bytes>2*1024*1024)throw Error('Invalid source digest/size');
 if(!doc.metadata||typeof doc.metadata!=='object'||doc.metadata.sha256!==doc.original_file_sha256||doc.metadata.byte_count!==doc.original_file_bytes||doc.metadata.past_publication_vintage!==false||doc.metadata.historical_asof_approved!==false||doc.metadata.headline_index_decoded!==false||doc.metadata.official_monthly_change_verified!==false||doc.metadata.public_redistribution_approved!==false)throw Error('Inconsistent candidate metadata');
 return {
  nonce:b64(doc.encryption.nonce_b64,12),tag:b64(doc.encryption.tag_b64,16),
  wrapped:b64(doc.encryption.wrapped_key_b64,384),ciphertext:b64(doc.encryption.ciphertext_b64,doc.original_file_bytes)};
}
function readPrivate(p){
 if(typeof p!=='string'||!path.isAbsolute(p))throw Error('Private key path must be absolute');
 const st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink()||st.size<100||st.size>10000)throw Error('Unsafe local private key file');
 let k;try{k=crypto.createPrivateKey(fs.readFileSync(p));}catch{throw Error('Private key cannot be loaded (use a local unencrypted PEM key)');}
 if(k.asymmetricKeyType!=='rsa'||k.asymmetricKeyDetails?.modulusLength!==3072)throw Error('Unexpected private key algorithm');
 if(sha(crypto.createPublicKey(k).export({type:'spki',format:'der'}))!==SPKI_SHA256)throw Error('Private key does not match locked public key');
 return k;
}
function decrypt(doc,key){
 const chunks=envelope(doc);
 let secret;try{secret=crypto.privateDecrypt({key,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},chunks.wrapped);}catch{throw Error('RSA authentication failed');}
 if(secret.length!==32)throw Error('Invalid unwrapped key');
 let plaintext;
 try{const d=crypto.createDecipheriv('aes-256-gcm',secret,chunks.nonce);d.setAuthTag(chunks.tag);plaintext=Buffer.concat([d.update(chunks.ciphertext),d.final()]);}
 catch{throw Error('Ciphertext authenticated decryption failed');}
 finally{secret.fill(0);}
 const meta=C.shape(plaintext);
 if(meta.sha256!==doc.original_file_sha256||meta.byte_count!==doc.original_file_bytes||meta.detected_text_encoding!==doc.metadata.detected_text_encoding||meta.lines!==doc.metadata.lines)throw Error('Authenticated plaintext does not satisfy metadata digest/schema');
 return {plaintext,meta};
}
function privateFile(p,maximum=600000){
 if(typeof p!=='string'||!path.isAbsolute(p))throw Error('Encrypted package path must be absolute');
 const st=fs.lstatSync(p);if(st.isSymbolicLink()||!st.isFile()||st.size<500||st.size>maximum)throw Error('Unsafe encrypted package');
 return fs.readFileSync(p,'utf8');
}
function restore({encrypted_json,private_key_path,out_dir}){
 const doc=JSON.parse(privateFile(encrypted_json));
 if(doc.original_file_sha256!==OBSERVED_RAW_SHA256)throw Error('Official acquisition snapshot SHA pin mismatch');
 const key=readPrivate(private_key_path);const {plaintext,meta}=decrypt(doc,key);
 const dir=C.outputDir(out_dir),name=`zmi2025aa_OFFICIAL_CANDIDATE_${meta.sha256.slice(0,16)}.csv`;
 fs.writeFileSync(path.join(dir,name),plaintext,{flag:'wx',mode:0o600});
 return {status:'LOCAL_RESTORE_WITH_VERIFIED_SHA_NOT_HISTORICAL_VINTAGE',source_url:C.SOURCE_URL,
  official_cpi_reference_file_restored:true,sha256:meta.sha256,original_bytes:plaintext.length,
  private_output_filename:name,source_origin_claim_requires_HTTPS_CAPTURE_AUDIT:true,
  headline_index_column_unverified:true,asof_backtest_approved:false,redistribution_approved:false};
}
module.exports={SPKI_SHA256,OBSERVED_RAW_SHA256,envelope,readPrivate,decrypt,privateFile,restore};
