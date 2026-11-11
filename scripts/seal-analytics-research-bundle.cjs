#!/usr/bin/env node
'use strict';
// Encrypt BLS research evidence BEFORE exporting it from a public GitHub Actions runner.
// The RSA private key is never committed, uploaded, or printed.
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const sha256=v=>crypto.createHash('sha256').update(v).digest('hex');
function seal(raw,publicPem){
 const key=crypto.randomBytes(32),iv=crypto.randomBytes(12);
 const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
 const ciphertext=Buffer.concat([cipher.update(raw),cipher.final()]);
 const tag=cipher.getAuthTag();
 const wrapped=crypto.publicEncrypt({key:publicPem,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},key);
 return {format:'KAITO_ANALYTICS_ENCRYPTED_RESEARCH_V1',encryption:'AES-256-GCM',key_transport:'RSA-OAEP-3072-SHA256',plaintext_sha256:sha256(raw),ciphertext_sha256:sha256(ciphertext),ciphertext_bytes:ciphertext.length,iv_b64:iv.toString('base64'),tag_b64:tag.toString('base64'),wrapped_key_b64:wrapped.toString('base64'),ciphertext_b64:ciphertext.toString('base64'),public_key_sha256:sha256(Buffer.from(publicPem))};
}
function unseal(bundle,privatePem){
 if(bundle.format!=='KAITO_ANALYTICS_ENCRYPTED_RESEARCH_V1')throw Error('Unexpected envelope');
 const key=crypto.privateDecrypt({key:privatePem,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(bundle.wrapped_key_b64,'base64'));
 const ciphertext=Buffer.from(bundle.ciphertext_b64,'base64');
 if(sha256(ciphertext)!==bundle.ciphertext_sha256)throw Error('Ciphertext digest mismatch');
 const dec=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(bundle.iv_b64,'base64'));
 dec.setAuthTag(Buffer.from(bundle.tag_b64,'base64'));
 const raw=Buffer.concat([dec.update(ciphertext),dec.final()]);
 if(sha256(raw)!==bundle.plaintext_sha256)throw Error('Plaintext SHA mismatch');
 return raw;
}
function main(args){
 if(args[0]==='--decrypt'){
  if(args.length!==4)throw Error('Usage: --decrypt ENVELOPE.json PRIVATE_KEY.pem OUT.tgz');
  const raw=unseal(JSON.parse(fs.readFileSync(args[1],'utf8')),fs.readFileSync(args[2],'utf8'));
  fs.writeFileSync(args[3],raw,{flag:'wx',mode:0o600});
  console.log('BLS_PRIVATE_DECRYPTED sha256='+sha256(raw));return;
 }
 if(args.length!==3)throw Error('Usage: INPUT.tgz PUBLIC_KEY.pem OUTPUT_ENCRYPTED.json');
 const raw=fs.readFileSync(args[0]),publicPem=fs.readFileSync(args[1],'utf8');
 const result=seal(raw,publicPem);
 fs.writeFileSync(args[2],JSON.stringify(result)+'\n',{flag:'wx',mode:0o600});
 console.log('BLS_ENCRYPTED_EVIDENCE_READY cipher_sha256='+result.ciphertext_sha256+' bytes='+result.ciphertext_bytes);
}
if(require.main===module)try{main(process.argv.slice(2))}catch(e){console.error('BLS_ENCRYPT_ERROR '+e.message);process.exitCode=1}
module.exports={seal,unseal};
