#!/usr/bin/env node
'use strict';
/** Offline private handoff v0.12; never prints raw values or keys. */
const {examineRestoredHandoff,preparePrivateHandoff}=require('../lib/analytics/private-handoff-builder.cjs');
const KNOWN=new Set(['--restore-dir','--shiller','--manifest','--registry','--fed-canonical','--out-dir','--plan','--inspect-only']);
function options(args){
 const o={};
 for(let i=0;i<args.length;i++){
  const key=args[i];if(!KNOWN.has(key)||Object.hasOwn(o,key))throw Error('Unknown or repeated CLI argument '+key);
  if(key==='--inspect-only'){o[key]=true;continue;}
  if(++i>=args.length)throw Error('Missing path for '+key);
  o[key]=args[i];
 }
 if(!o['--restore-dir'])throw Error('--restore-dir required');
 if(!o['--inspect-only']&&!o['--out-dir'])throw Error('--out-dir required for preparation');
 return o;
}
function main(args=process.argv.slice(2)){
 const o=options(args),input={restore_dir:o['--restore-dir'],shiller_file:o['--shiller'],
  manifest_file:o['--manifest'],registry_file:o['--registry'],fed_canonical_file:o['--fed-canonical'],plan_file:o['--plan'],out_dir:o['--out-dir']};
 if(o['--inspect-only']){
   const r=examineRestoredHandoff(input);
   const output={status:r.status,blockers:r.blockers,verified_inputs:r.inventory,
     fed_candidate:r.fed_reconstruction,ready:r.ready,publication_approved:false};
   console.log(JSON.stringify(output,null,2));
   if(!r.ready)process.exitCode=2;
   return output;
 }
 const r=preparePrivateHandoff(input);
 console.log(JSON.stringify(r,null,2));return r;
}
if(require.main===module)try{main()}catch(e){console.error('ANALYTICS_PRIVATE_HANDOFF_V12_FAILED '+e.message);process.exitCode=1;}
module.exports={options,main};
