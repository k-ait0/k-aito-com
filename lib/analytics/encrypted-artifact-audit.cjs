'use strict';
/** Offline ciphertext-only GitHub Actions artifact verifier. Does not decrypt or write files. */
const {createHash}=require('node:crypto');
const {inflateRawSync}=require('node:zlib');
const MAX_ZIP=16*1024*1024,MAX_JSON=12*1024*1024;
const SHA=/^[0-9a-f]{64}$/;
const ARTIFACTS=Object.freeze([
 {id:13824035258,run:42947688134,name:'bls-cpi-1966-2026-encrypted-research-20261111',file:'bls_research_PRIVATE_ENCRYPTED.json',expires:'2026-11-18T02:41:26Z'},
 {id:13824913073,run:42951821449,name:'jp-cpi-2025base-estat-original-encrypted',file:'jpcpi_PRIVATE_ENCRYPTED.json',expires:'2026-11-18T03:18:08Z'},
 {id:13825223543,run:42952254081,name:'fed-h10-pinned-2000-now-encrypted',file:'fed_h10_PRIVATE_ENCRYPTED.json',expires:'2026-11-18T03:21:56Z'},
 {id:13825636423,run:42952254081,name:'worldbank-pink-pinned-raw-only-encrypted',file:'worldbank_pink_PRIVATE_ENCRYPTED.json',expires:'2026-11-18T03:21:56Z'},
 {id:13826880503,run:42954684913,name:'fed-h10-ddp-all-release-1971-research-candidate-encrypted',file:'fed_ddp_PRIVATE_ENCRYPTED.json',expires:'2026-11-18T03:44:15Z',candidate_only:true}
]);
const sha=x=>createHash('sha256').update(x).digest('hex');
function b64(x,label){if(typeof x!=='string'||x.length%4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(x))throw Error('Invalid base64 '+label);return Buffer.from(x,'base64');}
function crc32(b){let c=0xffffffff;for(const byte of b){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function extractOnlyEncryptedJson(zip,name){
 if(!Buffer.isBuffer(zip)||zip.length<30||zip.length>MAX_ZIP)throw Error('Archive byte size outside expected limits');
 let end=-1;
 for(let at=zip.length-22;at>=Math.max(0,zip.length-65557);at--){if(zip.readUInt32LE(at)===0x06054b50){end=at;break;}}
 if(end<0||end+22+zip.readUInt16LE(end+20)!==zip.length)throw Error('No valid ZIP end record');
 if(zip.readUInt16LE(end+4)!==0||zip.readUInt16LE(end+6)!==0||zip.readUInt16LE(end+8)!==1||zip.readUInt16LE(end+10)!==1)throw Error('Archive must contain exactly one entry, no split ZIP');
 const cdSize=zip.readUInt32LE(end+12),off=zip.readUInt32LE(end+16);
 if(off>zip.length-46||off+cdSize!==end||zip.readUInt32LE(off)!==0x02014b50)throw Error('Invalid central directory');
 const flags=zip.readUInt16LE(off+8),method=zip.readUInt16LE(off+10),crc=zip.readUInt32LE(off+16),compressed=zip.readUInt32LE(off+20),uncompressed=zip.readUInt32LE(off+24),nameLen=zip.readUInt16LE(off+28),extraLen=zip.readUInt16LE(off+30),commentLen=zip.readUInt16LE(off+32),local=zip.readUInt32LE(off+42);
 if((flags&1)||![0,8].includes(method)||compressed>MAX_ZIP||uncompressed>MAX_JSON||off+46+nameLen+extraLen+commentLen!==end)throw Error('Unsafe ZIP metadata');
 if(zip.subarray(off+46,off+46+nameLen).toString('utf8')!==name)throw Error('Wrong encrypted payload name');
 if(local>off-30||zip.readUInt32LE(local)!==0x04034b50)throw Error('Missing local ZIP header');
 const localNameLen=zip.readUInt16LE(local+26),localExtra=zip.readUInt16LE(local+28);
 if(zip.subarray(local+30,local+30+localNameLen).toString('utf8')!==name)throw Error('Local ZIP name mismatch');
 const begin=local+30+localNameLen+localExtra;
 if(begin+compressed>off)throw Error('Truncated ZIP payload');
 const bytes=zip.subarray(begin,begin+compressed),decoded=method===8?inflateRawSync(bytes,{maxOutputLength:MAX_JSON}):bytes;
 if(decoded.length!==uncompressed||crc32(decoded)!==crc)throw Error('ZIP size or CRC mismatch');
 return decoded;
}
function auditEncryptedArchive(zip,expected){
 if(!expected||!ARTIFACTS.some(x=>x.id===expected.id&&x.file===expected.file))throw Error('Unknown pinned archive');
 const bytes=extractOnlyEncryptedJson(zip,expected.file);
 let envelope;try{envelope=JSON.parse(bytes.toString('utf8'));}catch(e){throw Error('Encrypted payload is not JSON');}
 if(!envelope||typeof envelope!=='object'||Array.isArray(envelope)||envelope.format!=='KAITO_ANALYTICS_ENCRYPTED_RESEARCH_V1'||envelope.encryption!=='AES-256-GCM'||envelope.key_transport!=='RSA-OAEP-3072-SHA256')throw Error('Unrecognized ciphertext envelope');
 const cipher=b64(envelope.ciphertext_b64,'ciphertext'),iv=b64(envelope.iv_b64,'iv'),tag=b64(envelope.tag_b64,'auth tag'),wrapped=b64(envelope.wrapped_key_b64,'wrapped AES key');
 if(!SHA.test(envelope.ciphertext_sha256)||!SHA.test(envelope.plaintext_sha256)||!SHA.test(envelope.public_key_sha256)||!Number.isSafeInteger(envelope.ciphertext_bytes)||envelope.ciphertext_bytes!==cipher.length||sha(cipher)!==envelope.ciphertext_sha256||iv.length!==12||tag.length!==16||wrapped.length!==384)throw Error('Invalid ciphertext structure or digest');
 return {artifact_id:expected.id,name:expected.name,archive_sha256:sha(zip),archive_bytes:zip.length,ciphertext_sha256:envelope.ciphertext_sha256,ciphertext_bytes:cipher.length,public_key_sha256:envelope.public_key_sha256,envelope_verified:true,plaintext_decrypted:false,raw_data_verified:false,candidate_only:expected.candidate_only===true};
}
function verifyArtifactMetadata(metadata,expected,now=Date.now()){
 if(!metadata||metadata.id!==expected.id||metadata.name!==expected.name||metadata.expired!==false||!metadata.expires_at||!Number.isFinite(Date.parse(metadata.expires_at))||Math.abs(Date.parse(metadata.expires_at)-Date.parse(expected.expires))>60_000)throw Error('Artifact identity, expiration, or availability mismatch');
 if(Date.parse(metadata.expires_at)<=now)throw Error('GitHub Artifact already expired');
 return {id:expected.id,name:expected.name,expires_at:metadata.expires_at,expires_unix_ms:Date.parse(metadata.expires_at)};
}
module.exports={ARTIFACTS,sha,crc32,extractOnlyEncryptedJson,auditEncryptedArchive,verifyArtifactMetadata};
