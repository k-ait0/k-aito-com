#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadResearchRows,prepareReturns,rollingStats,buildReport}=require('./prepare-analytics-shiller-research.cjs');
const header='month,sp500_price_index,annualized_dividend_index_points,us_cpi_index\n';
const demo=header+'2020-01,100.00,12.00,250.00\n2020-02,102.00,12.00,252.00\n2020-03,98.00,12.00,253.00\n';
let checks=0;
function test(label,fn){fn();checks++;console.log('PASS '+label)}
test('3 source rows',()=>assert.equal(loadResearchRows(demo).length,3));
test('returns n-1',()=>assert.equal(prepareReturns(loadResearchRows(demo)).length,2));
test('monthly dividend approximation',()=>assert.ok(Math.abs(prepareReturns(loadResearchRows(demo))[0].approx_total_return_usd-0.03)<1e-10));
test('real CPI correctly deflated',()=>{const a=prepareReturns(loadResearchRows(demo))[0];assert.ok(Math.abs(a.approx_real_return_usd-(1.03/(252/250)-1))<1e-10)});
test('disallow missing month',()=>assert.throws(()=>loadResearchRows(demo.replace('2020-03','2020-04')),/Missing/));
test('disallow duplicate month',()=>assert.throws(()=>loadResearchRows(demo.replace('2020-03','2020-02')),/Missing/));
test('disallow unexpected data header',()=>assert.throws(()=>loadResearchRows(demo.replace('sp500_price_index','close')),/header/));
test('disallow invalid CPI',()=>assert.throws(()=>loadResearchRows(demo.replace('252.00','0.00')),/Invalid/));
test('disallow invalid negative dividend',()=>assert.throws(()=>loadResearchRows(demo.replace('12.00','-1.00')),/Invalid/));
test('one rolling window',()=>assert.equal(rollingStats(prepareReturns(loadResearchRows(demo)),2).complete_windows,1));
test('no complete rolling window',()=>assert.equal(rollingStats(prepareReturns(loadResearchRows(demo)),360).complete_windows,0));
test('dataset marked nonpublishable',()=>assert.equal(buildReport(Buffer.from(demo)).report.site_publication_approved,false));
if(process.argv[2]){
 const raw=fs.readFileSync(path.resolve(process.argv[2])),{input,returns,report}=buildReport(raw);
 test('real historical 522 months',()=>assert.equal(input.length,522));
 test('real historical 521 returns',()=>assert.equal(returns.length,521));
 test('sha256 historical recovered source matches',()=>assert.equal(report.raw_sha256,'0cdb8a04bd14d104e53acbb982cf205eb4733371bb9140191b8c4b6e433bc55d'));
 test('historical 30y complete rolling windows 162',()=>assert.equal(report.rolling_windows.find(x=>x.horizon_months===360).complete_windows,162));
}
console.log('PASS '+checks+'/'+checks+' tests');
