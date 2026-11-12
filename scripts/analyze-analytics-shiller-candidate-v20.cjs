#!/usr/bin/env node
'use strict';
const R=require('../lib/analytics/public-shiller-candidate-v20.cjs');
const SRC=require('../lib/analytics/private-shiller-recovery.cjs');
function parse(argv){
 const opts={};const allow=new Set(['--source-file','--fetch-pinned-once','--out-dir']);
 for(let i=0;i<argv.length;i++){
  const arg=argv[i];if(!allow.has(arg)||Object.hasOwn(opts,arg))throw Error('Unrecognized/repeated parameter '+arg);
  if(arg==='--fetch-pinned-once')opts[arg]=true;
  else if(++i<argv.length)opts[arg]=argv[i];else throw Error('Missing path for '+arg);
 }
 if(Number(!!opts['--source-file'])+Number(!!opts['--fetch-pinned-once'])!==1)throw Error('Specify source-file OR explicit fetch-pinned-once');
 return opts;
}
async function main(argv=process.argv.slice(2)){
 const opts=parse(argv);
 const report=opts['--source-file']?R.inspectFile(opts['--source-file']):R.candidateReport(await SRC.fetchPinnedOnce());
 // Never include raw prices or monthly return rows in stdout or saved aggregate.
 if(opts['--out-dir'])R.writePrivateAggregate(report,opts['--out-dir']);
 console.log(JSON.stringify(report,null,2));return report;
}
if(require.main===module)main().catch(e=>{console.error('ANALYTICS_SHILLER_CANDIDATE_V20_BLOCKED: '+e.message);process.exitCode=2});
module.exports={parse,main};
