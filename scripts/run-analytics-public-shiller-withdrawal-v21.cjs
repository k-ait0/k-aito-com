#!/usr/bin/env node
'use strict';
/** Offline, pinned public Shiller candidate study. Input/output kept outside Git checkout. */
const fs=require('node:fs'),path=require('node:path');
const {analyzePinnedRaw}=require('../lib/analytics/public-shiller-withdrawal-stress-v21.cjs');
const {fetchPinnedOnce}=require('../lib/analytics/private-shiller-recovery.cjs');
function parse(args){
 const v={};for(let i=0;i<args.length;i++){
  const k=args[i];if(!['--source-file','--fetch-once','--out-dir'].includes(k)||Object.hasOwn(v,k))throw Error('Invalid CLI argument '+k);if(k==='--fetch-once'){v[k]=true;continue;}if(i+1>=args.length)throw Error('Missing argument for '+k);v[k]=args[++i];
 }
 if((!!v['--source-file'])===(!!v['--fetch-once'])||!v['--out-dir'])throw Error('Usage: (--source-file ABS_PRIVATE_DATA_CSV | --fetch-once) --out-dir ABS_PRIVATE_OUTPUT');
 return v;
}
function realOutside(repo,dir){
 if(!path.isAbsolute(dir))throw Error('Absolute path required');
 const actual=fs.realpathSync(dir);
 if(actual===repo||actual.startsWith(repo+path.sep)||repo.startsWith(actual+path.sep))throw Error('Private paths must not overlap source repository');
 const st=fs.lstatSync(dir);if(st.isSymbolicLink()||!st.isDirectory())throw Error('Unsafe private directory');
 return actual;
}
async function main(args=process.argv.slice(2)){
 const o=parse(args),repo=fs.realpathSync(path.resolve(__dirname,'..'));
 let raw;
 if(o['--fetch-once']){raw=await fetchPinnedOnce();}
 else {
  const src=path.resolve(o['--source-file']);if(!path.isAbsolute(o['--source-file']))throw Error('Absolute input path required');
  realOutside(repo,path.dirname(src));
  const stat=fs.lstatSync(src);if(stat.isSymbolicLink()||!stat.isFile()||stat.size<100||stat.size>200000)throw Error('Unsafe upstream CSV input');
  raw=fs.readFileSync(src);
 }
 const report=analyzePinnedRaw(raw);
 const dest=realOutside(repo,o['--out-dir']);
 const output=path.join(dest,'ANALYTICS_SHILLER_USD_WITHDRAWAL_V021_AGGREGATES.json');
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 const out={status:report.status,source_git_blob_sha1:report.source_git_blob_sha1,scenarios:report.summaries.length,output_file:output,private_only:true};
 console.log(JSON.stringify(out));return out;
}
if(require.main===module)main().catch(e=>{console.error('PRIVATE_RESEARCH_V21_FAILED '+e.message);process.exitCode=2;});
module.exports={parse,main};
