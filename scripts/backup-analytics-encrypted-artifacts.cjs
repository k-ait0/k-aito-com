#!/usr/bin/env node
'use strict';
/** Secure offline copy of 5 expiring encrypted GitHub artifacts. Requires signed-in gh CLI. */
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {ARTIFACTS,sha,auditEncryptedArchive,verifyArtifactMetadata}=require('../lib/analytics/encrypted-artifact-audit.cjs');
const ROOT=fs.realpathSync(path.resolve(__dirname,'..'));
function inside(child,root){return child===root||child.startsWith(root+path.sep);}
function privateDirectory(input){
 if(typeof input!=='string'||!path.isAbsolute(input))throw Error('Use absolute --out-dir outside repository');
 const resolved=path.resolve(input);
 if(inside(resolved,ROOT)||inside(ROOT,resolved))throw Error('Backup cannot overlap repository');
 if(!fs.existsSync(resolved))fs.mkdirSync(resolved,{mode:0o700,recursive:true});
 const real=fs.realpathSync(resolved);
 if(fs.lstatSync(resolved).isSymbolicLink()||inside(real,ROOT)||inside(ROOT,real)||!fs.statSync(real).isDirectory())throw Error('Unsafe backup directory');
 return real;
}
function ghApi(endpoint,{maxBuffer=22*1024*1024}={}){
 const r=spawnSync('gh',['api','--method','GET',endpoint],{encoding:null,maxBuffer,timeout:90_000,env:process.env});
 if(r.error)throw Error('GitHub CLI unavailable or timed out: '+r.error.message);
 if(r.status!==0)throw Error('gh api failed for Artifact; authenticate with gh auth login (no credentials printed)');
 return r.stdout;
}
function preserve({outDir,getMetadata=async a=>JSON.parse(ghApi(`repos/k-ait0/k-aito-com/actions/artifacts/${a.id}`).toString('utf8')),getZip=async a=>ghApi(`repos/k-ait0/k-aito-com/actions/artifacts/${a.id}/zip`),targets=ARTIFACTS,clock=()=>Date.now()}={}){
 const directory=privateDirectory(outDir);
 const names=targets.map(a=>'encrypted-artifact-'+a.id+'.zip');
 for(const name of [...names,'encrypted-artifacts-manifest.json'])if(fs.existsSync(path.join(directory,name)))throw Error('Existing backup file; refusing overwrite: '+name);
 return (async()=>{
  const summary=[];
  for(let i=0;i<targets.length;i++){
   const expected=targets[i],metadata=await getMetadata(expected);
   const verified=verifyArtifactMetadata(metadata,expected,clock());
   const zipped=await getZip(expected);
   const audit=auditEncryptedArchive(zipped,expected);
   const destination=path.join(directory,names[i]);
   fs.writeFileSync(destination,zipped,{flag:'wx',mode:0o600});
   summary.push({...audit,run_id:expected.run,expires_at:verified.expires_at,file:names[i]});
  }
  if(summary.length!==ARTIFACTS.length)throw Error('Incomplete preservation; all five archives required');
  const report={schema:'KAITO_ANALYTICS_ENCRYPTED_BACKUP_V1',research_only:true,all_five_encrypted_artifacts_saved:true,
   bytes_verified_but_not_decrypted:true,publication_approved:false,
   note:'ZIP archives contain encrypted JSON envelopes; secure owner-controlled storage is required. GitHub retention is NOT extended. Do not delete source artifacts before confirming permanent backup.',
   artifacts:summary};
  fs.writeFileSync(path.join(directory,'encrypted-artifacts-manifest.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  return report;
 })();
}
async function main(argv=process.argv.slice(2)){
 if(argv.length!==2||argv[0]!=='--out-dir')throw Error('Usage: node scripts/backup-analytics-encrypted-artifacts.cjs --out-dir /ABSOLUTE/PRIVATE/BACKUP');
 const r=await preserve({outDir:argv[1]});
 console.log(JSON.stringify({status:'LOCAL_ENCRYPTED_BACKUP_READY',encrypted_artifacts:r.artifacts.length,
  details:r.artifacts.map(x=>({id:x.artifact_id,sha256:x.archive_sha256,bytes:x.archive_bytes,expires_at:x.expires_at})),publication_approved:false}));
}
if(require.main===module)main().catch(e=>{console.error('ENCRYPTED_BACKUP_FAILED: '+e.message);process.exitCode=1;});
module.exports={preserve,privateDirectory,ghApi,main};
