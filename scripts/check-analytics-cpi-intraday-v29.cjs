#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const C=require('../lib/analytics/cpi-official-intraday-v029.cjs');
const root=path.resolve(__dirname,'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,'docs',f),'utf8'));
function main(argv=process.argv.slice(2)){
 if(argv.length!==2||!['--asof-jst','--local-pdf'].includes(argv[0]))throw Error('Usage: --asof-jst YYYY-MM-DDTHH:mm:ss+09:00 | --local-pdf ABS_PATH');
 const doc=read('ANALYTICS_CPI_OFFICIAL_INTRADAY_V029.json'),v28=read('ANALYTICS_JP_CPI_RELEASE_SEQUENCE_V028.json');C.validateCalendar(doc,v28);
 const result=argv[0]==='--asof-jst'?C.releasedAt(doc,v28,argv[1]):C.fingerprintLocalPdf(argv[1]);
 console.log(JSON.stringify(result,null,2));return result;
}
if(require.main===module)try{main()}catch(e){console.error('ANALYTICS_CPI_INTRADAY_V029_BLOCKED: '+e.message);process.exitCode=2;}
module.exports={main};
