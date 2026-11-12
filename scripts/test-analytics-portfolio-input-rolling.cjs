'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {runRollingPortfolioLifecycle}=require('../lib/analytics/rolling-portfolio-lifecycle.cjs');
const {runRollingPortfolioCpiLinked}=require('../lib/analytics/rolling-portfolio-cpi.cjs');
const {compareRollingCpiVsFixedInflation}=require('../lib/analytics/rolling-cpi-benchmark.cjs');
const {formatMonth,monthSerial}=require('../lib/analytics/cashflow-core.cjs');
const rows=Array.from({length:15},(_,i)=>({month:formatMonth(monthSerial('2020-01')+i),origin:'SYNTHETIC',asset_returns:{STOCK:i%4===0?.1:i%4===1?-.15:.01,BOND:0}}));
const cpi=rows.map((r,i)=>({month:r.month,origin:'SYNTHETIC',source_id:'SYNTHETIC_FIXTURE',series_id:'JP_CPI_HEADLINE_2025_LINKED',series_kind:'CPI_LEVEL',unit:'INDEX_2025_100',seasonal_adjustment:'NSA',value:100+i}));
const p={initial_holdings_yen:{STOCK:700000,BOND:300000},target_weights:{STOCK:.7,BOND:.3},rebalance:{mode:'THRESHOLD',threshold:.04}};
const plan={monthly_contribution_yen:1000,monthly_withdrawal_yen:10000,relative_one_time_events:[{id:'dentist',offset_months:6,kind:'EXPENSE',amount_yen:20000}]};
const base={monthly_market_returns:rows,horizon_months:12,portfolio:p,market_mode:'SYNTHETIC_DEMO'};
test('every evaluated fixed-rate rolling window is externally audited',()=>{
 const x=runRollingPortfolioLifecycle({...base,cashflow_plan:{...plan,annual_expense_inflation:.02}});
 assert.equal(x.complete_windows,4);assert.equal(x.input_concordance_audited_windows,4);
});
test('every CPI-linked rolling window is externally audited',()=>{
 const x=runRollingPortfolioCpiLinked({...base,jp_cpi_monthly_levels:cpi,cashflow_plan:plan});
 assert.equal(x.complete_windows,4);assert.equal(x.input_concordance_audited_windows,4);
 assert.equal(x.publication_approved,false);assert.equal(x.cpi_provenance_verified_here,false);
});
test('paired benchmark retains identical rolling counts after independent checks',()=>{
 const x=compareRollingCpiVsFixedInflation({...base,jp_cpi_monthly_levels:cpi,cashflow_plan:plan,comparison_annual_expense_inflation:.02});
 assert.equal(x.paired_complete_windows,4);assert.equal(x.funded_cpi_windows+x.fixed_funded_cpi_shortfall,4);assert.equal(x.publication_approved,false);
});
test('CPI hole blocks only affected windows and audits only those calculated',()=>{
 const remaining=cpi.filter(r=>r.month!=='2020-05');
 const x=runRollingPortfolioCpiLinked({...base,jp_cpi_monthly_levels:remaining,cashflow_plan:plan});
 assert.equal(x.complete_windows,0);assert.equal(x.input_concordance_audited_windows,0);
 assert.equal(x.excluded_windows_due_to_missing_cpi_months,4);
});
test('zero-return, zero-CPI-change mode does not invent performance',()=>{
 const flat=rows.map(r=>({...r,asset_returns:{STOCK:0,BOND:0}}));
 const frozen=cpi.map(r=>({...r,value:100}));
 const x=compareRollingCpiVsFixedInflation({...base,monthly_market_returns:flat,jp_cpi_monthly_levels:frozen,cashflow_plan:plan,comparison_annual_expense_inflation:0});
 assert.equal(x.median_delta_ending_assets_cpi_minus_fixed_yen,0);assert.equal(x.paired_complete_windows,4);
});
test('nonconsecutive market path remains excluded rather than filled and unexamined rows not counted',()=>{
 const gapped=rows.filter(r=>r.month!=='2020-08');
 const x=runRollingPortfolioLifecycle({...base,monthly_market_returns:gapped,cashflow_plan:plan});
 assert.equal(x.complete_windows,0);assert.equal(x.input_concordance_audited_windows,0);
 assert.ok(x.excluded_windows_due_to_missing_months>0);
});
