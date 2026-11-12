#!/usr/bin/env node
'use strict';
// Private Personal Analytics v0.3: differential and accounting property tests.
// All returns and cashflows are synthetic; not investable source data.
const assert=require('node:assert/strict');
const {simulatePortfolio,validateInput,selectWithdrawalPayments}=require('../lib/analytics/portfolio-core.cjs');
const {simulatePersonalMultiAsset,cashflowsForPlan,validatePlan,rollingPersonalMultiAsset}=require('../lib/analytics/personal-multiasset-bridge.cjs');
const {monthSerial,formatMonth}=require('../lib/analytics/cashflow-core.cjs');
const add=(arr)=>arr.reduce((a,b)=>a+b,0);
function path(ids,horizon,ret=0){
 return Array.from({length:horizon},(_,i)=>({month:formatMonth(monthSerial('2000-02')+i),origin:'SYNTHETIC',
  asset_returns:Object.fromEntries(ids.map((id,j)=>[id,id==='CASH_JPY'?0:ret+(j%2===0?.001:0)]))}));
}
function portfolio(ids,holdings,withdrawal_strategy='PRO_RATA'){
 const cfg={initial_holdings_yen:Object.fromEntries(ids.map((id,i)=>[id,holdings[i]])),
  target_weights:Object.fromEntries(ids.map(id=>[id,1/ids.length])),
  rebalance:{mode:'NONE'},withdrawal_strategy};
 if(withdrawal_strategy!=='PRO_RATA')cfg.cash_asset_id='CASH_JPY';
 return cfg;
}
const ids=['CASH_JPY','RISK'];
const inputs={
 ...portfolio(ids,[100,100]),
 monthly_returns:path(ids,1,0).map(x=>({...x,asset_returns:{CASH_JPY:0,RISK:.1}})),
 monthly_cashflows:[{month:'2000-02',contribution_yen:0,withdrawal_yen:100}],
 market_mode:'SYNTHETIC_DEMO'
};
const pro=simulatePortfolio(inputs);
const cash=simulatePortfolio({...inputs,withdrawal_strategy:'CASH_FIRST',cash_asset_id:'CASH_JPY'});
const risk=simulatePortfolio({...inputs,withdrawal_strategy:'RISK_FIRST',cash_asset_id:'CASH_JPY'});
assert.equal(pro.ending_assets_yen,105);
assert.equal(cash.ending_assets_yen,110);
assert.equal(risk.ending_assets_yen,100);
assert.deepEqual(Object.values(cash.ending_holdings_yen),[0,110]);
assert.deepEqual(Object.values(risk.ending_holdings_yen),[100,0]);
assert.equal(cash.rows[0].holdings.CASH_JPY.withdrawal_yen,100);
assert.equal(risk.rows[0].holdings.RISK.withdrawal_yen,100);
assert.equal(pro.rows[0].holdings.CASH_JPY.withdrawal_yen,50);
assert.equal(pro.rows[0].holdings.RISK.withdrawal_yen,50);
assert.equal(cash.withdrawal_strategy,'CASH_FIRST');
assert(cash.timing.includes('ORDERED_WITHDRAWAL'));
assert.equal(pro.timing,'MONTH_START_CONTRIBUTION_THEN_PROPORTIONAL_WITHDRAWAL_THEN_RETURNS_THEN_REBALANCE');
for(const amount of [0,1,20,99,100,101,151,199,200,300]){
 const paid=Math.min(200,amount);
 for(const strategy of ['PRO_RATA','CASH_FIRST','RISK_FIRST']){
  const p=selectWithdrawalPayments([100,100],paid,ids,strategy,strategy==='PRO_RATA'?-1:0);
  assert.equal(add(p),paid);
  assert(p.every((n,i)=>n>=0&&n<=100));
  if(strategy==='CASH_FIRST')assert.equal(p[0],Math.min(paid,100));
  if(strategy==='RISK_FIRST')assert.equal(p[1],Math.min(paid,100));
 }
}
assert.throws(()=>validateInput({...inputs,withdrawal_strategy:'CASH_FIRST'}),/cash_asset_id/);
assert.throws(()=>validateInput({...inputs,withdrawal_strategy:'RISK_FIRST',cash_asset_id:'MISSING'}),/cash_asset_id/);
assert.throws(()=>validateInput({...inputs,cash_asset_id:'CASH_JPY'}),/cash_asset_id/);
assert.throws(()=>validateInput({...inputs,withdrawal_strategy:'CASH_ONLY'}),/withdrawal_strategy/);
assert.throws(()=>validateInput({...inputs,withdrawal_strategy:'CASH_FIRST',cash_asset_id:'CASH_JPY',
 monthly_returns:[{month:'2000-02',origin:'SYNTHETIC',asset_returns:{CASH_JPY:.01,RISK:.1}}]}),/zero monthly/);
