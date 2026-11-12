#!/usr/bin/env node
'use strict';
// K. Aito Analytics | explicit per-event two-phase cashflow and no-netting QA.
// Entirely synthetic, 1..12 assets, no private market data, no network.
const assert=require('node:assert/strict');
const {simulatePortfolio,apportion}=require('../lib/analytics/portfolio-core.cjs');
const {simulatePersonalMultiAsset,cashflowsForPlan,validatePlan,rollingPersonalMultiAsset}
 =require('../lib/analytics/personal-multiasset-bridge.cjs');
const {monthSerial,formatMonth}=require('../lib/analytics/cashflow-core.cjs');
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const date=i=>formatMonth(monthSerial('2000-02')+i);
const path=(ids,length,rate=.01)=>Array.from({length},(_,i)=>({
 month:date(i),origin:'SYNTHETIC',
 asset_returns:Object.fromEntries(ids.map((id,j)=>[id,id==='CASH_JPY'?0:rate+(j%2===0?-.005:.002)]))
}));
function config(ids,startEach=100,options={}){
 const p={initial_holdings_yen:Object.fromEntries(ids.map(id=>[id,startEach])),
  target_weights:Object.fromEntries(ids.map(id=>[id,1/ids.length])),
  rebalance:{mode:'NONE'},...options};
 if(p.withdrawal_strategy&&p.withdrawal_strategy!=='PRO_RATA')p.cash_asset_id='CASH_JPY';
 return p;
}
// Case 1: 100 at beginning, start repair 50, monthly market +10%,
// end income 20, end living cost 50 = (100-50)*1.10+20-50 = 25.
{
 const result=simulatePersonalMultiAsset({
  portfolio:config(['RISK'],100,{withdrawal_timing:'MONTH_END'}),
  monthly_market_returns:[{month:date(0),origin:'SYNTHETIC',asset_returns:{RISK:.1}}],
  plan:{monthly_expense_yen:50,one_time_events:[
   {id:'repair',offset_months:0,kind:'EXPENSE',amount_yen:50,timing:'MONTH_START'},
   {id:'bonus',offset_months:0,kind:'INCOME',amount_yen:20,timing:'MONTH_END'}
  ]}
 });
 assert.equal(result.two_phase_enabled,true);
 assert.equal(result.ending_assets_yen,25);
 assert.equal(result.market_investment_gain_yen,5);
 assert.equal(result.expected_deposits_yen,20);
 assert.equal(result.actually_paid_expenses_yen,100);
 const row=result.rows[0],b=row.cashflow_breakdown;
 assert.equal(row.phases.MONTH_START.requested_withdrawal_yen,50);
 assert.equal(row.phases.MONTH_START.paid_withdrawal_yen,50);
 assert.equal(row.phases.MONTH_END.contribution_yen,20);
 assert.equal(row.phases.MONTH_END.requested_withdrawal_yen,50);
 assert.equal(row.phases.MONTH_END.paid_withdrawal_yen,50);
 assert.equal(b.event_payment_allocations[0].id,'repair');
 assert.equal(b.event_payment_allocations[0].timing,'MONTH_START');
 assert.equal(b.event_payment_allocations[0].paid_yen,50);
 assert.equal(b.event_income_items[0].timing,'MONTH_END');
 assert.equal(b.net_month_start_yen,-50);
 assert.equal(b.net_month_end_yen,-30);
 assert.equal(result.net_cashflow_total_yen,-80);
 assert.equal(result.gross_cashflow_contract,'RECORD_GROSS_PHASE_INCOME_AND_LIABILITIES_WITH_NET_DERIVED');
}
// Case 2: later income cannot retroactively clear the earlier unpaid phase.
{
 const result=simulatePersonalMultiAsset({
  portfolio:config(['CASH_JPY'],20,{withdrawal_timing:'MONTH_END'}),
  monthly_market_returns:[{month:date(0),origin:'SYNTHETIC',asset_returns:{CASH_JPY:0}}],
  plan:{monthly_expense_yen:0,one_time_events:[
   {id:'startRepair',offset_months:0,kind:'EXPENSE',amount_yen:100,timing:'MONTH_START'},
   {id:'lateSalary',offset_months:0,kind:'INCOME',amount_yen:200,timing:'MONTH_END'},
   {id:'endRepair',offset_months:0,kind:'EXPENSE',amount_yen:100,timing:'MONTH_END'}
  ]}
 });
 assert.equal(result.ending_assets_yen,100);
 assert.equal(result.first_shortfall_month,date(0));
 assert.equal(result.total_unfunded_yen,80);
 const b=result.rows[0].cashflow_breakdown;
 assert.equal(b.event_payment_allocations[0].unfunded_yen,80);
 assert.equal(b.event_payment_allocations[1].paid_yen,100);
 assert.equal(result.rows[0].phases.MONTH_START.unfunded_yen,80);
 assert.equal(result.rows[0].phases.MONTH_END.unfunded_yen,0);
}
// Case 3: equal gross START inflow/outflow must not disappear from the ledger.
{
 const result=simulatePortfolio({
  ...config(['CASH_JPY'],100),monthly_returns:path(['CASH_JPY'],1),
  market_mode:'SYNTHETIC_DEMO',monthly_phase_cashflows:[{
   month:date(0),start_contribution_yen:60,start_withdrawal_yen:60,
   end_contribution_yen:0,end_withdrawal_yen:0
  }]
 });
 assert.equal(result.ending_assets_yen,100);
 assert.equal(result.rows[0].phases.MONTH_START.contribution_yen,60);
 assert.equal(result.rows[0].phases.MONTH_START.paid_withdrawal_yen,60);
 assert.equal(result.rows[0].contribution_yen,60);
 assert.equal(result.rows[0].paid_withdrawal_yen,60);
 assert.equal(result.rows[0].investment_gain_yen,0);
 assert.equal(result.rows[0].phases.MONTH_START.contribution_yen-
   result.rows[0].phases.MONTH_START.requested_withdrawal_yen,0);
}
// Case 4: old 4-field events and an explicit matching phase must preserve
// exact old multiasset monthly ledger and final balance.
{
 const base={monthly_expense_yen:700,
  salary_schedules:[{id:'work',start_offset:0,end_offset_exclusive:12,monthly_yen:100}],
  one_time_events:[{id:'repair',offset_months:2,kind:'EXPENSE',amount_yen:250},
   {id:'gift',offset_months:3,kind:'INCOME',amount_yen:500}]};
 const ids=['CASH_JPY','RISK'];
 const old=simulatePersonalMultiAsset({portfolio:config(ids,1500,{withdrawal_timing:'MONTH_END'}),
  plan:base,monthly_market_returns:path(ids,12)});
 const explicit=simulatePersonalMultiAsset({portfolio:config(ids,1500,{withdrawal_timing:'MONTH_END'}),
  plan:{...base,one_time_events:base.one_time_events.map(e=>({...e,
   timing:e.kind==='EXPENSE'?'MONTH_END':'MONTH_START'}))},
  monthly_market_returns:path(ids,12)});
 assert.equal(old.two_phase_enabled,false);
 assert.equal(explicit.two_phase_enabled,false);
 assert.deepEqual(old.rows.map(x=>x.closing_yen),explicit.rows.map(x=>x.closing_yen));
 assert.deepEqual(old.rows.map(x=>x.paid_withdrawal_yen),explicit.rows.map(x=>x.paid_withdrawal_yen));
 assert.equal(old.ending_assets_yen,explicit.ending_assets_yen);
}
// Case 5: bad phase cashflows must be rejected without default fallback.
{
 const base={...config(['CASH_JPY']),monthly_returns:path(['CASH_JPY'],1),
  market_mode:'SYNTHETIC_DEMO'};
 const good=[{month:date(0),start_contribution_yen:0,start_withdrawal_yen:0,
  end_contribution_yen:0,end_withdrawal_yen:0}];
 assert.throws(()=>simulatePortfolio({...base,monthly_phase_cashflows:good,
  monthly_contribution_yen:0}),/conflict/);
 assert.throws(()=>simulatePortfolio({...base,monthly_phase_cashflows:good.map(x=>({...x,foo:1}))}),/Unsupported/);
 assert.throws(()=>simulatePortfolio({...base,monthly_phase_cashflows:good.map(x=>({...x,end_contribution_yen:-1}))}),/integer JPY/);
 assert.throws(()=>simulatePortfolio({...base,monthly_phase_cashflows:good.map(x=>({...x,month:'2000-03'}))}),/month mismatch/);
 assert.throws(()=>validatePlan({one_time_events:[{id:'ev',offset_months:0,kind:'INCOME',
  amount_yen:1,timing:'AFTER_YEAR_END'}]},12),/event timing/);
}
// 1..12 assets x withdrawal strategies x priority x fee-free cashflow phases.
// Every phase must reconcile requested/paid/unfunded, before/after capital
// and the high-level gross-vs-net loss-free identity.
let checked=0;
for(const n of [1,2,3,6,12])
for(const sale of ['PRO_RATA','CASH_FIRST','RISK_FIRST'])
for(const priority of ['EVENT_FIRST','LIVING_FIRST'])
for(const livingPhase of ['MONTH_START','MONTH_END'])
for(const eventPlacement of [0,1,2]){
 const ids=Array.from({length:n},(_,i)=>i===0?'CASH_JPY':'ASSET'+i);
 const portfolio=config(ids,120,{withdrawal_timing:livingPhase,
  withdrawal_strategy:sale,rebalance:{mode:'PERIODIC',interval_months:12}});
 const events=[
  {id:'gift',offset_months:0,kind:'INCOME',amount_yen:90,timing:'MONTH_END'},
  {id:'repair',offset_months:0,kind:'EXPENSE',amount_yen:240,
    timing:eventPlacement===1?'MONTH_END':'MONTH_START'},
  {id:'housing',offset_months:1,kind:'EXPENSE',amount_yen:350,
    timing:eventPlacement===2?'MONTH_END':'MONTH_START'}
 ];
 const plan={monthly_expense_yen:90,monthly_contribution_yen:15,
  monthly_contribution_source:'EXTERNAL_NEW_MONEY',expense_priority:priority,
  salary_schedules:[{id:'wage',start_offset:0,end_offset_exclusive:12,monthly_yen:30}],
  one_time_events:events};
 const result=simulatePersonalMultiAsset({portfolio,plan,monthly_market_returns:path(ids,12)});
 const totalOpening=120*n;
 let totalGrossIncome=0,totalGrossDue=0,totalPaid=0,totalReturn=0;
 for(const row of result.rows){
  const b=row.cashflow_breakdown,phase=row.phases;
  assert(result.two_phase_enabled,'all test variants contain END gift, opposite default start');
  assert(phase&&phase.MONTH_START&&phase.MONTH_END);
  assert.equal(row.requested_withdrawal_yen,
   phase.MONTH_START.requested_withdrawal_yen+phase.MONTH_END.requested_withdrawal_yen);
  assert.equal(row.paid_withdrawal_yen,
   phase.MONTH_START.paid_withdrawal_yen+phase.MONTH_END.paid_withdrawal_yen);
  assert.equal(row.unfunded_yen,
   phase.MONTH_START.unfunded_yen+phase.MONTH_END.unfunded_yen);
  assert.equal(row.contribution_yen,
   phase.MONTH_START.contribution_yen+phase.MONTH_END.contribution_yen);
  assert.equal(b.total_income_yen,row.contribution_yen);
  assert.equal(b.total_requested_expense_yen,row.requested_withdrawal_yen);
  assert.equal(b.total_requested_expense_yen,
   b.paid_living_expense_yen+b.unfunded_living_expense_yen+
   b.paid_event_expense_yen+b.unfunded_event_expense_yen);
  assert.equal(b.event_payment_allocations.reduce((v,e)=>v+e.paid_yen,0),
   b.paid_event_expense_yen);
  assert.equal(b.event_payment_allocations.reduce((v,e)=>v+e.unfunded_yen,0),
   b.unfunded_event_expense_yen);
  assert.equal(Object.values(row.holdings).reduce((v,x)=>v+x.withdrawal_month_start_yen,0),
   phase.MONTH_START.paid_withdrawal_yen);
  assert.equal(Object.values(row.holdings).reduce((v,x)=>v+x.withdrawal_month_end_yen,0),
   phase.MONTH_END.paid_withdrawal_yen);
  assert.equal(Object.values(row.holdings).reduce((v,x)=>v+x.closing_yen,0),row.closing_yen);
  totalGrossIncome+=row.contribution_yen;
  totalGrossDue+=row.requested_withdrawal_yen;
  totalPaid+=row.paid_withdrawal_yen;
  totalReturn+=row.investment_gain_yen;
 }
 assert.equal(result.ending_assets_yen,totalOpening+totalGrossIncome+totalReturn-totalPaid);
 assert.equal(result.expected_deposits_yen,totalGrossIncome);
 assert.equal(result.scheduled_expenses_yen,totalGrossDue);
 assert.equal(result.actually_paid_expenses_yen,totalPaid);
 assert.equal(result.net_cashflow_total_yen,totalGrossIncome-totalGrossDue);
 assert.equal(result.total_unfunded_yen,totalGrossDue-totalPaid);
 checked++;
}
assert.equal(checked,180);
console.log('PASS ANALYTICS_TWO_PHASE_V05: 180 synthetic 1..12 asset gross/net phased events, sell priorities, phase-specific unpaid, no retroactive settlement and unchanged old cashflow results');
