'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const S=require('../lib/analytics/public-shiller-withdrawal-boundary-v22.cjs');
const X=require('../lib/analytics/public-shiller-withdrawal-stress-v21.cjs');
const C=require('./run-analytics-public-withdrawal-boundary-v22.cjs');
const fixture=(n=24,{annualMonthlyCpi=1,price=100,div=0}={})=>Array.from({length:n},(_,i)=>({
 month:String(2000+Math.floor(i/12))+'-'+String(i%12+1).padStart(2,'0'),price,dividend:div,cpi:100*annualMonthlyCpi**i
}));
function run(rows,start,horizon,rate,mode,capital=100000){return S.checkedRun(rows,start,horizon,rate,mode,capital)}
test('v22 0.1bp units denominator 100000, not 10000',()=>{
 const r=run(fixture(),2,2,300,'FIXED_NOMINAL');assert.equal(r.total_requested_units,600);assert.equal(r.ending_units,99400);
});
test('v22 flat market monthly maximum is exact and next 0.1bp fails',()=>{
 const rows=fixture(),max=S.maxFundedRate(rows,2,12,'FIXED_NOMINAL');assert.equal(max,8333);
 assert.equal(run(rows,2,12,max,'FIXED_NOMINAL').funded,true);
 assert.equal(run(rows,2,12,max+1,'FIXED_NOMINAL').funded,false);
});
test('v22 CPI constant => same fixed and indexed ceiling for all 12-month starts',()=>{
 const r=S.compare(fixture(28),{horizons:[12]});assert.equal(r.horizons[0].paired_starts_equal,15);
 assert.equal(r.horizons[0].paired_fixed_minus_cpi_ceiling_tenth_bps.median,0);
});
test('v22 rising CPI cuts max indexed withdrawal',()=>{
 const r=S.compare(fixture(26,{annualMonthlyCpi:1.05}),{horizons:[12]});
 assert.equal(r.horizons[0].paired_starts_fixed_greater,13);
 assert.equal(r.horizons[0].paired_starts_cpi_greater,0);
});
test('v22 declining CPI may make indexed withdrawals easier, no forced direction',()=>{
 const r=S.compare(fixture(26,{annualMonthlyCpi:0.995}),{horizons:[12]});
 assert.equal(r.horizons[0].paired_starts_cpi_greater,13);
});
test('v22 exactly same fixed expenses as v21 at whole bp rate for many windows',()=>{
 const rows=X.validateRows(fixture(36,{price:102,div:5}));
 for(const mode of S.MODES)for(const start of [2,3,9])for(const horizon of [3,12,20])for(const bps of [0,25,30,50,100,300]){
  const a=S.rawRun(rows,start,horizon,bps*10,mode,100000),b=X.runWindow(rows,start,horizon,bps,mode,100000);
  assert.deepEqual({funded:a.funded,ending_units:a.ending_units,total_unfunded_units:a.total_unfunded_units},
  {funded:b.funded,ending_units:b.ending_units,total_unfunded_units:b.total_unfunded_units});
 }
});
test('v22 near-100% withdrawal bracket cannot be fully funded on 12mo study',()=>{
 const rows=fixture();assert.equal(run(rows,2,12,100000,'FIXED_NOMINAL').funded,false);
});
test('v22 reports exactly paired start months with fixed minimum history',()=>{
 const r=S.compare(fixture(30),{horizons:[12,24]});
 assert.deepEqual(r.horizons.map(x=>x.complete_overlapping_windows),[17,5]);
 assert.equal(r.horizons[0].first_start,'2000-03');assert.equal(r.horizons[0].last_start,'2001-07');
 assert.equal(r.horizons[0].publication_approved,undefined);assert.equal(r.publication_approved,false);
});
test('v22 threshold counts reproduce v21 at 0.30 / 0.50 / 1.00% on synthetic',()=>{
 const rows=fixture(28,{annualMonthlyCpi:1.01}), old=X.summarize(rows,{horizons:[12],withdrawalBps:[30,50,100]}),newr=S.compare(rows,{horizons:[12]});
 const s=newr.horizons[0];
 for(const [bps,prefix] of [[30,'0_30'],[50,'0_50'],[100,'1_00']]){
  for(const [mode,suffix] of [['FIXED_NOMINAL','fixed'],['US_CPI_LAG_2_MONTHS','cpi']]){
    const reference=old.summaries.find(x=>x.monthly_initial_withdrawal_bps===bps&&x.expense_model===mode);
    assert.equal(s['historical_funded_at_'+prefix+'pct_monthly_'+suffix],reference.fully_funded_windows);
  }
 }
});
test('v22 all supplied values must be date-contiguous and finite',()=>{
 const rows=fixture();rows[2].price=0;assert.throws(()=>S.compare(rows,{horizons:[12]}),/Invalid price/);
});
test('v22 throws on missing months',()=>{
 const rows=fixture();rows[5].month='2000-04';assert.throws(()=>S.compare(rows,{horizons:[12]}),/Gap\/repeated/);
});
test('v22 refuses unsupported proxy/estimated columns even when false',()=>{
 const rows=fixture();rows[0].proxy=false;assert.throws(()=>S.compare(rows,{horizons:[12]}),/Unexpected source field/);
});
test('v22 rejects invalid starts and rates',()=>{
 const rows=fixture();assert.throws(()=>run(rows,1,12,100,'FIXED_NOMINAL'),/Invalid start/);
 assert.throws(()=>run(rows,2,12,-1,'FIXED_NOMINAL'),/Invalid tenths/);
 assert.throws(()=>run(rows,2,12,100001,'FIXED_NOMINAL'),/Invalid tenths/);
 assert.throws(()=>run(rows,2,12,5.3,'FIXED_NOMINAL'),/Invalid tenths/);
});
test('v22 rejects unsupported horizons and expense modes',()=>{
 const rows=fixture();assert.throws(()=>S.compare(rows,{horizons:[0]}),/Invalid horizon/);
 assert.throws(()=>S.compare(rows,{horizons:[2,2]}),/Invalid horizon list/);
 assert.throws(()=>run(rows,2,12,10,'JPY_INFLATION'),/Unknown expense mode/);
});
test('v22 never reports future probability or investable / JPY data',()=>{
 const r=S.compare(fixture(),{horizons:[12]});
 assert.equal(r.forward_probability_not_estimated,true);assert.equal(r.cpi_is_us_not_jp,true);
 assert.equal(r.official_total_return,false);assert.equal(r.publication_approved,false);
});
test('v22 validates source pinned blob before historical study',()=>{
 assert.throws(()=>S.analyzePinnedRaw(Buffer.from('not source')),/SHA mismatch/);
});
test('v22 CLI accepts source or pinned fetch exclusively',()=>{
 assert.deepEqual(C.options(['--fetch-once','--out-dir','/tmp/o']),{'--fetch-once':true,'--out-dir':'/tmp/o'});
 assert.throws(()=>C.options(['--fetch-once','--source-file','/tmp/x','--out-dir','/tmp/o']),/Usage/);
 assert.throws(()=>C.options(['--source-file','/tmp/x']),/Usage/);
});
test('v22 CLI rejects unsafe checkout or relative destination',()=>{
 const repo=fs.realpathSync(path.resolve(__dirname,'..'));
 assert.throws(()=>C.safeDir(repo,repo),/overlaps/);
 assert.throws(()=>C.safeDir(repo,'relative'),/Absolute/);
});
test('v22 CLI rejects symlink folder even if points outside checkout',()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'analytics-v22-'));
 try{fs.symlinkSync(d,path.join(d,'link'),'dir');
   assert.throws(()=>C.safeDir('/tmp/not-this-repo',path.join(d,'link')),/Unsafe/);
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});
test('v22 no full-window series => no fabricated report',()=>{
 const r=S.compare(fixture(10),{horizons:[120]});assert.equal(r.horizons.length,0);
});
