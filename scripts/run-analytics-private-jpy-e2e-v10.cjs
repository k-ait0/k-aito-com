#!/usr/bin/env node
'use strict';
/** Final strict private-only byte and independently reconstructed normalization QA. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {FILES,sha256}=require('../lib/analytics/private-jpy-e2e.cjs');
const {buildPrivateV10Report}=require('../lib/analytics/private-normalization-parity.cjs');
const {parseOptions,directory,readPinned}=require('./run-analytics-private-jpy-e2e.cjs');
const PINNED_REGISTRY_BLOB_SHA='4868c921233540396d3e21fd77fa1edd70a10926';
function gitBlobSha(buf){return crypto.createHash('sha1').update(Buffer.from('blob '+buf.length+'\0')).update(buf).digest('hex');}
function main(argv=process.argv.slice(2)){
 const args=parseOptions(argv),privateDir=directory(args['--private-dir'],{mustExist:true}),outDir=directory(args['--out-dir']);
 if(!path.isAbsolute(args['--registry']))throw Error('Registry path must be absolute');
 const registryBuffer=readPinned(args['--registry'],'canonical source registry',2*1024*1024);
 if(gitBlobSha(registryBuffer)!==PINNED_REGISTRY_BLOB_SHA)throw Error('Source registry snapshot changed from reviewed historical branch Git blob');
 const registry=JSON.parse(registryBuffer.toString('utf8'));
 const manifest=JSON.parse(readPinned(path.join(privateDir,'manifest.json'),'private handoff manifest',64*1024).toString('utf8'));
 const files=Object.fromEntries(Object.entries(FILES).map(([key,name])=>[key,readPinned(path.join(privateDir,name),name)]));
 let plan=null;
 if(args['--plan']){
  const input=args['--plan'];if(!path.isAbsolute(input)||!fs.existsSync(input)||!fs.realpathSync(input).startsWith(privateDir+path.sep))throw Error('Plan must stay in private directory');
  plan=JSON.parse(readPinned(input,'private research plan',64*1024).toString('utf8'));
 }
 const report=buildPrivateV10Report({source_registry:registry,manifest,files,plan,registry_file_sha256:sha256(registryBuffer)});
 const sourceId=sha256(Buffer.from(JSON.stringify({files:Object.fromEntries(Object.entries(FILES).map(([key])=>[key,sha256(files[key])])),plan,registry:sha256(registryBuffer)}))).slice(0,20);
 const out=path.join(outDir,'ANALYTICS_PRIVATE_JPY_QA_V10_'+sourceId+'.json');
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({status:'PRIVATE_RAW_NORMALIZATION_QA_COMPLETE',source_byte_checks:6,
  independent_fx_months:report.normalization_parity.fx_final_months,
  independent_jp_headline_months:report.normalization_parity.jp_headline_months,
  independent_cpi_crosschecks:report.normalization_parity.official_jp_cpi_independent_overlap_verified,
  available_nominal_jpy_months:report.markets.complete_jpy_nominal_months,
  report:out,publication_approved:false,source_rights_approved:false}));
 return report;
}
if(require.main===module)try{main()}catch(e){console.error('PRIVATE_JPY_V10_QA_FAILED: '+e.message);process.exitCode=1;}
module.exports={main,gitBlobSha,PINNED_REGISTRY_BLOB_SHA};
