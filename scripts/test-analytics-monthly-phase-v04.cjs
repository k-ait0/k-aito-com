#!/usr/bin/env node
'use strict';
// Synthetic phase agreement: start/end MONTHLY gross cashflow only.
// This explicitly does not claim compatibility with DWZ mixed phase events.
const assert=require('node:assert/strict');
const {simulatePortfolio}=require('../lib/analytics/portfolio-core.cjs');
const {simulatePersonalMultiAsset,cashflowsForPlan,rollingPersonalMultiAsset}=require('../lib/analytics/personal-multiasset-bridge.cjs');
const {monthSerial,formatMonth}=require('../lib/analytics/cashflow-core.cjs');
const cash={initial_holdings_yen:{CASH_JPY:100},target_weights:{CASH_JPY:1},rebalance:{mode:'NONE'}};
const tick=(r,month='2000-02')=>({month,origin:'SYNTHETIC',asset_returns:{CASH_JPY:r}});
const ir={initial_holdings_yen:{RISK:100},target_weights:{RISK:1},rebalance:{mode:'NONE'}};
const return10={month:'2000-02',origin:'SYNTHETIC',asset_returns:{RISK:.1}};
const before=simulatePortfolio({...ir,monthly_returns:[return10],monthly_withdrawal_yen:50,market_mode:'SYNTHETIC_DEMO'});
const after=simulatePortfolio({...ir,monthly_returns:[return10],monthly_withdrawal_yen:50,
 withdrawal_timing:'MONTH_END',market_mode:'SYNTHETIC_DEMO'});
assert.equal(before.ending_assets_yen,55);
assert.equal(after.ending_assets_yen,60);
assert.equal(before.rows[0].investment_gain_yen,5);
assert.equal(after.rows[0].investment_gain_yen,10);
assert.equal(before.withdrawal_timing,'MONTH_START');
assert.equal(after.withdrawal_timing,'MONTH_END');
assert(after.timing.includes('MONTH_END_WITHDRAWAL'));
assert.equal(before.timing,'MONTH_START_CONTRIBUTION_THEN_PROPORTIONAL_WITHDRAWAL_THEN_RETURNS_THEN_REBALANCE');
const cpi=Array.from({length:13},(_,i)=>({
 month:formatMonth(monthSerial('2000-01')+i),origin:'SYNTHETIC',
 value:i===0?100:110
}));
const rows=Array.from({length:12},(_,i)=>tick(0,formatMonth(monthSerial('2000-02')+i)));
const plan={monthly_expense_yen:100,expense_mode:'HISTORICAL_CPI'};
const f0=cashflowsForPlan(plan,12,'2000-01',cpi,'MONTH_START');
const f1=cashflowsForPlan(plan,12,'2000-01',cpi,'MONTH_END');
assert.equal(f0.breakdown[0].living_expense_yen,100);
assert.equal(f1.breakdown[0].living_expense_yen,110);
assert.equal(f0.breakdown[0].expense_price_level_month,'2000-01');
assert.equal(f1.breakdown[0].expense_price_level_month,'2000-02');
assert.equal(f1.breakdown.at(-1).expense_price_level_month,'2001-01');
assert(f1.timing.includes('MONTH_END_ALL_EXPENSES'));
const p0=simulatePersonalMultiAsset({portfolio:cash,monthly_market_returns:rows,cpi_levels:cpi,plan,
 market_mode:'SYNTHETIC_DEMO'});
const p1=simulatePersonalMultiAsset({portfolio:{...cash,withdrawal_timing:'MONTH_END'},
 monthly_market_returns:rows,cpi_levels:cpi,plan,market_mode:'SYNTHETIC_DEMO'});
assert.equal(p0.rows[0].requested_withdrawal_yen,100);
assert.equal(p1.rows[0].requested_withdrawal_yen,110);
assert.equal(p0.rows[0].cashflow_breakdown.expense_price_level_month,'2000-01');
assert.equal(p1.rows[0].cashflow_breakdown.expense_price_level_month,'2000-02');
assert.equal(p0.rows[0].paid_withdrawal_yen,100);
assert.equal(p1.rows[0].paid_withdrawal_yen,100,'Only 100 yen available after 110 yen month-end expense');
assert.equal(p1.rows[0].unfunded_yen,10);
const assumption={monthly_expense_yen:1200,expense_mode:'ANNUAL_ASSUMPTION',annual_expense_inflation:.12};
const a0=cashflowsForPlan(assumption,12,'2000-01',null,'MONTH_START');
const a1=cashflowsForPlan(assumption,12,'2000-01',null,'MONTH_END');
assert.equal(a0.breakdown[0].living_expense_yen,1200);
assert.equal(a1.breakdown[0].living_expense_yen,Math.round(1200*Math.pow(1.12,1/12)));
assert.throws(()=>cashflowsForPlan(plan,12,'2000-01',cpi,'BEFORE_LUNCH'),/withdrawal_timing/);
assert.throws(()=>simulatePortfolio({...ir,monthly_returns:[return10],market_mode:'SYNTHETIC_DEMO',
 withdrawal_timing:'UNSAFE_PHASE'}),/withdrawal_timing/);
