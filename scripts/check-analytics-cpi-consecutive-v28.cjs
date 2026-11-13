#!/usr/bin/env node
'use strict';
/** Deterministic offline public official-CPI excerpt QA. No data upload, no API key. */
const fs=require('node:fs'),path=require('node:path');
const R=require('../lib/analytics/cpi-official-consecutive-v028.cjs');
const CATALOGUE=path.join(__dirname,'../docs/ANALYTICS_JP_CPI_RELEASE_SEQUENCE_V028.json');
function parse(argv){
 const allowed=new Set(['--asof','--sample-dates','--base-expense-yen','--compare']);const o={};
 for(let i=0;i<argv.length;i++){const k=argv[i];if(!allowed.has(k)||Object.hasOwn(o,k))throw Error('Invalid or duplicate CLI option '+k);
  if(k==='--compare'){o[k]=true;continue;}if(++i>=argv.length)throw Error('Missing value after '+k);o[k]=argv[i];}
 if(o['--asof']&&(o['--sample-dates']||o['--base-expense-yen']||o['--compare']))throw Error('Select one operation');
 if(o['--compare']&&(o['--sample-dates']||o['--base-expense-yen']))throw Error('Select one operation');
 if(!!o['--sample-dates']!==!!o['--base-expense-yen'])throw Error('Preview requires both --sample-dates and --base-expense-yen');
 if(!o['--asof']&&!o['--compare']&&!o['--sample-dates'])throw Error('Provide --asof DAY, --compare, or --sample-dates DAYS --base-expense-yen INTEGER');
 return o;
}
function main(argv=process.argv.slice(2)){
 const a=parse(argv),source=JSON.parse(fs.readFileSync(CATALOGUE,'utf8'));R.validateSequence(source);
 const result=a['--asof']?R.releasedAsOf(source,a['--asof']):a['--compare']?R.comparePublishedLevels(source):
  R.previewExpense(source,a['--sample-dates'].split(','),Number(a['--base-expense-yen']));
 process.stdout.write(JSON.stringify(result,null,2)+'\n');return result;
}
if(require.main===module)try{main()}catch(e){console.error('ANALYTICS_CPI_V028_BLOCKED: '+e.message);process.exitCode=2;}
module.exports={parse,main};
