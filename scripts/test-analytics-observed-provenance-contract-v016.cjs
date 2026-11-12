'use strict';
/** v0.16: reject fake historical provenance and cross-check one-asset math. */
const test=require('node:test');
const assert=require('node:assert/strict');
const {simulatePortfolio}=require('../lib/analytics/portfolio-core.cjs');
const {runRollingPortfolioLifecycle}=require('../lib/analytics/rolling-portfolio-lifecycle.cjs');
const {simulateLifecycleCashflow}=require('../lib/analytics/lifecycle-core.cjs');
const {runRollingLifecycleCashflow}=require('../lib/analytics/rolling-lifecycle.cjs');
const {simulateMonthlyCashflow,formatMonth,monthSerial}=require('../lib/analytics/cashflow-core.cjs');
const {comparePortfolioStrategies}=require('../lib/analytics/portfolio-compare.cjs');
const {auditPortfolioAgainstInputs}=require('../lib/analytics/portfolio-input-audit.cjs');
const base={initial_holdings_yen:{US_EQUITY:100_000},target_weights:{US_EQUITY:1},market_mode:'OBSERVED_RESEARCH'};
const month='2020-01';
const obs={month,origin:'OBSERVED',asset_returns:{US_EQUITY:0.01}};
const one=r=>simulatePortfolio({...base,monthly_returns:[r]});
const rolling=r=>runRollingPortfolioLifecycle({monthly_market_returns:[r],market_mode:'OBSERVED_RESEARCH',
 horizon_months:1,portfolio:{initial_holdings_yen:base.initial_holdings_yen,target_weights:base.target_weights},
 cashflow_plan:{monthly_withdrawal_yen:100}});
const legacy=r=>simulateMonthlyCashflow({initial_assets_yen:100_000,monthly_withdrawal_yen:100,
 monthly_returns:[r],provenance:'OBSERVED'});