// Multi-sleeve with optional cash-first and both phases.
const assetIds=['CASH_JPY','RISK'];
function portfolio(phase,strategy){
 const x={initial_holdings_yen:{CASH_JPY:50,RISK:50},target_weights:{CASH_JPY:.5,RISK:.5},
  rebalance:{mode:'NONE'},withdrawal_strategy:strategy,withdrawal_timing:phase};
 if(strategy!=='PRO_RATA')x.cash_asset_id='CASH_JPY';
 return x;
}
const twoRow={month:'2000-02',origin:'SYNTHETIC',asset_returns:{CASH_JPY:0,RISK:.2}};
const rstart=simulatePortfolio({...portfolio('MONTH_START','RISK_FIRST'),
 monthly_returns:[twoRow],monthly_withdrawal_yen:50,market_mode:'SYNTHETIC_DEMO'});
const rend=simulatePortfolio({...portfolio('MONTH_END','RISK_FIRST'),
 monthly_returns:[twoRow],monthly_withdrawal_yen:50,market_mode:'SYNTHETIC_DEMO'});
assert.equal(rstart.ending_assets_yen,50);
assert.equal(rend.ending_assets_yen,60);
assert.equal(rstart.ending_holdings_yen.CASH_JPY,50);
assert.equal(rend.ending_holdings_yen.CASH_JPY,50);
assert.equal(rend.ending_holdings_yen.RISK,10);
const market60=Array.from({length:14},(_,i)=>({...twoRow,month:formatMonth(monthSerial('2000-02')+i)}));
const roll=rollingPersonalMultiAsset({portfolio:portfolio('MONTH_END','CASH_FIRST'),
 monthly_market_returns:market60,horizon_months:12,plan:{monthly_expense_yen:1000}});
assert.equal(roll.complete_windows,3);
assert.equal(roll.accounting_contract,'INTEGER_JPY_MONTH_START_INCOME_RETURN_MONTH_END_EXPENSE');
let checked=0;
for(const count of [1,2,3,5,12])
for(const strategy of ['PRO_RATA','CASH_FIRST','RISK_FIRST'])
for(const expense of [0,10,100,1500])
for(const phase of ['MONTH_START','MONTH_END']){
 const ids=Array.from({length:count},(_,i)=>i===0?'CASH_JPY':'A'+i);
 const holdings=Object.fromEntries(ids.map(id=>[id,350]));
 const weights=Object.fromEntries(ids.map(id=>[id,1/count]));
 const returns=Array.from({length:24},(_,i)=>({
  month:formatMonth(monthSerial('2000-02')+i),origin:'SYNTHETIC',
  asset_returns:Object.fromEntries(ids.map(id=>[id,id==='CASH_JPY'?0:(i%2===0?.008:-.012)]))
 }));
 const config={initial_holdings_yen:holdings,target_weights:weights,
  monthly_returns:returns,monthly_contribution_yen:100,monthly_withdrawal_yen:expense,
  market_mode:'SYNTHETIC_DEMO',rebalance:{mode:'PERIODIC',interval_months:12},
  withdrawal_strategy:strategy,withdrawal_timing:phase};
 if(strategy!=='PRO_RATA')config.cash_asset_id='CASH_JPY';
 const x=simulatePortfolio(config);
 let capital=350*count,cumPaid=0,cumGains=0;
 for(const row of x.rows){
  assert.equal(Object.values(row.holdings).reduce((a,v)=>a+v.closing_yen,0),row.closing_yen);
  assert.equal(Object.values(row.holdings).reduce((a,v)=>a+v.withdrawal_yen,0),row.paid_withdrawal_yen);
  assert.equal(row.requested_withdrawal_yen,row.paid_withdrawal_yen+row.unfunded_yen);
  assert.equal(row.investment_gain_yen,phase==='MONTH_START'?
   row.pre_rebalance_yen-row.invested_before_return_yen:
   row.pre_rebalance_yen+row.paid_withdrawal_yen-row.invested_before_return_yen);
  cumPaid+=row.paid_withdrawal_yen;cumGains+=row.investment_gain_yen;
 }
 assert.equal(x.ending_assets_yen,capital+2400+cumGains-cumPaid);
 checked++;
}
assert.equal(checked,120);
console.log('PASS ANALYTICS_MONTHLY_PHASE_V04: 120 synthetic 1-12 asset scenarios, ordered sales, true START/END capital identity, CPI month reference, 12-month rolling and unchanged default');
