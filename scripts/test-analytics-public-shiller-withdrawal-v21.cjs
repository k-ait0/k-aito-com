'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const X=require('../lib/analytics/public-shiller-withdrawal-stress-v21.cjs');
const run=(rows,start,horizon,bps,mode,capital=10000)=>X.runWindow(X.validateRows(rows),start,horizon,bps,mode,capital);
function sample(n=18){return Array.from({length:n},(_,i)=>({month:String(2020+Math.floor(i/12))+'-'+String(i%12+1).padStart(2,'0'),price:100,cpi:100+i,dividend:0}));}
test('v21 fixed nominal 3-month withdrawal with flat market',()=>{
 const o=run(sample(),2,3,100,'FIXED_NOMINAL');
 assert.equal(o.ending_units,9700);assert.equal(o.total_paid_units,300);assert.equal(o.total_requested_units,300);assert.equal(o.funded,true);
});
test('v21 2-month CPI lag (not contemporaneous CPI)',()=>{
 const rows=sample();
 // At t=2, CPI t-2=100, at t=3 CPI t-2=101 => 1% increase.
 const o=run(rows,2,2,500,'US_CPI_LAG_2_MONTHS');
 assert.equal(o.total_requested_units,1005);assert.equal(o.ending_units,8995);
});
test('v21 shortfall must not count as funded and assets cannot become negative',()=>{
 const o=run(sample(),2,3,5000,'FIXED_NOMINAL',1000);
 assert.equal(o.funded,false);assert.equal(o.ending_units,0);assert.equal(o.total_paid_units,1000);
 assert.equal(o.total_unfunded_units,500);assert.equal(o.first_shortfall_month,'2020-05');
});
test('v21 market dividend approximate adds 1% return via annualized dividend 12',()=>{
 const rows=sample();rows[2].dividend=12;
 const o=run(rows,2,1,0,'FIXED_NOMINAL');assert.equal(o.ending_units,10100);
});
test('v21 paired study windows skip earliest month requiring CPI t-2',()=>{
 const z=X.summarize(sample(18),{horizons:[12],withdrawalBps:[30],capital:10000});
 assert.equal(z.summaries.length,2);assert.equal(z.summaries[0].complete_overlapping_windows,5);
 assert.equal(z.summaries[1].complete_overlapping_windows,5);
 assert.equal(z.summaries[0].first_start,'2020-03');assert.equal(z.summaries[0].last_start,'2020-07');
 assert.equal(z.publication_approved,false);assert.equal(z.fx_applied,false);
});
test('v21 denominator basis points and same-start count',()=>{
 const z=X.summarize(sample(),{horizons:[12],withdrawalBps:[25,50]});
 for(const x of z.summaries)assert.equal(x.complete_overlapping_windows,5);
 assert.deepEqual([...new Set(z.summaries.map(x=>x.monthly_initial_withdrawal_pct))],[0.25,0.5]);
});
test('v21 rejects month gaps/duplicates',()=>{
 const rows=sample();rows[3].month='2020-04';rows[4].month='2020-04';
 assert.throws(()=>X.validateRows(rows),/Gap\/repeated/);
});
test('v21 rejects proxy/estimated or unexpected market fields',()=>{
 for(const patch of [{proxy:true},{estimated:true},{origin:'OBSERVED'},{model:'fake'}]){
 const rows=sample();Object.assign(rows[7],patch);assert.throws(()=>X.summarize(rows),/Unexpected source field/);
 }
});
test('v21 rejects invalid source prices, zero CPI, and malformed dates',()=>{
 for(const key of ['price','cpi','dividend']){
 const rows=sample();rows[2][key]=-2;assert.throws(()=>X.summarize(rows),/Invalid price/);
 }
 const rows=sample();rows[0].month='2020-13';assert.throws(()=>X.summarize(rows),/Invalid month/);
});
test('v21 rejects negative or huge return factors',()=>{
 const rows=sample();rows[2].price=9999;assert.throws(()=>run(rows,2,1,25,'FIXED_NOMINAL'),/Unreasonable/);
});
test('v21 requires two months of prehistory and proper nonempty windows',()=>{
 const rows=sample();assert.throws(()=>run(rows,1,12,25,'FIXED_NOMINAL'),/Bad window/);
 assert.throws(()=>run(rows,2,100,25,'FIXED_NOMINAL'),/Bad window/);
 assert.throws(()=>X.summarize(rows,{horizons:[0]}),/Bad horizon/);
});
test('v21 rejects invalid bps and expense modes',()=>{
 const rows=sample();assert.throws(()=>run(rows,2,12,10001,'FIXED_NOMINAL'),/Bad withdrawal/);
 assert.throws(()=>run(rows,2,12,25,'US_CPI_NOW'),/Unsupported expense/);
});
test('v21 rejects raw bytes with incorrect upstream pin',()=>{
 assert.throws(()=>X.analyzePinnedRaw(Buffer.from('fake source')),/Pinned public Git blob mismatch/);
});
test('v21 CLI argument validation',()=>{
 const C=require('./run-analytics-public-shiller-withdrawal-v21.cjs');
 assert.deepEqual(C.parse(['--source-file','/tmp/a','--out-dir','/tmp/b']),{'--source-file':'/tmp/a','--out-dir':'/tmp/b'});
 assert.deepEqual(C.parse(['--fetch-once','--out-dir','/tmp/b']),{'--fetch-once':true,'--out-dir':'/tmp/b'});
 assert.throws(()=>C.parse(['--fetch-once','--source-file','/tmp/a','--out-dir','/tmp/b']),/Usage/);
 assert.throws(()=>C.parse(['--source-file','/tmp/a']),/Usage/);
 assert.throws(()=>C.parse(['--source-file','/tmp/a','--source-file','/tmp/b','--out-dir','/tmp/x']),/Invalid CLI/);
});
