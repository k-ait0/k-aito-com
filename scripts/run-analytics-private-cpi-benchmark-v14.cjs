#!/usr/bin/env node
'use strict';
/** Offline private v0.12 handoff -> six-file QA -> CPI/fixed matched-window aggregates. */
const fs=require('node:fs'),path=require('node:path');
const {privateDir}=require('../lib/analytics/private-evidence-restore.cjs');
const {FILES,sha256}=require('../lib/analytics/private-jpy-e2e.cjs');
const {buildPrivateCpiBenchmarkReport}=require('../lib/analytics/private-cpi-benchmark-research.cjs');
const {readPinned}=require('./run-analytics-private-jpy-e2e.cjs');
const {gitBlobSha,PINNED_REGISTRY_BLOB_SHA}=require('./run-analytics-private-jpy-e2e-v10.cjs');
const ALLOWED=new Set(['--handoff-dir','--registry','--plan','--out-dir','--annual-rate']);
function parseArgs(argv){
 const a={};for(let i=0;i<argv.length;i++){
   if(!ALLOWED.has(argv[i])||Object.hasOwn(a,argv[i]))throw Error('Unknown/repeated CLI argument '+argv[i]);
   if(i+1>=argv.length)throw Error('Missing value for '+argv[i]);
   a[argv[i]]=argv[++i];
 }
 for(const key of ALLOWED)if(!a[key])throw Error('Missing required '+key);
 if(!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(a['--annual-rate']))throw Error('annual-rate must be decimal annual fraction');
 const rate=Number(a['--annual-rate']);
 if(!Number.isFinite(rate)||rate<-.5||rate>1)throw Error('Annual inflation out of supported range');
 return {...a,annualRate:rate};
}
function main(argv=process.argv.slice(2)){
 const a=parseArgs(argv),src=privateDir(a['--handoff-dir']);
 const out=privateDir(a['--out-dir'],{create:true});
 if(src===out||src.startsWith(out+path.sep)||out.startsWith(src+path.sep))throw Error('Private input/output overlap');
 const registryBytes=readPinned(a['--registry'],'canonical source registry',2*1024*1024);
 if(gitBlobSha(registryBytes)!==PINNED_REGISTRY_BLOB_SHA)throw Error('Unreviewed source registry bytes');
 const handoff=JSON.parse(readPinned(path.join(src,'PRIVATE_HANDOFF_RECEIPT.json'),'v12 handoff receipt',64*1024).toString('utf8'));
 if(handoff.schema!=='ANALYTICS_PRIVATE_HANDOFF_V12'||handoff.publication_approved!==false||handoff.data_qa_passed!==true||handoff.raw_and_canonical_parity!==true)
   throw Error('Verified private handoff receipt missing or incomplete');
 const files=Object.fromEntries(Object.entries(FILES).map(([k,name])=>[k,readPinned(path.join(src,name),name)]));
 for(const [k,bytes] of Object.entries(files))if(handoff.verified_input_bytes?.[k]!==sha256(bytes))throw Error('Verified input bytes changed: '+k);
 const manifest=JSON.parse(readPinned(path.join(src,'manifest.json'),'private manifest',64*1024).toString('utf8'));
 const plan=JSON.parse(readPinned(a['--plan'],'private benchmark plan',64*1024).toString('utf8'));
 const result=buildPrivateCpiBenchmarkReport({source_registry:JSON.parse(registryBytes.toString('utf8')),
   manifest,files,plan,comparison_annual_expense_inflation:a.annualRate});
 const receipt=sha256(Buffer.from(JSON.stringify({inputs:handoff.verified_input_bytes,registry:sha256(registryBytes),plan,rate:a.annualRate}))).slice(0,24);
 const outfile=path.join(out,'ANALYTICS_PRIVATE_PAIRED_CPI_V14_'+receipt+'.json');
 fs.writeFileSync(outfile,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({status:result.status,output_file:outfile,
    evaluated_horizons:result.comparison.map(x=>({horizon_months:x.horizon_months,paired_complete_windows:x.paired_complete_windows})),
    publication_approved:false,raw_monthly_values_not_logged:true}));
 return result;
}
if(require.main===module)try{main();}catch(e){console.error('PRIVATE_PAIRED_CPI_RESEARCH_BLOCKED: '+e.message);process.exitCode=1;}
module.exports={main,parseArgs};