const marks=[
 ['string proxy yes',{proxy:'yes'}],['string proxy false',{proxy:'false'}],['numeric proxy 1',{proxy:1}],
 ['null proxy',{proxy:null}],['object proxy',{proxy:{flag:true}}],['estimated numeric',{estimated:1}],
 ['estimated string',{estimated:'true'}],['estimated null',{estimated:null}],
 ['undocumented source backfill',{backfilled:true}],['unknown synthetic label',{return_kind:'MODEL_ESTIMATE'}]
];
for(const [name,extra] of marks){
 test('portfolio observed rejects '+name,()=>assert.throws(()=>one({...obs,...extra}),/provenance|Unsupported market return field/));
 test('rolling observed rejects '+name,()=>assert.throws(()=>rolling({...obs,...extra}),/provenance|Unsupported market row.*field/));
 test('single-asset observed rejects '+name,()=>assert.throws(()=>legacy({month,origin:'OBSERVED',monthly_return:0.01,...extra}),/return series|Unsupported return record field/));
}
test('explicit boolean false provenance flags remain valid',()=>{
 const row={...obs,proxy:false,estimated:false};
 assert.equal(one(row).ending_assets_yen,101000);
 assert.equal(rolling(row).complete_windows,1);
 assert.equal(legacy({month,origin:'OBSERVED',monthly_return:0.01,proxy:false,estimated:false}).ending_assets_yen,100899);
});
test('no provenance flags remains valid with observed and synthetic',()=>{
 assert.equal(one(obs).market_mode,'OBSERVED_RESEARCH');
 assert.equal(simulatePortfolio({...base,market_mode:'SYNTHETIC_DEMO',monthly_returns:[{...obs,origin:'SYNTHETIC'}]}).market_mode,'SYNTHETIC_DEMO');
});
test('synthetic mode rejects estimated/proxy labels equally',()=>{
 assert.throws(()=>simulatePortfolio({...base,market_mode:'SYNTHETIC_DEMO',monthly_returns:[{...obs,origin:'SYNTHETIC',estimated:'yes'}]}),/provenance/);
 assert.throws(()=>simulateMonthlyCashflow({initial_assets_yen:1,monthly_withdrawal_yen:0,
  monthly_returns:[{month,monthly_return:0,origin:'SYNTHETIC',proxy:'yes'}],provenance:'SYNTHETIC'}),/return series/);
});
test('compared portfolio path rejects estimated field before simulated time series',()=>{
 const s=x=>({id:x,initial_holdings_yen:{US_EQUITY:1000},target_weights:{US_EQUITY:1}});
 assert.throws(()=>comparePortfolioStrategies({scenarios:[s('a'),s('b')],monthly_returns:[{...obs,estimated:1}],market_mode:'OBSERVED_RESEARCH'}),/provenance/);
});
test('external audit cannot endorse unrecognized marker as input',()=>{
 const row=one(obs);
 assert.throws(()=>auditPortfolioAgainstInputs({...base,monthly_returns:[{...obs,estimated:1}]},row),/provenance/);
});
// Differential test against the older independent single-asset cashflow engine.
// The two engines have different module code, but identical timing when there is only one asset.
let state=0x9e3779b9;
const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32;};
test('60 deterministic multi-month single-asset scenarios agree with independent cashflow engine',()=>{
 for(let caseNo=0;caseNo<60;caseNo++){
  const start=monthSerial('2001-01')+caseNo*2;
  const n=6+(caseNo%31);
  const rows=Array.from({length:n},(_,i)=>({month:formatMonth(start+i),origin:'SYNTHETIC',monthly_return:(rand()-.5)*.3}));
  const holdings=100+Math.floor(rand()*200000),withdrawal=Math.floor(rand()*15000),contribution=Math.floor(rand()*10000);
  const old=simulateMonthlyCashflow({initial_assets_yen:holdings,monthly_withdrawal_yen:withdrawal,
    monthly_contribution_yen:contribution,monthly_returns:rows,provenance:'SYNTHETIC'});
  const portfolio=simulatePortfolio({initial_holdings_yen:{US_EQUITY:holdings},target_weights:{US_EQUITY:1},
    monthly_withdrawal_yen:withdrawal,monthly_contribution_yen:contribution,market_mode:'SYNTHETIC_DEMO',
    monthly_returns:rows.map(({month,origin,monthly_return})=>({month,origin,asset_returns:{US_EQUITY:monthly_return}}))});
  assert.equal(portfolio.ending_assets_yen,old.ending_assets_yen,'ending case '+caseNo);
  assert.equal(portfolio.total_unfunded_yen,old.total_unfunded_yen,'unmet case '+caseNo);
  assert.equal(portfolio.shortfall_months,old.shortfall_months,'shortfall case '+caseNo);
  assert.deepEqual(portfolio.rows.map(x=>x.closing_yen),old.rows.map(x=>x.closing_yen),'monthly path case '+caseNo);
  assert.equal(auditPortfolioAgainstInputs({initial_holdings_yen:{US_EQUITY:holdings},target_weights:{US_EQUITY:1},
    monthly_withdrawal_yen:withdrawal,monthly_contribution_yen:contribution,market_mode:'SYNTHETIC_DEMO',
    monthly_returns:rows.map(({month,origin,monthly_return})=>({month,origin,asset_returns:{US_EQUITY:monthly_return}}))},portfolio).status,
    'INPUT_CONCORDANCE_AND_INTERNAL_LEDGER_PASSED');
 }
});
test('24 month lifecycle with pension, event, inflation agrees between independent engines',()=>{
 const n=24,start=monthSerial('2021-01'),raw=Array.from({length:n},(_,i)=>({month:formatMonth(start+i),origin:'SYNTHETIC',monthly_return:i%5===0?-.08:.02}));
 const pension={id:'annuity',start_offset_months:6,end_offset_months:17,monthly_yen:500};
 const expenseEvent={id:'repair',offset_months:9,kind:'EXPENSE',amount_yen:8000};
 const incomeEvent={id:'gift',offset_months:19,kind:'INCOME',amount_yen:3000};
 const old=simulateLifecycleCashflow({initial_assets_yen:20000,monthly_withdrawal_yen:1800,monthly_contribution_yen:200,
  annual_expense_inflation:.03,monthly_returns:raw,provenance:'SYNTHETIC',
  pension_schedule:[{id:'annuity',start_month:formatMonth(start+6),end_month:formatMonth(start+17),monthly_yen:500}],
  one_time_events:[{id:'repair',month:formatMonth(start+9),kind:'EXPENSE',amount_yen:8000},
   {id:'gift',month:formatMonth(start+19),kind:'INCOME',amount_yen:3000}]});
 const current=runRollingPortfolioLifecycle({monthly_market_returns:raw.map(r=>({month:r.month,origin:'SYNTHETIC',asset_returns:{US_EQUITY:r.monthly_return}})),
  horizon_months:n,portfolio:{initial_holdings_yen:{US_EQUITY:20000},target_weights:{US_EQUITY:1}},
  cashflow_plan:{monthly_withdrawal_yen:1800,monthly_contribution_yen:200,annual_expense_inflation:.03,
   relative_pension_schedule:[pension],relative_one_time_events:[expenseEvent,incomeEvent]},market_mode:'SYNTHETIC_DEMO'});
 assert.equal(current.complete_windows,1);
 assert.equal(current.windows[0].ending_assets_yen,old.ending_assets_yen);
 assert.equal(current.windows[0].total_unfunded_yen,old.total_unfunded_yen);
 assert.equal(current.windows[0].shortfall_months,old.shortfall_months);
});
test('gap exclusion and case alignment agree for both lifecycle engines',()=>{
 const first=monthSerial('2010-01'),rows=Array.from({length:25},(_,i)=>({month:formatMonth(first+i+(i>=13?2:0)),
  origin:'SYNTHETIC',monthly_return:.01}));
 const old=runRollingLifecycleCashflow({monthly_returns:rows,horizon_months:12,
  initial_assets_yen:100000,monthly_contribution_yen:300,monthly_withdrawal_yen:1000,market_mode:'SYNTHETIC_DEMO'});
 const current=runRollingPortfolioLifecycle({monthly_market_returns:rows.map(x=>({month:x.month,origin:x.origin,asset_returns:{US_EQUITY:x.monthly_return}})),
  horizon_months:12,portfolio:{initial_holdings_yen:{US_EQUITY:100000},target_weights:{US_EQUITY:1}},
  cashflow_plan:{monthly_contribution_yen:300,monthly_withdrawal_yen:1000},market_mode:'SYNTHETIC_DEMO'});
 assert.equal(current.complete_windows,old.complete_windows);
 assert.equal(current.excluded_windows_due_to_missing_months,old.excluded_windows_due_to_missing_months);
 assert.deepEqual(current.windows.map(w=>[w.market_start_month,w.market_end_month,w.ending_assets_yen,w.total_unfunded_yen]),
  old.windows.map(w=>[w.market_start_month,w.market_end_month,w.ending_assets_yen,w.total_unfunded_yen]));
});
test('CPI-linked path rejects mislabeled proxy market before analysis',()=>{
 const {runRollingPortfolioCpiLinked}=require('../lib/analytics/rolling-portfolio-cpi.cjs');
 assert.throws(()=>runRollingPortfolioCpiLinked({
  monthly_market_returns:[{month:'2020-01',origin:'OBSERVED',asset_returns:{US_EQUITY:.01},proxy:'yes'}],
  jp_cpi_monthly_levels:[{month:'2020-01',value:100,origin:'OBSERVED',source_id:'ESTAT',
   series_id:'JP_CPI_HEADLINE_2025_LINKED',series_kind:'CPI_LEVEL',unit:'INDEX_2025_100',seasonal_adjustment:'NSA'}],
  horizon_months:1,portfolio:{initial_holdings_yen:{US_EQUITY:1000},target_weights:{US_EQUITY:1}},
  cashflow_plan:{monthly_withdrawal_yen:100},market_mode:'OBSERVED_RESEARCH'
 }),/provenance/);
});
test('paired historical CPI/fixed comparison rejects tainted market inputs',()=>{
 const {compareRollingCpiVsFixedInflation}=require('../lib/analytics/rolling-cpi-benchmark.cjs');
 assert.throws(()=>compareRollingCpiVsFixedInflation({
  monthly_market_returns:[{month:'2020-01',origin:'OBSERVED',asset_returns:{US_EQUITY:.01},estimated:'true'}],
  jp_cpi_monthly_levels:[{month:'2020-01',value:100,origin:'OBSERVED',source_id:'ESTAT',
   series_id:'JP_CPI_HEADLINE_2025_LINKED',series_kind:'CPI_LEVEL',unit:'INDEX_2025_100',seasonal_adjustment:'NSA'}],
  horizon_months:1,portfolio:{initial_holdings_yen:{US_EQUITY:1000},target_weights:{US_EQUITY:1}},
  cashflow_plan:{monthly_withdrawal_yen:100},comparison_annual_expense_inflation:0,
  market_mode:'OBSERVED_RESEARCH'
 }),/provenance/);
});
