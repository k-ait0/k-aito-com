#!/usr/bin/env node
'use strict';
// Synthetic-only specification acceptance for Personal gross cashflows v0.2.
// Its job is to prove what gets paid when liquid assets are insufficient;
// the underlying Core sale proceeds and gross final balance are unchanged.
const assert=require('node:assert/strict');
const {simulatePersonalMultiAsset,cashflowsForPlan,validatePlan,migrateLegacyInclusivePensions,
 allocatePriorityExpenses}=require('../lib/analytics/personal-multiasset-bridge.cjs');
const {buildRelativeMonthlyCashflows}=require('../lib/analytics/rolling-portfolio-lifecycle.cjs');
const {monthSerial,formatMonth}=require('../lib/analytics/cashflow-core.cjs');
const start=monthSerial('2000-02');
function market(count,horizon,rate=0){
 const ids=Array.from({length:count},(_,i)=>'A'+i);
 return {ids,rows:Array.from({length:horizon},(_,j)=>({
  month:formatMonth(start+j),origin:'SYNTHETIC',
  asset_returns:Object.fromEntries(ids.map(id=>[id,rate]))
 }))};
}
function run(count,horizon,starting,plan,rate=0){
 const {ids,rows}=market(count,horizon,rate);
 const p={initial_holdings_yen:Object.fromEntries(ids.map(id=>[id,starting])),
  target_weights:Object.fromEntries(ids.map(id=>[id,1/count])),
  rebalance:{mode:'NONE'}};
 return simulatePersonalMultiAsset({monthly_market_returns:rows,portfolio:p,plan});
}
function expenseRow(r,i=0){return r.rows[i].cashflow_breakdown}
const firstPlan={monthly_expense_yen:1000,
 one_time_events:[{id:'repair',offset_months:0,kind:'EXPENSE',amount_yen:100}]};
const eventFirst=run(1,1,100,{...firstPlan,expense_priority:'EVENT_FIRST'});
const livingFirst=run(1,1,100,{...firstPlan,expense_priority:'LIVING_FIRST'});
assert.equal(eventFirst.ending_assets_yen,0);
assert.equal(livingFirst.ending_assets_yen,0);
assert.equal(eventFirst.total_unfunded_yen,1000);
assert.equal(livingFirst.total_unfunded_yen,1000);
assert.equal(expenseRow(eventFirst).paid_event_expense_yen,100);
assert.equal(expenseRow(eventFirst).paid_living_expense_yen,0);
assert.equal(expenseRow(eventFirst).unfunded_living_expense_yen,1000);
assert.equal(expenseRow(eventFirst).unfunded_event_expense_yen,0);
assert.equal(expenseRow(livingFirst).paid_event_expense_yen,0);
assert.equal(expenseRow(livingFirst).paid_living_expense_yen,100);
assert.equal(expenseRow(livingFirst).unfunded_living_expense_yen,900);
assert.equal(expenseRow(livingFirst).unfunded_event_expense_yen,100);
assert.equal(eventFirst.paid_event_expense_yen,100);
assert.equal(livingFirst.unfunded_event_expense_yen,100);
assert.equal(validatePlan(firstPlan,1).priority,'EVENT_FIRST','Legacy Personal preferred event-first');
const inputOrder={monthly_expense_yen:1000,expense_priority:'EVENT_FIRST',
 one_time_events:[{id:'repair',offset_months:0,kind:'EXPENSE',amount_yen:80},
  {id:'tax',offset_months:0,kind:'EXPENSE',amount_yen:60}]};
const paid=run(1,1,100,inputOrder),alloc=expenseRow(paid).event_payment_allocations;
assert.deepEqual(alloc.map(x=>x.id),['repair','tax']);
assert.deepEqual(alloc.map(x=>x.paid_yen),[80,20]);
assert.deepEqual(alloc.map(x=>x.unfunded_yen),[0,40]);
const reversed=run(1,1,100,{...inputOrder,one_time_events:inputOrder.one_time_events.slice().reverse()});
assert.deepEqual(expenseRow(reversed).event_payment_allocations.map(x=>x.paid_yen),[60,40]);
assert.equal(reversed.ending_assets_yen,paid.ending_assets_yen);
assert.equal(reversed.total_unfunded_yen,paid.total_unfunded_yen);
// A legacy INCLUSIVE pension period must be explicitly migrated, not simply
// assigned the old 'end_offset_months' to 'end_offset_exclusive'.
const oldLegacy={monthly_contribution_yen:0,monthly_withdrawal_yen:0,
 relative_pension_schedule:[{id:'public',start_offset_months:0,end_offset_months:12,monthly_yen:100}]};
