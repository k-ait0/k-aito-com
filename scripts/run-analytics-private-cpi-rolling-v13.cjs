#!/usr/bin/env node
'use strict';
/** Offline-only, local private v0.12 handoff -> v0.13 historical JP CPI-linked living-expense QA. */
const fs=require('node:fs'),path=require('node:path');
const {privateDir}=require('../lib/analytics/private-evidence-restore.cjs');
const {FILES,sha256}=require('../lib/analytics/private-jpy-e2e.cjs');
const {buildPrivateCpiRollingReport}=require('../lib/analytics/private-cpi-rolling-research.cjs');
const {readPinned}=require('./run-analytics-private-jpy-e2e.cjs');
const {gitBlobSha,PINNED_REGISTRY_BLOB_SHA}=require('./run-analytics-private-jpy-e2e-v10.cjs');
const ARGS=new Set(['--handoff-dir','--registry','--plan','--out-dir']);
function parseArgs(argv){
 const a={};for(let i=0;i<argv.length;i++){
  if(!ARGS.has(argv[i])||Object.hasOwn(a,argv[i]))throw Error('Unknown/repeated CLI argument '+argv[i]);
  if(i+1>=argv.length)throw Error('Missing value for '+argv[i]);a[argv[i]]=argv[++i];
 }
 for(const k of ARGS)if(!a[k])throw Error('Missing required '+k);
 return a;
}
function main(argv=process.argv.slice(2)){
 const a=parseArgs(argv),src=privateDir(a['--handoff-dir']);
 const out=privateDir(a['--out-dir'],{create:true});
 if(src===out||src.startsWith(out+path.sep)||out.startsWith(src+path.sep))throw Error('Input handoff and output may not overlap');
 const registryBytes=readPinned(a['--registry'],'historical source registry',2*1024*1024);
 if(gitBlobSha(registryBytes)!==PINNED_REGISTRY_BLOB_SHA)throw Error('Unreviewed source registry bytes');
 const handoff=JSON.parse(readPinned(path.join(src,'PRIVATE_HANDOFF_RECEIPT.json'),'v12 handoff receipt',64*1024).toString('utf8'));
 if(handoff.schema!=='ANALYTICS_PRIVATE_HANDOFF_V12'||handoff.publication_approved!==false||handoff.data_qa_passed!==true||handoff.raw_and_canonical_parity!==true)
  throw Error('v0.12 verified private handoff receipt missing or incomplete');
 const files=Object.fromEntries(Object.entries(FILES).map(([k,name])=>[k,readPinned(path.join(src,name),name)]));
 for(const [k,bytes] of Object.entries(files))if(handoff.verified_input_bytes?.[k]!==sha256(bytes))throw Error('Private handoff input byte hash changed: '+k);
 const manifest=JSON.parse(readPinned(path.join(src,'manifest.json'),'v12 manifest',64*1024).toString('utf8'));
 const plan=JSON.parse(readPinned(a['--plan'],'private CPI research plan',64*1024).toString('utf8'));
 const report=buildPrivateCpiRollingReport({source_registry:JSON.parse(registryBytes.toString('utf8')),manifest,files,plan});
 const sourceSha=sha256(Buffer.from(JSON.stringify({files:handoff.verified_input_bytes,registry:sha256(registryBytes),plan}))).slice(0,24);
 const output=path.join(out,'ANALYTICS_PRIVATE_JP_CPI_ROLLING_V13_'+sourceSha+'.json');
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({status:report.status,report_file:output,horizons:report.model_tests.map(x=>x.horizon_months),
   publication_approved:false,source_rights_approved:false,real_source_values_not_logged:true}));
 return report;
}
if(require.main===module)try{main();}catch(e){console.error('PRIVATE_CPI_ROLLING_QA_BLOCKED: '+e.message);process.exitCode=1;}
module.exports={parseArgs,main};
