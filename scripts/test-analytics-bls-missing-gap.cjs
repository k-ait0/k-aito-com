#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {parseBlsCpiWithKnownMissing}=require('./analytics-data-parsers.cjs');
const wrap=data=>({status:'REQUEST_SUCCEEDED',Results:{series:[{seriesID:'CUUR0000SA0',data}]}});
const obs=Array.from({length:12},(_,i)=>({year:'2025',period:'M'+String(i+1).padStart(2,'0'),value:i===9?'-':String(300+i/10)}));
function test(){
 let n=0;const check=f=>{f();n++;};
 check(()=>{const r=parseBlsCpiWithKnownMissing(wrap(obs),2025,2025);assert.equal(r.observations.length,11);assert.deepEqual(r.missing_months,['2025-10']);});
 check(()=>assert.throws(()=>parseBlsCpiWithKnownMissing(wrap(obs.filter(r=>r.period!=='M10')),2025,2025),/without official explicit missing marker/));
 check(()=>assert.throws(()=>parseBlsCpiWithKnownMissing(wrap(obs.map(r=>r.period==='M09'?{...r,value:'-'}:r)),2025,2025),/Undocumented missing/));
 check(()=>assert.throws(()=>parseBlsCpiWithKnownMissing(wrap([...obs,obs[0]]),2025,2025),/Duplicate/));
 check(()=>assert.throws(()=>parseBlsCpiWithKnownMissing(wrap(obs.filter(r=>r.period!=='M02')),2025,2025),/without official explicit missing marker/));
 check(()=>{const r=parseBlsCpiWithKnownMissing(wrap(obs.map(r=>r.period==='M10'?{...r,value:'309.9'}:r)),2025,2025);assert.equal(r.observations.length,12);assert.equal(r.missing_months.length,0);});
 console.log('PASS '+n+'/'+n+' BLS known-missing gap assertions');
}
if(require.main===module)test();
module.exports={test};
