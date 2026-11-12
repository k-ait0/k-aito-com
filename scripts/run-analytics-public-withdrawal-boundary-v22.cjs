#!/usr/bin/env node
'use strict';
/** Private-offline research with pinned public source; output aggregates only. */
const fs=require('node:fs'),path=require('node:path');
const S=require('../lib/analytics/public-shiller-withdrawal-boundary-v22.cjs');
const {fetchPinnedOnce}=require('../lib/analytics/private-shiller-recovery.cjs');
function options(argv){
 const x={};for(let i=0;i<argv.length;i++){
  const k=argv[i];if(!['--source-file','--fetch-once','--out-dir'].includes(k)||Object.hasOwn(x,k))throw Error('Unknown/duplicate argument '+k);
  if(k==='--fetch-once'){x[k]=true;continue;}
  if(++i>=argv.length)throw Error('Missing path after '+k);x[k]=argv[i];
 }
 if((!!x['--source-file'])===(!!x['--fetch-once'])||!x['--out-dir'])throw Error('Usage: (--source-file ABS_SOURCE | --fetch-once) --out-dir ABS_PRIVATE_OUTPUT');
 return x;
}
function safeDir(repo,dir){
 if(!path.isAbsolute(dir))throw Error('Absolute directory path required');
 const st=fs.lstatSync(dir);if(st.isSymbolicLink()||!st.isDirectory())throw Error('Unsafe directory');
 const r=fs.realpathSync(dir);if(r===repo||r.startsWith(repo+path.sep)||repo.startsWith(r+path.sep))throw Error('Path overlaps checkout');
 return r;
}
async function main(argv=process.argv.slice(2)){
 const args=options(argv),repo=fs.realpathSync(path.resolve(__dirname,'..'));
 let raw;
 if(args['--fetch-once'])raw=await fetchPinnedOnce();
 else {
  const p=args['--source-file'];if(!path.isAbsolute(p))throw Error('Absolute source path required');
  safeDir(repo,path.dirname(p));const st=fs.lstatSync(p);
  if(st.isSymbolicLink()||!st.isFile()||st.size<100||st.size>200000)throw Error('Unsafe source file');raw=fs.readFileSync(p);
 }
 const report=S.analyzePinnedRaw(raw);
 const out=safeDir(repo,args['--out-dir']),file=path.join(out,'ANALYTICS_SHILLER_USD_WITHDRAWAL_BOUNDARY_V022_PRIVATE_AGGREGATES.json');
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 const status={status:report.status,source_sha256:report.source_sha256,windows:report.horizons.map(x=>x.complete_overlapping_windows),file};
 console.log(JSON.stringify(status));return status;
}
if(require.main===module)main().catch(e=>{console.error('ANALYTICS_V022_FAILED: '+e.message);process.exitCode=2;});
module.exports={options,main,safeDir};
