#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {validateEvidence,asOfEvidence,verifyPrivateArchives}=require('../lib/analytics/cpi-official-release-evidence-v027.cjs');
function parse(args){const o={};for(let i=0;i<args.length;i++){const k=args[i];if(!['--asof','--archive-manifest'].includes(k)||Object.hasOwn(o,k)||i+1>=args.length)throw Error('Usage: [--asof YYYY-MM-DD] [--archive-manifest /ABS/PRIVATE/manifest.json]');o[k]=args[++i];}return o;}
function main(args=process.argv.slice(2)){
 const o=parse(args),root=path.resolve(__dirname,'..');
 const doc=JSON.parse(fs.readFileSync(path.join(root,'docs/ANALYTICS_CPI_OFFICIAL_MONTHLY_EVIDENCE_V0_27.json'),'utf8'));
 const entries=validateEvidence(doc);
 const result={status:'REVIEWED_OFFICIAL_OVERVIEW_NOT_ARCHIVED_RAW',count:entries.length,records:entries.map(x=>({id:x.publication_id,month:x.observation_month,release:x.published_on,index:x.value,source:x.evidence_source_url})),model_import_ready:false};
 if(o['--asof'])result.asof=asOfEvidence(doc,o['--asof']);
 if(o['--archive-manifest']){
  const file=path.resolve(o['--archive-manifest']);
  if(!path.isAbsolute(o['--archive-manifest'])||file===root||file.startsWith(root+path.sep))throw Error('Private manifest must reside outside repository');
  const stat=fs.lstatSync(file);if(stat.isSymbolicLink()||!stat.isFile()||stat.size>10000)throw Error('Private manifest not regular or too large');
  result.local_pdf_digest=verifyPrivateArchives(JSON.parse(fs.readFileSync(file,'utf8')),root);
 }
 console.log(JSON.stringify(result,null,2));return result;
}
if(require.main===module)try{main()}catch(e){console.error('V027_OFFICIAL_EVIDENCE_BLOCKED: '+e.message);process.exitCode=2;}
module.exports={parse,main};