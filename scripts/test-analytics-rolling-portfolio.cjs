'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {formatMonth,monthSerial,makeSyntheticFlatPath}=require('../lib/analytics/cashflow-core.cjs');
const {simulateLifecycleCashflow}=require('../lib/analytics/lifecycle-core.cjs');
const {simulatePortfolio}=require('../lib/analytics/portfolio-core.cjs');
const {buildRelativeMonthlyCashflows,runRollingPortfolioLifecycle,validateMarketSeries}=
 require('../lib/analytics/rolling-portfolio-lifecycle.cjs');
const {compareRollingPortfolioPlans}=require('../lib/analytics/rolling-portfolio-compare.cjs');
const months=(n=5,offset=0,rates={STOCK:0,BOND:0},origin='SYNTHETIC')=>
 Array.from({length:n},(_,i)=>({month:formatMonth(monthSerial('1980-01')+i+offset),origin,asset_returns:{...rates}}));
const simple=(n=5,origin='SYNTHETIC')=>
 Array.from({length:n},(_,i)=>({month:formatMonth(monthSerial('1980-01')+i),origin,asset_returns:{STOCK:0}}));
const portfolio={initial_holdings_yen:{STOCK:600,BOND:400},target_weights:{STOCK:0.6,BOND:0.4}};
const cashflow_plan={monthly_withdrawal_yen:100,monthly_contribution_yen:0};
const run=(override={})=>runRollingPortfolioLifecycle({monthly_market_returns:months(),horizon_months:3,
 portfolio,cashflow_plan,...override});
