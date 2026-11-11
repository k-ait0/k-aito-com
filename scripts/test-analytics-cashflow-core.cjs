'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {monthSerial,formatMonth,simulateMonthlyCashflow,runRollingCashflow,makeSyntheticFlatPath}=
  require('../lib/analytics/cashflow-core.cjs');
const path=(rs,origin='OBSERVED')=>rs.map(([month,monthly_return])=>({month,monthly_return,origin}));
const basics={initial_assets_yen:1000,monthly_withdrawal_yen:100,monthly_contribution_yen:0};
test('calendar roundtrip including year boundary',()=>{assert.equal(formatMonth(monthSerial('2027-01')-1),'2026-12')});
test('reject malformed calendar month',()=>assert.throws(()=>monthSerial('2026-13'),/Invalid month/));
test('flat returns and month-start withdrawal, no taxes',()=>{
 const o=simulateMonthlyCashflow({...basics,monthly_returns:makeSyntheticFlatPath({start_month:'2026-01',months:3,monthly_return:0})});
 assert.equal(o.ending_assets_yen,700);assert.equal(o.status,'FUNDED');assert.equal(o.rows[0].closing_yen,900);
});
test('withdrawal is before investment return',()=>{
 const o=simulateMonthlyCashflow({...basics,monthly_returns:makeSyntheticFlatPath({start_month:'2026-01',months:1,monthly_return:.10})});
 assert.equal(o.ending_assets_yen,990);assert.equal(o.rows[0].investment_gain_yen,90);
});
test('contribution precedes withdrawal and return',()=>{
 const o=simulateMonthlyCashflow({...basics,initial_assets_yen:0,monthly_contribution_yen:200,
  monthly_returns:makeSyntheticFlatPath({start_month:'2026-01',months:1,monthly_return:0.10})});
 assert.equal(o.ending_assets_yen,110);
});
test('shortfall never creates negative balance',()=>{
 const o=simulateMonthlyCashflow({...basics,initial_assets_yen:50,
 monthly_returns:makeSyntheticFlatPath({start_month:'2026-01',months:2,monthly_return:0})});
 assert.equal(o.status,'SHORTFALL');assert.equal(o.first_shortfall_month,'2026-01');
 assert.equal(o.total_unfunded_yen,150);assert.equal(o.ending_assets_yen,0);
});
test('a -100% return wipes invested funds at month end',()=>{
 const o=simulateMonthlyCashflow({...basics,monthly_returns:makeSyntheticFlatPath({start_month:'2026-01',months:2,monthly_return:-1})});
 assert.equal(o.rows[0].closing_yen,0);assert.equal(o.first_shortfall_month,'2026-02');
});
test('reject months with gaps in one simulation path',()=>assert.throws(()=>simulateMonthlyCashflow({
 ...basics,provenance:'OBSERVED',monthly_returns:path([['2020-01',0],['2020-03',0]])}),/Missing month/));
test('reject duplicate or reversed monthly records',()=>assert.throws(()=>runRollingCashflow({
 ...basics,horizon_months:1,monthly_returns:path([['2020-01',0],['2020-01',0]])}),/Duplicate/));
test('reject proxy and estimated in observed history',()=>{
 const data=path([['2020-01',0]]);data[0].proxy=true;
 assert.throws(()=>runRollingCashflow({...basics,horizon_months:1,monthly_returns:data}),/proxy/);
 const estimated=path([['2020-01',0]]);estimated[0].estimated=true;
 assert.throws(()=>runRollingCashflow({...basics,horizon_months:1,monthly_returns:estimated}),/estimated/);
});
test('reject synthetic pretending to be observed',()=>assert.throws(()=>runRollingCashflow({
 ...basics,horizon_months:1,monthly_returns:makeSyntheticFlatPath({start_month:'2020-01',months:1,monthly_return:0})}),/Mixed/));
test('reject NaN and non-numeric returns',()=>{
 for(const val of [NaN,Infinity,'0.01'])assert.throws(()=>simulateMonthlyCashflow({...basics,provenance:'OBSERVED',monthly_returns:path([['2020-01',val]])}),/Invalid monthly return/);
});
test('reject amounts with fractional yen or unsafe magnitude',()=>{
 for(const val of [0.2,-1,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>simulateMonthlyCashflow({...basics,initial_assets_yen:val,
  monthly_returns:path([['2020-01',0]])}),/safe integer/);
});
test('reject overflow even when original amount is safe',()=>{
 assert.throws(()=>simulateMonthlyCashflow({...basics,initial_assets_yen:Number.MAX_SAFE_INTEGER,
  provenance:'OBSERVED',monthly_returns:path([['2020-01',1]])}),/Unsafe monetary result/);
});
test('rolling backtest enumerates overlapping complete windows',()=>{
 const o=runRollingCashflow({...basics,monthly_returns:path([['2020-01',0],['2020-02',0],['2020-03',0],['2020-04',0]]),horizon_months:3});
 assert.equal(o.complete_windows,2);assert.equal(o.funded_windows,2);assert.equal(o.windows[1].start_month,'2020-02');
 assert.equal(o.observed_funded_fraction,1);assert.equal(o.publication_approved,false);
});
test('rolling backtest skips cross-gap windows instead of marking failure',()=>{
 const o=runRollingCashflow({...basics,monthly_returns:path([['2020-01',0],['2020-02',0],['2020-04',0],['2020-05',0]]),horizon_months:2});
 assert.equal(o.theoretical_windows_if_no_gaps,4);assert.equal(o.complete_windows,2);
 assert.equal(o.excluded_windows_due_to_missing_months,2);assert.equal(o.gap_boundaries,1);
});
test('short history returns null, not zero probability',()=>{
 const o=runRollingCashflow({...basics,monthly_returns:path([['2020-01',0],['2020-02',0]]),horizon_months:3});
 assert.equal(o.status,'INSUFFICIENT_CONTIGUOUS_HISTORY');assert.equal(o.observed_funded_fraction,null);
});
test('observed funded fraction is not labeled forecast probability',()=>{
 const o=runRollingCashflow({...basics,initial_assets_yen:100,monthly_withdrawal_yen:100,
  monthly_returns:path([['2020-01',0],['2020-02',1],['2020-03',0]]),horizon_months:2});
 assert.equal(o.funded_windows,0);assert.equal(o.shortfall_windows,2);
 assert.match(o.research_disclaimer,/not independent trials or future probabilities/);
});

test('522 monthly levels imply 521 monthly returns and 162 complete 30-year windows',()=>{
 const observed=makeSyntheticFlatPath({start_month:'1980-02',months:521,monthly_return:0})
   .map(x=>({...x,origin:'OBSERVED'}));
 const o=runRollingCashflow({...basics,monthly_returns:observed,horizon_months:360});
 assert.equal(o.complete_windows,162);
 assert.equal(o.observed_return_months,521);
 assert.equal(o.theoretical_windows_if_no_gaps,162);
});
test('per-month whole-yen rounding is explicitly deterministic',()=>{
 const o=simulateMonthlyCashflow({initial_assets_yen:1000,monthly_withdrawal_yen:0,
 monthly_returns:makeSyntheticFlatPath({start_month:'2026-01',months:2,monthly_return:0.05})});
 assert.equal(o.rows[0].closing_yen,1050);assert.equal(o.rows[1].closing_yen,1103);
});
