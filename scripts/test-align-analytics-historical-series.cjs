#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {buildJpyHistoricalPath}=require('./align-analytics-historical-series.cjs');
const base={
 cpiCountry:'JP',fxQuote:'JPY_PER_USD',
 usdReturns:[{month:'2022-01',approx_total_return_usd:0.01},{month:'2022-02',approx_total_return_usd:0.03},{month:'2022-03',approx_total_return_usd:-0.01}],
 monthlyFx:[{month:'2022-01',value:110,month_status:'COMPLETE_OBSERVED'},{month:'2022-02',value:111,month_status:'COMPLETE_OBSERVED'},{month:'2022-03',value:112,month_status:'COMPLETE_OBSERVED'}],
 monthlyCpi:[{month:'2022-01',value:101},{month:'2022-02',value:102},{month:'2022-03',value:103}]
};
const clone=o=>JSON.parse(JSON.stringify(o));let n=0;
function ok(desc,action){action();n++;console.log('PASS '+desc)}
ok('2 returns from 3 common months',()=>assert.equal(buildJpyHistoricalPath(base).rows.length,2));
ok('exact FX multiplication',()=>{const r=buildJpyHistoricalPath(base).rows[0].jpyNominalReturn;assert.ok(Math.abs(r-((1.03)*(111/110)-1))<1e-12)});
ok('CPI real deflator',()=>{const r=buildJpyHistoricalPath(base).rows[0];assert.ok(Math.abs(r.jpyRealReturn-((1+r.jpyNominalReturn)/(102/101)-1))<1e-12)});
ok('provisional month excluded',()=>{const x=clone(base);x.monthlyFx[2].month_status='LATEST_MONTH_PROVISIONAL';assert.equal(buildJpyHistoricalPath(x).meta.fx_provisional_excluded,1);assert.equal(buildJpyHistoricalPath(x).rows.length,1)});
ok('all months provisional rejected',()=>{const x=clone(base);x.monthlyFx.forEach(v=>v.month_status='LATEST_MONTH_PROVISIONAL');assert.throws(()=>buildJpyHistoricalPath(x),/overlap|Empty series/)});
ok('missing CPI month not filled',()=>{const x=clone(base);x.monthlyCpi.splice(1,1);assert.throws(()=>buildJpyHistoricalPath(x),/Gap/)});
ok('missing FX month not filled',()=>{const x=clone(base);x.monthlyFx.splice(1,1);assert.throws(()=>buildJpyHistoricalPath(x),/Gap/)});
ok('zero exchange rate rejected',()=>{const x=clone(base);x.monthlyFx[1].value=0;assert.throws(()=>buildJpyHistoricalPath(x),/Nonpositive/)});
ok('duplicate month rejected',()=>{const x=clone(base);x.monthlyFx.push(x.monthlyFx[1]);assert.throws(()=>buildJpyHistoricalPath(x),/Duplicate/)});
ok('missing overlap rejected',()=>{const x=clone(base);x.monthlyFx=x.monthlyFx.map(y=>({...y,month:y.month.replace('2022','2026')}));assert.throws(()=>buildJpyHistoricalPath(x),/overlap/)});
ok('reject US CPI misapplied to JPY purchasing power',()=>{const x=clone(base);x.cpiCountry='US';assert.throws(()=>buildJpyHistoricalPath(x),/Japan CPI/)});
ok('reject inverse USDJPY quotes',()=>{const x=clone(base);x.fxQuote='USD_PER_JPY';assert.throws(()=>buildJpyHistoricalPath(x),/JPY per USD/)});
ok('future probability not claimed',()=>assert.equal(buildJpyHistoricalPath(base).meta.rights,'PRIVATE_RESEARCH_ONLY'));
console.log('PASS '+n+'/'+n+' tests');