const oldCashflow=buildRelativeMonthlyCashflows(oldLegacy,24);
const converted=migrateLegacyInclusivePensions(oldLegacy.relative_pension_schedule,24);
assert.equal(converted[0].end_offset_exclusive,13);
const modern=cashflowsForPlan({monthly_expense_yen:0,pension_schedules:converted},24,'2000-01');
assert.deepEqual(modern.breakdown.map(x=>x.pension_yen),oldCashflow.map(x=>x.breakdown.pension_yen));
assert.equal(modern.breakdown.reduce((a,b)=>a+b.pension_yen,0),1300);
const legacyNoEnd=migrateLegacyInclusivePensions([{id:'public',start_offset_months:0,monthly_yen:42}],24);
assert.equal(legacyNoEnd[0].end_offset_exclusive,24);
assert.throws(()=>migrateLegacyInclusivePensions([{
 id:'public',start_offset_months:0,end_offset_months:24,monthly_yen:42}],24),/outside horizon/);
assert.throws(()=>migrateLegacyInclusivePensions([
 {id:'dup',start_offset_months:0,end_offset_months:1,monthly_yen:42},
 {id:'dup',start_offset_months:0,end_offset_months:1,monthly_yen:42}],24),/duplicated/);
assert.throws(()=>validatePlan({...firstPlan,expense_priority:'PRO_RATA'},1),/expense_priority/);
assert.throws(()=>allocatePriorityExpenses({living_expense_yen:10,event_expense_items:[]},11,'EVENT_FIRST'),/more than/);
// Events outside the smaller horizon are valid plan facts, but not added to
// gross income/expense for that particular compared investment horizon.
const late={monthly_expense_yen:0,one_time_events:[
 {id:'gift',offset_months:18,kind:'INCOME',amount_yen:500},
 {id:'majorRepair',offset_months:18,kind:'EXPENSE',amount_yen:300}
]};
const short=run(1,12,1000,late);
assert.equal(short.ending_assets_yen,1000);
assert.deepEqual(short.skipped_events_after_horizon.map(x=>x.id),['gift','majorRepair']);
const long=run(1,24,1000,late);
assert.equal(long.ending_assets_yen,1200);
assert.equal(long.skipped_events_after_horizon.length,0);
assert.equal(expenseRow(long,18).one_time_income_yen,500);
assert.equal(expenseRow(long,18).paid_event_expense_yen,300);
assert.throws(()=>run(1,24,1000,{...late,one_time_events:[
 {id:'bad',offset_months:1200,kind:'EXPENSE',amount_yen:1}]}),/1199/);
// Cartesian cashflow conservation for 1..12 assets, different cashflow
// priorities, incomes and 1/12/24-month horizons. No market observations.
let cases=0;
for(const count of [1,2,4,12])
for(const horizon of [1,12,24])
for(const amount of [0,100,1000])
for(const priority of ['EVENT_FIRST','LIVING_FIRST'])
for(const eventAmount of [0,300]){
 const plan={monthly_contribution_yen:20,monthly_expense_yen:100,
  expense_priority:priority,
  salary_schedules:[{id:'wage',start_offset:0,end_offset_exclusive:24,monthly_yen:amount}],
  pension_schedules:[{id:'pension',start_offset:12,end_offset_exclusive:24,monthly_yen:amount}],
  one_time_events:[
   {id:'repair',offset_months:0,kind:'EXPENSE',amount_yen:eventAmount},
   {id:'gift',offset_months:11,kind:'INCOME',amount_yen:30}
  ]};
 const r=run(count,horizon,110,plan,0.002);
 let due=0,paid=0,unfunded=0,expPaid=0,livingPaid=0;
 for(const row of r.rows){
  const b=row.cashflow_breakdown;
  assert.equal(row.paid_withdrawal_yen,
    b.paid_event_expense_yen+b.paid_living_expense_yen);
  assert.equal(row.unfunded_yen,
    b.unfunded_event_expense_yen+b.unfunded_living_expense_yen);
  assert.equal(b.living_expense_yen,
    b.paid_living_expense_yen+b.unfunded_living_expense_yen);
  assert.equal(b.one_time_expense_yen,
    b.paid_event_expense_yen+b.unfunded_event_expense_yen);
  assert.equal(b.event_payment_allocations.reduce((a,e)=>a+e.paid_yen,0),
    b.paid_event_expense_yen);
  assert.equal(b.event_payment_allocations.reduce((a,e)=>a+e.unfunded_yen,0),
    b.unfunded_event_expense_yen);
  due+=row.requested_withdrawal_yen;paid+=row.paid_withdrawal_yen;
  unfunded+=row.unfunded_yen;expPaid+=b.paid_event_expense_yen;
  livingPaid+=b.paid_living_expense_yen;
 }
 assert.equal(due,paid+unfunded);
 assert.equal(expPaid,r.paid_event_expense_yen);
 assert.equal(livingPaid,r.paid_living_expense_yen);
 assert.equal(r.ending_assets_yen,
  count*110+r.expected_deposits_yen+r.market_investment_gain_yen-paid);
 assert.equal(r.skipped_events_after_horizon.length,horizon===1?1:0);
 cases++;
}
assert.equal(cases,144);
console.log('PASS PERSONAL_CASHFLOW_CONTRACT_V02: 144 synthetic portfolios, both expense priorities, per-event paid/unfunded, legacy inclusive pension migration, future event skip and full gross conservation');