test('new cashflow schedule leaves old v0.6 behavior unchanged',()=>{
 const rows=months(2);const x=simulatePortfolio({...portfolio,monthly_returns:rows,monthly_contribution_yen:20,monthly_withdrawal_yen:70});
 const y=simulatePortfolio({...portfolio,monthly_returns:rows,monthly_cashflows:rows.map(r=>({month:r.month,contribution_yen:20,withdrawal_yen:70}))});
 assert.deepEqual(x.rows.map(r=>r.closing_yen),y.rows.map(r=>r.closing_yen));
});
test('monthly schedule supports different values by month',()=>{
 const rows=months(2);
 const x=simulatePortfolio({...portfolio,monthly_returns:rows,monthly_cashflows:[{month:'1980-01',contribution_yen:50,withdrawal_yen:100},{month:'1980-02',contribution_yen:0,withdrawal_yen:200}]});
 assert.equal(x.ending_assets_yen,750);assert.equal(x.rows[0].contribution_yen,50);assert.equal(x.rows[1].requested_withdrawal_yen,200);
 assert.equal(x.cashflow_mode,'MONTHLY_SCHEDULE');
});
test('explicit null schedule is not silently ignored',()=>assert.throws(()=>simulatePortfolio({...portfolio,monthly_returns:months(1),monthly_cashflows:null}),/calendar length mismatch/));
test('fixed cashflows cannot conflict with a variable monthly schedule',()=>assert.throws(()=>simulatePortfolio({...portfolio,monthly_returns:months(1),monthly_withdrawal_yen:100,monthly_cashflows:[{month:'1980-01',contribution_yen:0,withdrawal_yen:100}]}),/conflicts with fixed/));
test('schedule missing month is an error rather than automatic fill',()=>{
 assert.throws(()=>simulatePortfolio({...portfolio,monthly_returns:months(2),monthly_cashflows:[{month:'1980-01',contribution_yen:1,withdrawal_yen:1}]}),/calendar length mismatch/);
});
test('schedule month mismatch is rejected',()=>{
 assert.throws(()=>simulatePortfolio({...portfolio,monthly_returns:months(1),monthly_cashflows:[{month:'1990-01',contribution_yen:1,withdrawal_yen:1}]}),/calendar mismatch/);
});
test('schedule unknown field is rejected',()=>{
 assert.throws(()=>simulatePortfolio({...portfolio,monthly_returns:months(1),monthly_cashflows:[{month:'1980-01',contribution_yen:1,withdrawal_yen:1,tax_rate:.2}]}),/Unsupported monthly cashflow field/);
});
test('schedule fractional money and negative money rejected',()=>{
 for(const n of [-1,1.5,Number.MAX_SAFE_INTEGER])assert.throws(()=>simulatePortfolio({...portfolio,monthly_returns:months(1),monthly_cashflows:[{month:'1980-01',contribution_yen:n,withdrawal_yen:0}]}),/integer JPY/);
});
test('schedule still records shortfall without negative holdings',()=>{
 const x=simulatePortfolio({...portfolio,monthly_returns:months(1),monthly_cashflows:[{month:'1980-01',contribution_yen:0,withdrawal_yen:1400}]});
 assert.equal(x.ending_assets_yen,0);assert.equal(x.rows[0].unfunded_yen,400);
});
test('relative pension schedule includes start and end offsets',()=>{
 const c=buildRelativeMonthlyCashflows({monthly_withdrawal_yen:100,relative_pension_schedule:[{id:'p',start_offset_months:1,end_offset_months:2,monthly_yen:30}]},4);
 assert.deepEqual(c.map(x=>x.breakdown.pension_yen),[0,30,30,0]);
});
test('relative pension with no end continues through horizon',()=>{
 const c=buildRelativeMonthlyCashflows({monthly_withdrawal_yen:100,relative_pension_schedule:[{id:'p',start_offset_months:2,monthly_yen:30}]},4);
 assert.deepEqual(c.map(x=>x.breakdown.pension_yen),[0,0,30,30]);
});
test('one-time income and expense map by offset, not actual market date',()=>{
 const c=buildRelativeMonthlyCashflows({monthly_withdrawal_yen:100,relative_one_time_events:[{id:'gift',offset_months:1,kind:'INCOME',amount_yen:500},{id:'bill',offset_months:1,kind:'EXPENSE',amount_yen:200}]},3);
 assert.equal(c[1].contribution_yen,500);assert.equal(c[1].withdrawal_yen,300);
});
test('inflation applies to living expenses only, one year forward',()=>{
 const c=buildRelativeMonthlyCashflows({monthly_withdrawal_yen:100,annual_expense_inflation:0.1,relative_one_time_events:[{id:'repair',offset_months:12,kind:'EXPENSE',amount_yen:50}]},13);
 assert.equal(c[0].withdrawal_yen,100);assert.equal(c[12].withdrawal_yen,160);
});
test('deflation applies to living expenses',()=>assert.equal(buildRelativeMonthlyCashflows({monthly_withdrawal_yen:100,annual_expense_inflation:-.1},13)[12].withdrawal_yen,90));
test('invalid inflation or unsupported financial input fails closed',()=>{
 for(const n of [NaN,Infinity,-.51,1.1,'0.1'])assert.throws(()=>buildRelativeMonthlyCashflows({monthly_withdrawal_yen:100,annual_expense_inflation:n},2),/inflation/);
 assert.throws(()=>buildRelativeMonthlyCashflows({monthly_withdrawal_yen:100,tax_rate:0},2),/Unsupported/);
});
test('event outside rolling horizon rejected',()=>assert.throws(()=>buildRelativeMonthlyCashflows({monthly_withdrawal_yen:100,relative_one_time_events:[{id:'x',offset_months:3,kind:'EXPENSE',amount_yen:100}]},3),/outside rolling horizon/));
test('pension starts beyond horizon rejected',()=>assert.throws(()=>buildRelativeMonthlyCashflows({monthly_withdrawal_yen:100,relative_pension_schedule:[{id:'p',start_offset_months:4,monthly_yen:30}]},3),/outside rolling horizon/));
test('pension end-before-start rejected',()=>assert.throws(()=>buildRelativeMonthlyCashflows({monthly_withdrawal_yen:100,relative_pension_schedule:[{id:'p',start_offset_months:2,end_offset_months:1,monthly_yen:30}]},3),/before start/));
test('duplicate event and pension identifiers rejected',()=>{
 assert.throws(()=>buildRelativeMonthlyCashflows({monthly_withdrawal_yen:100,relative_pension_schedule:[{id:'p',start_offset_months:1,monthly_yen:1},{id:'p',start_offset_months:2,monthly_yen:1}]},3),/Duplicate pension/);
 assert.throws(()=>buildRelativeMonthlyCashflows({monthly_withdrawal_yen:100,relative_one_time_events:[{id:'q',offset_months:0,kind:'INCOME',amount_yen:1},{id:'q',offset_months:1,kind:'INCOME',amount_yen:1}]},3),/Duplicate event/);
});
test('5 returns with horizon 3 give 3 rolling windows',()=>{
 const x=run();assert.equal(x.complete_windows,3);assert.deepEqual(x.windows.map(w=>w.ending_assets_yen),[700,700,700]);
 assert.equal(x.demo_funded_fraction,1);assert.equal(x.historical_funded_fraction,null);
});
test('pension and repair apply at same relative offsets in each window',()=>{
 const x=run({cashflow_plan:{monthly_withdrawal_yen:100,relative_pension_schedule:[{id:'p',start_offset_months:1,monthly_yen:30}],relative_one_time_events:[{id:'repair',offset_months:2,kind:'EXPENSE',amount_yen:50}]}});
 assert.equal(x.complete_windows,3);assert.deepEqual(x.windows.map(w=>w.ending_assets_yen),[710,710,710]);
});
test('single asset no-return portfolio matches v0.3 lifecycle semantics',()=>{
 const row=simple(3),assets={initial_holdings_yen:{STOCK:1000},target_weights:{STOCK:1}};
 const plan={monthly_withdrawal_yen:100,relative_pension_schedule:[{id:'p',start_offset_months:1,monthly_yen:50}],relative_one_time_events:[{id:'repair',offset_months:2,kind:'EXPENSE',amount_yen:200}]};
 const x=runRollingPortfolioLifecycle({monthly_market_returns:row,horizon_months:3,portfolio:assets,cashflow_plan:plan});
 const existing=simulateLifecycleCashflow({initial_assets_yen:1000,monthly_withdrawal_yen:100,monthly_returns:makeSyntheticFlatPath({start_month:'1980-01',months:3,monthly_return:0}),pension_schedule:[{id:'p',start_month:'1980-02',monthly_yen:50}],one_time_events:[{id:'repair',month:'1980-03',kind:'EXPENSE',amount_yen:200}]});
 assert.equal(x.windows[0].ending_assets_yen,existing.ending_assets_yen);assert.equal(existing.ending_assets_yen,600);
});
test('market gap means windows crossing missing observation excluded',()=>{
 const rows=[...months(2),...months(2,3)];const x=run({monthly_market_returns:rows,horizon_months:2});
 assert.equal(x.gap_boundaries,1);assert.equal(x.complete_windows,2);assert.equal(x.theoretical_windows_if_no_gaps,4);assert.equal(x.excluded_windows_due_to_missing_months,2);
});
test('no long enough continuous history returns null fraction',()=>{
 const x=run({monthly_market_returns:[...months(1),...months(1,2)],horizon_months:3});
 assert.equal(x.complete_windows,0);assert.equal(x.status,'INSUFFICIENT_CONTIGUOUS_HISTORY');assert.equal(x.demo_funded_fraction,null);
});
test('521 continuous monthly returns mean 162 valid 360-month starts',()=>{
 const row=simple(521);
 const x=runRollingPortfolioLifecycle({monthly_market_returns:row,horizon_months:360,portfolio:{initial_holdings_yen:{STOCK:1000},target_weights:{STOCK:1}},cashflow_plan:{monthly_withdrawal_yen:1}});
 assert.equal(x.complete_windows,162);assert.equal(x.excluded_windows_due_to_missing_months,0);
});
test('observed mode is only user-asserted and never licensed',()=>{
 const x=run({market_mode:'OBSERVED_RESEARCH',monthly_market_returns:months(5,0,{STOCK:0,BOND:0},'OBSERVED')});
 assert.equal(x.historical_funded_fraction,1);assert.equal(x.demo_funded_fraction,null);
 assert.equal(x.publication_approved,false);assert.equal(x.source_rights_approved,false);assert.equal(x.provenance_verified,false);
 assert.match(x.market_path_provenance,/UNVERIFIED/);
});
test('synthetic input is not silently accepted as observed',()=>assert.throws(()=>run({market_mode:'OBSERVED_RESEARCH'}),/Mixed, proxy or estimated/));
test('wrong asset universe in the market is rejected',()=>assert.throws(()=>run({monthly_market_returns:simple(5)}),/coverage mismatch/));
test('duplicate or reversed market month rejected',()=>assert.throws(()=>run({monthly_market_returns:[...months(2),...months(1,1)]}),/Repeated or out-of-order/));
test('no fake interpolation for gaps even with matching asset returns',()=>{const row=[...months(2),...months(2,4)];const x=run({monthly_market_returns:row,horizon_months:3});assert.equal(x.complete_windows,0);assert.equal(x.excluded_windows_due_to_missing_months,4)});
test('negative returns below -100% rejected',()=>assert.throws(()=>run({monthly_market_returns:months(5,0,{STOCK:-1.2,BOND:0})}),/Invalid return/));
test('invalid rebalance policy rejected even if no full window',()=>assert.throws(()=>run({monthly_market_returns:months(1),portfolio:{...portfolio,rebalance:{mode:'PERIODIC',interval_months:0}}}),/Invalid rebalance interval/));
test('profile with excessive pension causes safe overflow guard',()=>assert.throws(()=>buildRelativeMonthlyCashflows({monthly_withdrawal_yen:1,monthly_contribution_yen:1_000_000_000_000,relative_pension_schedule:[{id:'p',start_offset_months:0,monthly_yen:1}]},2),/Unsafe money/));

