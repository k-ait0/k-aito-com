'use strict';
/** v0.23: P0 cross-engine pension termination contract. No market data or keys. */
const test=require('node:test'),assert=require('node:assert/strict');
const {buildRelativeMonthlyCashflows,runRollingPortfolioLifecycle}=require('../lib/analytics/rolling-portfolio-lifecycle.cjs');
const {runRollingLifecycleCashflow}=require('../lib/analytics/rolling-lifecycle.cjs');
const {makeSyntheticFlatPath}=require('../lib/analytics/cashflow-core.cjs');
function pension(endContract={},start=1){return {id:'Pension',start_offset_months:start,...endContract,monthly_yen:100};}
function plan(p,h=4){return buildRelativeMonthlyCashflows({monthly_withdrawal_yen:25,relative_pension_schedule:[p]},h).map(x=>x.breakdown.pension_yen);}
function old(p,h=4){return runRollingLifecycleCashflow({monthly_returns:makeSyntheticFlatPath({start_month:'2020-01',months:h,monthly_return:0}),market_mode:'SYNTHETIC_DEMO',horizon_months:h,initial_assets_yen:1000,monthly_withdrawal_yen:25,relative_pension_schedule:[p]});}
function multi(p,h=4){return runRollingPortfolioLifecycle({monthly_market_returns:makeSyntheticFlatPath({start_month:'2020-01',months:h,monthly_return:0}).map(x=>({month:x.month,origin:'SYNTHETIC',asset_returns:{STOCK:0}})),horizon_months:h,portfolio:{initial_holdings_yen:{STOCK:1000},target_weights:{STOCK:1}},cashflow_plan:{monthly_withdrawal_yen:25,relative_pension_schedule:[p]}});}
function compare(p,h=4){const a=old(p,h),b=multi(p,h);assert.equal(a.complete_windows,1);assert.equal(b.complete_windows,1);assert.equal(a.windows[0].ending_assets_yen,b.windows[0].ending_assets_yen);return a.windows[0].ending_assets_yen;}
test('new exclusive end is excluded at its boundary',()=>assert.deepEqual(plan(pension({end_offset_exclusive:2})),[0,100,0,0]));
test('old inclusive end continues to include that month',()=>assert.deepEqual(plan(pension({end_offset_months:2})),[0,100,100,0]));
test('exclusive horizon end is legal and includes last month',()=>assert.deepEqual(plan(pension({end_offset_exclusive:4})),[0,100,100,100]));
test('no end continues through last month',()=>assert.deepEqual(plan(pension()),[0,100,100,100]));
test('explicit exclusive end of one month is allowed',()=>assert.deepEqual(plan(pension({end_offset_exclusive:2},1)),[0,100,0,0]));
test('inclusive final month is allowed as legacy',()=>assert.deepEqual(plan(pension({end_offset_months:3})),[0,100,100,100]));
test('legacy inclusive horizon index is forbidden',()=>assert.throws(()=>plan(pension({end_offset_months:4})),/outside rolling horizon/));
test('both aliases always rejected even for identical interpretation',()=>assert.throws(()=>plan(pension({end_offset_months:1,end_offset_exclusive:2})),/Ambiguous pension/));
test('zero-length exclusive pension rejected',()=>assert.throws(()=>plan(pension({end_offset_exclusive:1})),/before start/));
test('negative and fractional exclusive offsets rejected',()=>{for(const n of [-1,2.4,NaN,Infinity,'3'])assert.throws(()=>plan(pension({end_offset_exclusive:n})),/end_offset_exclusive/);});
test('old and multi engine agree for exclusive window',()=>assert.equal(compare(pension({end_offset_exclusive:2})),1000-100+100));
test('old and multi engine agree for inclusive window',()=>assert.equal(compare(pension({end_offset_months:2})),1000-100+200));
test('old and multi agree when pension continues',()=>assert.equal(compare(pension()),1000-100+300));
test('old and multi agree at exclusive horizon boundary',()=>assert.equal(compare(pension({end_offset_exclusive:4})),1000-100+300));
test('single asset engine rejects ambiguous inclusive/exclusive aliases',()=>assert.throws(()=>old(pension({end_offset_months:1,end_offset_exclusive:2})),/Ambiguous pension/));
test('single asset engine rejects zero-length exclusive end',()=>assert.throws(()=>old(pension({end_offset_exclusive:1})),/before start/));
test('exclusive pension timing is relative to every rolling start',()=>{
 const market=Array.from({length:6},(_,i)=>({month:'2020-'+String(i+1).padStart(2,'0'),origin:'SYNTHETIC',asset_returns:{STOCK:0}}));
 const r=runRollingPortfolioLifecycle({monthly_market_returns:market,horizon_months:4,portfolio:{initial_holdings_yen:{STOCK:1000},target_weights:{STOCK:1}},cashflow_plan:{monthly_withdrawal_yen:25,relative_pension_schedule:[pension({end_offset_exclusive:2})]}});
 assert.equal(r.complete_windows,3);assert.deepEqual(r.windows.map(w=>w.ending_assets_yen),[1000,1000,1000]);
});
test('legacy pension timing unchanged in rolling starts',()=>{
 const market=Array.from({length:6},(_,i)=>({month:'2020-'+String(i+1).padStart(2,'0'),origin:'SYNTHETIC',asset_returns:{STOCK:0}}));
 const r=runRollingPortfolioLifecycle({monthly_market_returns:market,horizon_months:4,portfolio:{initial_holdings_yen:{STOCK:1000},target_weights:{STOCK:1}},cashflow_plan:{monthly_withdrawal_yen:25,relative_pension_schedule:[pension({end_offset_months:2})]}});
 assert.equal(r.complete_windows,3);assert.deepEqual(r.windows.map(w=>w.ending_assets_yen),[1100,1100,1100]);
});
