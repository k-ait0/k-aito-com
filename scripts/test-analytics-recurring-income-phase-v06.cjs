#!/usr/bin/env node
'use strict';
// 2026-11-13: Salary/pension recurring income start/end month + DWZ age
// migration acceptance. Purely synthetic, no private market data or requests.
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const {
 validatePlan,cashflowsForPlan,simulatePersonalMultiAsset,rollingPersonalMultiAsset,
 migrateDWZAgeIncomeStreams
}=require('../lib/analytics/personal-multiasset-bridge.cjs');
const {monthSerial,formatMonth}=require('../lib/analytics/cashflow-core.cjs');
const date=i=>formatMonth(monthSerial('2000-02')+i);
function path(ids,length,risk=.1){
 return Array.from({length},(_,i)=>({month:date(i),origin:'SYNTHETIC',
  asset_returns:Object.fromEntries(ids.map(id=>[id,id==='CASH_JPY'?0:(i===0?risk:0)]))}));
}
const p=(ids,initial=100,strategy='PRO_RATA',phase='MONTH_START')=>{
 const cfg={initial_holdings_yen:Object.fromEntries(ids.map(id=>[id,initial])),
 target_weights:Object.fromEntries(ids.map(id=>[id,1/ids.length])),
 withdrawal_strategy:strategy,withdrawal_timing:phase,rebalance:{mode:'NONE'}};
 if(strategy!=='PRO_RATA')cfg.cash_asset_id='CASH_JPY';
 return cfg;
};
const salary=(timing,amount=100,start=0,end=12)=>({
 id:'salary',start_offset:start,end_offset_exclusive:end,monthly_yen:amount,...(timing?{timing}:{})
});
const pension=(timing,amount=30,start=0,end=12)=>({
 id:'pension',start_offset:start,end_offset_exclusive:end,monthly_yen:amount,...(timing?{timing}:{})
});
function run(plan,opts={}){
 const assets=opts.ids||['RISK'];
 return simulatePersonalMultiAsset({portfolio:p(assets,opts.initial??100,opts.strategy,opts.phase),
  monthly_market_returns:path(assets,opts.horizon??1,opts.return??.1),plan});
}
// End salary is not exposed to the monthly return; exact 100-yen difference
// in opening liquidity and a 10-yen difference in ending holdings.
{
 const start=run({salary_schedules:[salary('MONTH_START')]});
 const end=run({salary_schedules:[salary('MONTH_END')]});
 assert.equal(start.ending_assets_yen,220);
 assert.equal(end.ending_assets_yen,210);
 assert.equal(start.two_phase_enabled,false);
 assert.equal(end.two_phase_enabled,true);
 assert.equal(end.rows[0].phases.MONTH_START.contribution_yen,0);
 assert.equal(end.rows[0].phases.MONTH_END.contribution_yen,100);
 assert.equal(end.rows[0].investment_gain_yen,10);
 assert.equal(start.rows[0].investment_gain_yen,20);
 const legacy=run({salary_schedules:[salary(null)]});
 assert.equal(legacy.two_phase_enabled,false);
 assert.equal(legacy.ending_assets_yen,start.ending_assets_yen);
}
// Pension and salary at different phases. Income paid at month end cannot
// heal an earlier shortfall and cannot earn any of that month's yield.
{
 const q=run({monthly_expense_yen:150, salary_schedules:[salary('MONTH_END',100,0,1)],
 pension_schedules:[pension('MONTH_START',30,0,1)]},{return:0});
 assert.equal(q.two_phase_enabled,true);
 assert.equal(q.rows[0].phases.MONTH_START.contribution_yen,30);
 assert.equal(q.rows[0].phases.MONTH_START.paid_withdrawal_yen,130);
 assert.equal(q.rows[0].phases.MONTH_START.unfunded_yen,20);
 assert.equal(q.rows[0].phases.MONTH_END.contribution_yen,100);
 assert.equal(q.rows[0].closing_yen,100);
 assert.equal(q.total_unfunded_yen,20);
 const b=q.rows[0].cashflow_breakdown;
 assert.equal(b.salary_month_start_yen,0);
 assert.equal(b.salary_month_end_yen,100);
 assert.equal(b.pension_month_start_yen,30);
 assert.equal(b.pension_month_end_yen,0);
 assert.equal(b.realized_net_month_start_yen,-100);
 assert.equal(b.realized_net_month_end_yen,100);
}
// One-month exclusive ends and future schedules, including an END stream
// outside the shorter horizon: no phantom second phase required.
{
 const q=run({salary_schedules:[salary('MONTH_END',100,12,24)]});
 assert.equal(q.two_phase_enabled,false);
 assert.equal(q.ending_assets_yen,110);
 const f=cashflowsForPlan({salary_schedules:[salary('MONTH_END',100,0,12)]},12,'2000-01');
 assert.equal(f.requires_two_phase,true);
 assert.equal(f.breakdown.length,12);
 assert.equal(f.breakdown.every(x=>x.salary_month_end_yen===100),true);
 assert.equal(f.monthly_phase_cashflows.reduce((a,b)=>a+b.end_contribution_yen,0),1200);
 assert.equal(f.monthly_phase_cashflows.reduce((a,b)=>a+b.start_contribution_yen,0),0);
 const cut=cashflowsForPlan({salary_schedules:[salary('MONTH_END',100,0,1)]},12,'2000-01');
 assert.equal(cut.breakdown[0].salary_month_end_yen,100);
 assert.equal(cut.breakdown[1].salary_month_end_yen,0);
}
assert.throws(()=>validatePlan({salary_schedules:[salary('NOON')]},12),/timing/);
assert.throws(()=>validatePlan({pension_schedules:[pension('DAY_END')]},12),/timing/);
assert.throws(()=>validatePlan({salary_schedules:[salary('MONTH_END'),salary('MONTH_START')]},12),/Duplicate/);
// Explicit salary/pension funding source is still a budget earmark,
// never double-funded even if the salary comes at month end.
{
 const plan={monthly_contribution_yen:40,
  monthly_contribution_source:'INTERNAL_FROM_SALARY_PENSION',
  salary_schedules:[salary('MONTH_END',50,0,1)]};
 const q=run(plan);
 assert.equal(q.two_phase_enabled,true);
 assert.equal(q.expected_deposits_yen,50);
 assert.equal(q.internal_from_income_yen,40);
 assert.equal(q.external_contribution_yen,0);
 assert.equal(q.rows[0].phases.MONTH_START.contribution_yen,0);
 assert.equal(q.rows[0].phases.MONTH_END.contribution_yen,50);
 assert.throws(()=>run({...plan,monthly_contribution_yen:51}),/二重計上防止/);
}
// DWZ salary/pension income ages are exclusive-end; explicit conversion
// is phase-preserving, provenance-preserving, and auditable for skipped spans.
{
 const inDWZ=[
  {id:'work',startAgeMonths:470,endAgeMonths:490,monthlyAmount:150,
   timing:'END_OF_MONTH',escalationModel:{type:'NONE'}},
  {id:'future',startAgeMonths:520,endAgeMonths:530,monthlyAmount:800,
   timing:'END_OF_MONTH',escalationModel:{type:'NONE'}},
  {id:'retired',startAgeMonths:400,endAgeMonths:450,monthlyAmount:80,
   timing:'BEGINNING_OF_MONTH',escalationModel:{type:'NONE'}}
 ];
 const converted=migrateDWZAgeIncomeStreams(inDWZ,{
  simulationStartAgeMonths:480,horizon_months:24,kind:'salary'});
 assert.equal(converted.schedules.length,1);
 assert.deepEqual(converted.schedules[0],{
  id:'work',start_offset:0,end_offset_exclusive:10,monthly_yen:150,timing:'MONTH_END'});
 assert.deepEqual(converted.excluded.map(x=>x.reason),['STARTS_AFTER_HORIZON','ENDED_BEFORE_START']);
 const f=cashflowsForPlan({salary_schedules:converted.schedules},24,'2000-01');
 assert.equal(f.breakdown.reduce((a,x)=>a+x.salary_month_end_yen,0),1500);
 assert.throws(()=>migrateDWZAgeIncomeStreams([{
  ...inDWZ[0],escalationModel:{type:'CPI_LINKED'}
 }],{simulationStartAgeMonths:480,horizon_months:24,kind:'salary'}),/requires explicit.*contract/);
 assert.throws(()=>migrateDWZAgeIncomeStreams([{
  ...inDWZ[0],timing:'INTRA_MONTH'
 }],{simulationStartAgeMonths:480,horizon_months:24,kind:'salary'}),/timing/);
 assert.throws(()=>migrateDWZAgeIncomeStreams(inDWZ,{
  simulationStartAgeMonths:480,horizon_months:24,kind:'expense'}),/kind/);
}
// Differential comparison with frozen original DWZ two-phase one-asset
// execution. Only a narrowly controlled, tax-free, unscaled scenario.
{
 const fixture=fs.readFileSync('research/analytics/fixtures/dwz_simulateOne_r4_v16_9_research_fixture.js','utf8');
 const context=vm.createContext({Math,Object,Array,Number,Error});
 new vm.Script([
  "const validation_js_1={validateInputs(){return true;}};",
  "const exports={ENGINE_VERSION:'v06-age-qa'};",
  "const clone=(h)=>Object.fromEntries(Object.entries(h).map(([k,v])=>[k,{...v}]));",
  fixture,"globalThis.dwzSimulate=simulateOne;"
 ].join('\n')).runInContext(context);
 const orig={id:'age-cutoff-test',schemaVersion:'v0.6',
  portfolio:{holdings:{RISK:{marketValue:1000,costBasis:1000}}},
  person:{simulationStartAgeMonths:480},lifeEvents:[],
  incomeStreams:[{id:'salary',startAgeMonths:480,endAgeMonths:481,
   timing:'END_OF_MONTH',monthlyAmount:100,escalationModel:{type:'NONE'}}],
  pensionStreams:[{id:'pension',startAgeMonths:480,endAgeMonths:481,
   timing:'BEGINNING_OF_MONTH',monthlyAmount:30,escalationModel:{type:'NONE'}}],
  expenseStreams:[{timing:'BEGINNING_OF_MONTH',startAgeMonths:480,endAgeMonths:481,
   monthlyAmount:20,escalationModel:{type:'NONE'}},
   {timing:'END_OF_MONTH',startAgeMonths:480,endAgeMonths:481,
   monthlyAmount:50,escalationModel:{type:'NONE'}}],
  target:{valueBasis:'NOMINAL',targetAssets:0}};
 const d=context.dwzSimulate(orig,{months:[date(0)],returns:{RISK:[.1]},
  cpiIndex:[1],datasetVersion:'synthetic-v06'});
 const mSalary=migrateDWZAgeIncomeStreams(orig.incomeStreams,{
  simulationStartAgeMonths:480,horizon_months:1,kind:'salary'});
 const mPension=migrateDWZAgeIncomeStreams(orig.pensionStreams,{
  simulationStartAgeMonths:480,horizon_months:1,kind:'pension'});
 const r=run({monthly_expense_yen:20,salary_schedules:mSalary.schedules,
  pension_schedules:mPension.schedules,
  one_time_events:[{id:'lateBill',offset_months:0,kind:'EXPENSE',
   amount_yen:50,timing:'MONTH_END'}]}, {initial:1000});
 // (1000 + 30 - 20) * 1.10 + 100 - 50 = 1161.
 assert.equal(d.summary.finalAssets,1161);
 assert.equal(r.ending_assets_yen,1161);
 assert.equal(d.summary.totalInvestmentReturn,r.market_investment_gain_yen);
 assert.equal(d.summary.totalPension,30);
 assert.equal(r.rows[0].cashflow_breakdown.pension_month_start_yen,30);
 assert.equal(r.rows[0].cashflow_breakdown.salary_month_end_yen,100);
 assert.equal(d.summary.totalIncome,100);
}
// 180 synthetic cross-product combinations. No scenario combines a source
// with a missing month or assumes tax costs are applied.
let checked=0;
for(const size of [1,2,3,6,12])
for(const salPhase of ['MONTH_START','MONTH_END'])
for(const pensionPhase of ['MONTH_START','MONTH_END'])
for(const strategy of ['PRO_RATA','CASH_FIRST','RISK_FIRST'])
for(const spend of [0,50,600]){
 const ids=Array.from({length:size},(_,i)=>i===0?'CASH_JPY':'RISK'+i);
 const portfolio=p(ids,125,strategy,'MONTH_START');
 const plan={monthly_contribution_yen:20,monthly_expense_yen:spend,
  salary_schedules:[salary(salPhase,80,0,12)],
  pension_schedules:[pension(pensionPhase,120,6,12)],
  one_time_events:[
   {id:'gift',offset_months:2,kind:'INCOME',amount_yen:140,timing:'MONTH_END'},
   {id:'repair',offset_months:3,kind:'EXPENSE',amount_yen:170,timing:'MONTH_START'}
  ]};
 const result=simulatePersonalMultiAsset({
   portfolio,monthly_market_returns:path(ids,12),plan
 });
 assert.equal(result.two_phase_enabled,true);
 assert.equal(result.rows.length,12);
 let paid=0,income=0,gains=0;
 for(let i=0;i<result.rows.length;i++){
  const row=result.rows[i],b=row.cashflow_breakdown;
  assert.equal(b.salary_month_start_yen+b.salary_month_end_yen,b.salary_yen);
  assert.equal(b.pension_month_start_yen+b.pension_month_end_yen,b.pension_yen);
  assert.equal(b.start_contribution_yen+b.end_contribution_yen,b.total_income_yen);
  assert.equal(row.phases.MONTH_START.contribution_yen,b.start_contribution_yen);
  assert.equal(row.phases.MONTH_END.contribution_yen,b.end_contribution_yen);
  assert.equal(row.paid_withdrawal_yen+row.unfunded_yen,row.requested_withdrawal_yen);
  assert.equal(row.closing_yen,
   Object.values(row.holdings).reduce((a,x)=>a+x.closing_yen,0));
  assert.equal(row.paid_withdrawal_yen,
   Object.values(row.holdings).reduce((a,x)=>a+x.withdrawal_yen,0));
  income+=row.contribution_yen;paid+=row.paid_withdrawal_yen;gains+=row.investment_gain_yen;
 }
 assert.equal(result.ending_assets_yen,125*size+income+gains-paid);
 assert.equal(result.expected_deposits_yen,income);
 assert.equal(result.actually_paid_expenses_yen,paid);
 checked++;
}
assert.equal(checked,180);
const rolling=rollingPersonalMultiAsset({
 monthly_market_returns:path(['CASH_JPY'],13),portfolio:p(['CASH_JPY'],100,'PRO_RATA','MONTH_START'),
 plan:{salary_schedules:[salary('MONTH_END',100,0,12)]},horizon_months:12
});
assert.equal(rolling.complete_windows,2);
assert(rolling.windows.every(x=>x.two_phase_enabled===true));
console.log('PASS ANALYTICS_RECURRING_INCOME_V06: 180 1..12 asset phase cases, DWZ age-income cutoff parity, explicit unsupported escalation rejection, no retroactive salary funding and zero-lifecycle legacy parity');
