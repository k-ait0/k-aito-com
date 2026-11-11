'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {runRollingLifecycleCashflow}=require('../lib/analytics/rolling-lifecycle.cjs');
const {compareRollingLifecyclePlans}=require('../lib/analytics/rolling-plan-compare.cjs');
const {makeSyntheticFlatPath}=require('../lib/analytics/cashflow-core.cjs');
const monthly_returns=makeSyntheticFlatPath({start_month:'2027-01',months:8,monthly_return:0});
const basic={monthly_returns,horizon_months:3,initial_assets_yen:300,monthly_withdrawal_yen:100};
const plans=[{id:'base',initial_assets_yen:300,monthly_withdrawal_yen:100},{id:'less',initial_assets_yen:300,monthly_withdrawal_yen:50}];
test('OBSERVED default rejects synthetic return paths',()=>assert.throws(()=>runRollingLifecycleCashflow(basic),/Mixed, proxy or estimated/));
test('synthetic demo is explicit and never claims observed history',()=>{
 const r=runRollingLifecycleCashflow({...basic,market_mode:'SYNTHETIC_DEMO'});
 assert.equal(r.complete_windows,6);assert.equal(r.funded_windows,6);
 assert.equal(r.market_provenance,'SYNTHETIC');assert.equal(r.historical_funded_fraction,null);
 assert.equal(r.demo_funded_fraction,1);assert.equal(r.future_probability_claim,false);assert.equal(r.publication_approved,false);
 assert.match(r.notice,/not observed histories/);
});
test('invalid mode rejected',()=>assert.throws(()=>runRollingLifecycleCashflow({...basic,market_mode:'FORECAST'}),/Unsupported market_mode/));
test('demo mode rejects data labeled OBSERVED',()=>assert.throws(()=>runRollingLifecycleCashflow({...basic,market_mode:'SYNTHETIC_DEMO',monthly_returns:monthly_returns.map(x=>({...x,origin:'OBSERVED'}))}),/Mixed, proxy or estimated/));
test('compare plans gives aligned simulated outcomes with demo-only fraction',()=>{
 const r=compareRollingLifecyclePlans({monthly_returns,horizon_months:3,market_mode:'SYNTHETIC_DEMO',plans});
 assert.equal(r.market_provenance,'SYNTHETIC');assert.equal(r.summary[0].historical_funded_fraction,null);
 assert.equal(r.summary[1].demo_funded_fraction,1);assert.equal(r.complete_windows,6);
 assert.equal(r.windows[0].scenarios[1].ending_assets_yen,150);
});
test('compare defaults to observed and rejects demo fixture',()=>assert.throws(()=>compareRollingLifecyclePlans({monthly_returns,horizon_months:3,plans}),/Mixed, proxy or estimated/));
test('demo gap windows excluded instead of counted as failures',()=>{
 const shortened=monthly_returns.filter(x=>x.month!=='2027-04');
 const r=runRollingLifecycleCashflow({...basic,market_mode:'SYNTHETIC_DEMO',monthly_returns:shortened});
 assert.equal(r.complete_windows,3);assert.equal(r.excluded_windows_due_to_missing_months,3);
 assert.equal(r.shortfall_windows,0);
});
test('observed mode still reports historical fraction only',()=>{
 const obs=monthly_returns.map(x=>({...x,origin:'OBSERVED'}));
 const r=runRollingLifecycleCashflow({...basic,monthly_returns:obs});
 assert.equal(r.historical_funded_fraction,1);assert.equal(r.demo_funded_fraction,null);
 assert.equal(r.market_provenance,'OBSERVED');
});
test('demo relative events apply to each rolling start',()=>{
 const r=runRollingLifecycleCashflow({...basic,market_mode:'SYNTHETIC_DEMO',relative_one_time_events:[{id:'repair',offset_months:1,kind:'EXPENSE',amount_yen:150}]});
 assert.equal(r.complete_windows,6);assert.equal(r.shortfall_windows,6);
 assert.equal(r.windows[0].first_shortfall_offset_months,1);
});