const sourcePlan={
 monthly_contribution_yen:1000,monthly_expense_yen:100,
 salary_schedules:[{id:'salary',start_offset:0,end_offset_exclusive:12,monthly_yen:700}],
 pension_schedules:[{id:'pension',start_offset:0,end_offset_exclusive:12,monthly_yen:500}]
};
const ext=cashflowsForPlan({...sourcePlan,monthly_contribution_source:'EXTERNAL_NEW_MONEY'},12,'2000-01');
const internal=cashflowsForPlan({...sourcePlan,monthly_contribution_source:'INTERNAL_FROM_SALARY_PENSION'},12,'2000-01');
assert.equal(ext.monthly_cashflows[0].contribution_yen,2200);
assert.equal(internal.monthly_cashflows[0].contribution_yen,1200);
assert.equal(ext.breakdown[0].external_contribution_yen,1000);
assert.equal(ext.breakdown[0].internal_from_income_yen,0);
assert.equal(internal.breakdown[0].external_contribution_yen,0);
assert.equal(internal.breakdown[0].internal_from_income_yen,1000);
assert.equal(internal.breakdown[0].salary_yen,700);
assert.equal(internal.breakdown[0].pension_yen,500);
assert.equal(internal.breakdown[0].total_income_yen,1200);
const market=path(ids,12);
const pi=portfolio(ids,[10000,10000]);
const er=simulatePersonalMultiAsset({monthly_market_returns:market,portfolio:pi,
 plan:{...sourcePlan,monthly_contribution_source:'EXTERNAL_NEW_MONEY'}});
const ir=simulatePersonalMultiAsset({monthly_market_returns:market,portfolio:pi,
 plan:{...sourcePlan,monthly_contribution_source:'INTERNAL_FROM_SALARY_PENSION'}});
assert.equal(er.ending_assets_yen-ir.ending_assets_yen,12000,'fresh cash is 12x1000 above internal, no return');
assert.equal(ir.expected_deposits_yen,1200*12);
assert.equal(ir.external_contribution_yen,0);
assert.equal(ir.internal_from_income_yen,12000);
assert.equal(ir.rows.length,12);
assert.equal(ir.contribution_source,'INTERNAL_FROM_SALARY_PENSION');
assert.equal(ir.rows[0].cashflow_breakdown.monthly_contribution_source,'INTERNAL_FROM_SALARY_PENSION');
assert.throws(()=>cashflowsForPlan({...sourcePlan,monthly_contribution_source:'INTERNAL_FROM_SALARY_PENSION',
 monthly_contribution_yen:1201},12,'2000-01'),/二重計上防止/);
assert.throws(()=>cashflowsForPlan({...sourcePlan,monthly_contribution_source:'INTERNAL_FROM_SALARY_PENSION',
 pension_schedules:[]},12,'2000-01'),/二重計上防止/);
assert.throws(()=>cashflowsForPlan({...sourcePlan,monthly_contribution_source:'WRONG'},12,'2000-01'),/monthly_contribution_source/);
assert.equal(validatePlan({...sourcePlan},12).contributionSource,'EXTERNAL_NEW_MONEY');
const roll=rollingPersonalMultiAsset({monthly_market_returns:path(ids,13),
 horizon_months:12,portfolio:pi,plan:{...sourcePlan,monthly_contribution_source:'INTERNAL_FROM_SALARY_PENSION'}});
assert.equal(roll.complete_windows,2);
assert(roll.windows.every(w=>w.internal_from_income_yen===12000&&w.external_contribution_yen===0));
let checked=0;
for(const count of [1,2,3,6,12])
for(const strategy of ['PRO_RATA','CASH_FIRST','RISK_FIRST'])
for(const monthlyExpense of [0,100,500,2000])
for(const savings of [0,30,200]){
 const assets=Array.from({length:count},(_,i)=>i===0?'CASH_JPY':'A'+i);
 const holdings=assets.map((x,i)=>i===0?500:400);
 const series=path(assets,12,.013);
 const p=portfolio(assets,holdings,strategy);
 const incomePlan={monthly_expense_yen:monthlyExpense,
  monthly_contribution_yen:savings,monthly_contribution_source:'EXTERNAL_NEW_MONEY',
  salary_schedules:[{id:'wage',start_offset:0,end_offset_exclusive:12,monthly_yen:100}],
  one_time_events:[{id:'repair',offset_months:3,kind:'EXPENSE',amount_yen:500}]};
 const r=simulatePersonalMultiAsset({monthly_market_returns:series,portfolio:p,plan:incomePlan});
 let totalPaid=0,totalUnfunded=0,marketGain=0;
 for(const row of r.rows){
  const h=Object.values(row.holdings);
  assert.equal(add(h.map(x=>x.withdrawal_yen)),row.paid_withdrawal_yen);
  assert(h.every(x=>x.withdrawal_yen>=0&&x.contribution_yen>=0&&x.closing_yen>=0));
  assert.equal(row.requested_withdrawal_yen,row.paid_withdrawal_yen+row.unfunded_yen);
  assert.equal(row.cashflow_breakdown.paid_event_expense_yen+row.cashflow_breakdown.paid_living_expense_yen,row.paid_withdrawal_yen);
  totalPaid+=row.paid_withdrawal_yen;totalUnfunded+=row.unfunded_yen;marketGain+=row.investment_gain_yen;
 }
 assert.equal(r.total_unfunded_yen,totalUnfunded);
 assert.equal(r.ending_assets_yen,add(holdings)+r.expected_deposits_yen+marketGain-totalPaid);
 checked++;
}
assert.equal(checked,180);
console.log('PASS MULTIASSET CASH_SOURCE_AND_SALE_V03: 180 cross-asset configurations, integer conservation, 12-month salary earmark no double-count, explicit cash-first/risk-first/pro-rata and invalid cash IDs');
