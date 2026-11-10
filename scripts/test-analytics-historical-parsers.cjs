#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {parseFedH10,parseBlsCpi,normalizeFedMonthly,verifyXlsxSignature}=require('./analytics-data-parsers.cjs');
function runSelfTests(){
 const table='<h1>Historical Rates for the Japanese Yen</h1><table><tr><td>29-SEP-26</td><td>158.8800</td></tr><tr><td>30-SEP-26</td><td>ND</td></tr><tr><td>1-OCT-26</td><td>157.6300</td></tr><tr><td>30-OCT-26</td><td>157.4700</td></tr><tr><td>2-NOV-26</td><td>157.8100</td></tr></table>';
 const r=parseFedH10(table);
 assert.equal(r.length,5);assert.equal(r[0].date,'2026-09-29');assert.equal(r[1].value,'');assert.equal(r[1].status,'ND');assert.equal(r.at(-1).value,'157.8100');
 assert.deepEqual(normalizeFedMonthly(r).map(x=>x.date),['2026-09-29','2026-10-30','2026-11-02']);
 assert.throws(()=>parseFedH10('<h1>Another currency</h1>'+table.replace('Historical Rates for the Japanese Yen','x')));
 assert.throws(()=>parseFedH10(table.replace('2-NOV-26','29-SEP-26')),/Duplicate/);
 assert.throws(()=>parseFedH10(table.replace('30-OCT-26','31-FEB-26')),/Invalid ISO/);
 assert.throws(()=>normalizeFedMonthly(r.filter(x=>x.date.slice(5,7)!=='10')),/Missing entire/);
 const bls=(data)=>({status:'REQUEST_SUCCEEDED',Results:{series:[{seriesID:'CUUR0000SA0',data}]}});
 const obs=[...Array(12)].map((_,i)=>({year:'2019',period:'M'+String(i+1).padStart(2,'0'),value:String(250+i/10)}));
 assert.equal(parseBlsCpi(bls(obs),2019,2019).length,12);
 assert.throws(()=>parseBlsCpi(bls(obs.slice(1)),2019,2019),/start year/);
 assert.throws(()=>parseBlsCpi(bls(obs.filter(x=>x.period!=='M05')),2019,2019),/missing month/);
 assert.throws(()=>parseBlsCpi({status:'REQUEST_FAILED',Results:[]},2019,2019),/did not succeed/);
 assert.throws(()=>parseBlsCpi(bls([...obs,obs[0]]),2019,2019),/Duplicate/);
 const tiny=Buffer.from([0x50,0x4b,0x03,0x04]);assert.throws(()=>verifyXlsxSignature(tiny),/Expected/);
 verifyXlsxSignature(Buffer.concat([tiny,Buffer.alloc(5000)]));
 console.log('PASS: 12/12 parser and integrity assertions (including failure cases)');
}
if(require.main===module)runSelfTests();module.exports={runSelfTests};
