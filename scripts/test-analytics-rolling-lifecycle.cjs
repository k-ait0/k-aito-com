'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {runRollingLifecycleCashflow}=require('../lib/analytics/rolling-lifecycle.cjs');
const {makeSyntheticFlatPath}=require('../lib/analytics/cashflow-core.cjs');
const observed=(months,rate=0,start='2020-01')=>makeSyntheticFlatPath({start_month:start,months,monthly_return:rate}).map(x=>({...x,origin:'OBSERVED'}));
const input={monthly_returns:observed(5),horizon_months:3,initial_assets_yen:1000,monthly_withdrawal_yen:100};
const run=(extra={})=>runRollingLifecycleCashflow({...input,...extra});
test('three 3-month windows from five monthly observed returns',()=>{
 const x=run();assert.equal(x.complete_windows,3);assert.equal(x.funded_windows,3);
 assert.deepEqual(x.windows.map(x=>x.market_start_month),['2020-01','2020-02','2020-03']);
 assert.equal(x.windows[0].ending_assets_yen,700);
});
test('pension starts at month offset one in EVERY historical window',()=>{
 const x=run({relative_pension_schedule:[{id:'p',start_offset_months:1,monthly_yen:80}]});
 assert.deepEqual(x.windows.map(w=>w.ending_assets_yen),[860,860,860]);
});
test('pension inclusive relative end offset, follows shifting window',()=>{
 const x=run({relative_pension_schedule:[{id:'p',start_offset_months:1,end_offset_months:1,monthly_yen:80}]});
 assert.deepEqual(x.windows.map(w=>w.ending_assets_yen),[780,780,780]);
});
test('extra expense at offset zero uniformly reduces final balance',()=>{
 const x=run({relative_one_time_events:[{id:'repair',offset_months:0,kind:'EXPENSE',amount_yen:200}]});
 assert.deepEqual(x.windows.map(w=>w.ending_assets_yen),[500,500,500]);
});
test('income at last offset is applied in each window',()=>{
 const x=run({relative_one_time_events:[{id:'gift',offset_months:2,kind:'INCOME',amount_yen:300}]});
 assert.deepEqual(x.windows.map(w=>w.ending_assets_yen),[1000,1000,1000]);
});
test('inflation index resets at the beginning of each window',()=>{
 const x=run({monthly_returns:observed(15),horizon_months:13,annual_expense_inflation:0.1});
 assert.equal(x.complete_windows,3);
 assert.deepEqual(x.windows.map(w=>w.ending_assets_yen),[0,0,0]);
 assert.equal(x.windows[0].total_unfunded_yen,x.windows[1].total_unfunded_yen);
});
test('rolling observed market stress changes outcomes across windows',()=>{
 const rates=observed(4);rates[0].monthly_return=-0.5;
 const x=run({monthly_returns:rates,horizon_months:2,initial_assets_yen:1000});
 assert.equal(x.windows[0].ending_assets_yen,350);
 assert.equal(x.windows[1].ending_assets_yen,800);
 assert.equal(x.windows[2].ending_assets_yen,800);
});
test('missing months exclude cross-gap starts, not count as failed',()=>{
 const s=observed(2).concat(observed(2,0,'2020-04'));
 const x=run({monthly_returns:s,horizon_months:2});
 assert.equal(x.gap_boundaries,1);assert.equal(x.complete_windows,2);
 assert.equal(x.theoretical_windows_if_no_gaps,4);assert.equal(x.excluded_windows_due_to_missing_months,2);
 assert.equal(x.historical_funded_fraction,1);
});
test('zero eligible start months is unknown rather than zero survival chance',()=>{
 const x=run({monthly_returns:observed(3),horizon_months:4});
 assert.equal(x.complete_windows,0);assert.equal(x.historical_funded_fraction,null);
 assert.equal(x.status,'INSUFFICIENT_CONTIGUOUS_HISTORY');
});
test('no future forecasting or production approval claimed',()=>{
 const x=run();assert.equal(x.future_probability_claim,false);
 assert.equal(x.publication_approved,false);assert.equal(x.life_plan_provenance,'SYNTHETIC_ASSUMPTIONS');
});
test('relative-month offsets must be within the horizon',()=>{
 for(const off of [-1,3,1.5])assert.throws(()=>run({relative_one_time_events:[{id:'x',offset_months:off,kind:'EXPENSE',amount_yen:5}]}),/(offset_months|outside)/);
});
test('absolute historical dates disallowed in relative events',()=>assert.throws(()=>run({relative_one_time_events:[{id:'x',month:'2020-01',offset_months:0,kind:'EXPENSE',amount_yen:5}]}),/Unsupported event/));
test('absolute pension start date is rejected',()=>assert.throws(()=>run({relative_pension_schedule:[{id:'p',start_month:'2020-01',start_offset_months:1,monthly_yen:5}]}),/Unsupported pension/));
test('pension schedules cannot be outside rolling horizon',()=>assert.throws(()=>run({relative_pension_schedule:[{id:'p',start_offset_months:3,monthly_yen:5}]}),/outside/));
test('duplicate pension and event IDs rejected independently',()=>{
 assert.throws(()=>run({relative_pension_schedule:[{id:'p',start_offset_months:0,monthly_yen:5},{id:'p',start_offset_months:1,monthly_yen:10}]}),/Duplicate pension/);
 assert.throws(()=>run({relative_one_time_events:[{id:'x',offset_months:0,kind:'EXPENSE',amount_yen:5},{id:'x',offset_months:1,kind:'EXPENSE',amount_yen:10}]}),/Duplicate event/);
});
test('synthetic and estimated market input rejected',()=>{
 assert.throws(()=>run({monthly_returns:makeSyntheticFlatPath({start_month:'2020-01',months:3,monthly_return:0})}),/Mixed/);
 const s=observed(3);s[0].estimated=true;
 assert.throws(()=>run({monthly_returns:s}),/estimated/);
});
test('non-financial overrides are rejected',()=>{
 assert.throws(()=>run({tax_rate:0.2}),/Unsupported rolling lifecycle input/);
 assert.throws(()=>run({monthly_withdrawal_yen:-1}),/nonnegative/);
});
test('invalid horizon and event amounts rejected',()=>{
 assert.throws(()=>run({horizon_months:0}),/horizon_months/);
 assert.throws(()=>run({relative_one_time_events:[{id:'x',offset_months:0,kind:'INCOME',amount_yen:-10}]}),/nonnegative/);
});
test('long history theoretical counts agree with 30y 162 starts, no fabricated prices',()=>{
 const x=run({monthly_returns:observed(521,0,'1980-02'),horizon_months:360,
   initial_assets_yen:40000,monthly_withdrawal_yen:100});
 assert.equal(x.complete_windows,162);
 assert.equal(x.funded_windows,162);
 assert.equal(x.theoretical_windows_if_no_gaps,162);
});
test('out-of-order month and NaN observed return rejected',()=>{
 let s=observed(3);[s[1],s[2]]=[s[2],s[1]];
 assert.throws(()=>run({monthly_returns:s}),/out-of-order/);
 s=observed(3);s[1].monthly_return=NaN;
 assert.throws(()=>run({monthly_returns:s}),/Invalid monthly return/);
});