const compare=(opts={})=>compareRollingPortfolioPlans({monthly_market_returns:months(),horizon_months:3,
 plans:[{id:'base',portfolio,cashflow_plan},{id:'safer',portfolio:{initial_holdings_yen:{STOCK:0,BOND:1000},target_weights:{STOCK:0,BOND:1}},cashflow_plan}],...opts});
test('comparison produces aligned summaries and window deltas',()=>{const x=compare();assert.equal(x.complete_windows,3);assert.equal(x.summary.length,2);assert.equal(x.windows.length,3);assert.equal(x.windows[0].scenarios[0].delta_ending_assets_vs_baseline_yen,0)});
test('comparison has no historical percentage on synthetic paths',()=>{const x=compare();assert.equal(x.summary[0].historical_funded_fraction,null);assert.equal(x.publication_approved,false)});
test('comparison supports non-first baseline',()=>{const x=compare({baseline_id:'safer'});assert.equal(x.windows[0].scenarios[1].delta_ending_assets_vs_baseline_yen,0)});
test('comparison rejects different asset universes',()=>assert.throws(()=>compareRollingPortfolioPlans({monthly_market_returns:months(),horizon_months:2,plans:[{id:'a',portfolio,cashflow_plan},{id:'b',portfolio:{initial_holdings_yen:{STOCK:1000},target_weights:{STOCK:1}},cashflow_plan}]}),/asset universes/));
test('comparison rejects unsupported plan keys and duplicate IDs',()=>{
 assert.throws(()=>compare({plans:[{id:'a',portfolio,cashflow_plan,estimated_tax_rate:.25},{id:'b',portfolio,cashflow_plan}]}),/Unsupported comparison plan key/);
 assert.throws(()=>compare({plans:[{id:'a',portfolio,cashflow_plan},{id:'a',portfolio,cashflow_plan}]}),/Duplicate plan id/);
});
test('comparison independently calculates year-offset pensions and scenario deltas',()=>{
 const plans=[{id:'base',portfolio,cashflow_plan},{id:'pension',portfolio,cashflow_plan:{monthly_withdrawal_yen:100,relative_pension_schedule:[{id:'p',start_offset_months:1,monthly_yen:50}]}}];
 const x=compare({plans});assert.ok(x.windows.every(w=>w.scenarios[1].ending_assets_yen>w.scenarios[0].ending_assets_yen));
});
test('comparison preserves private rights gates',()=>{const x=compare();assert.equal(x.source_rights_approved,false);assert.equal(x.provenance_verified,false);assert.equal(x.future_probability_claim,false)});
test('comparison with no valid windows remains valid and transparent',()=>{const x=compare({monthly_market_returns:months(2),horizon_months:3});assert.equal(x.complete_windows,0);assert.equal(x.summary[0].demo_funded_fraction,null);assert.equal(x.windows.length,0)});
