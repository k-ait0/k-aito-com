#!/usr/bin/env node
'use strict';
// No market histories: synthetic month-end normalized CPI v0.7 acceptance.
// Source is the pinned DWZ research simulateOne fixture (not current production).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {migrateDWZAgeIncomeStreams,simulatePersonalMultiAsset,cashflowsForPlan}=require('../lib/analytics/personal-multiasset-bridge.cjs');
const {monthSerial,formatMonth}=require('../lib/analytics/cashflow-core.cjs');
const month=i=>formatMonth(monthSerial('2000-01')+i);
const market=(months,rate=0)=>Array.from({length:months},(_,i)=>({month:month(i+1),
 origin:'SYNTHETIC',asset_returns:{RISK:i===0?rate:0}}));
const cpi=(months,endIndex=110)=>Array.from({length:months+1},(_,i)=>({
 month:month(i),origin:'SYNTHETIC',value:i?endIndex:100
}));
const names=[{
 id:'wage',startAgeMonths:480,endAgeMonths:481,monthlyAmount:100,
 timing:'BEGINNING_OF_MONTH',escalationModel:{type:'CPI_LINKED'}
}];
const pensions=[{
 id:'public',startAgeMonths:480,endAgeMonths:481,monthlyAmount:40,
 timing:'END_OF_MONTH',escalationModel:{type:'CPI_LINKED'}
}];
const opts={simulationStartAgeMonths:480,horizon_months:1};
assert.throws(()=>migrateDWZAgeIncomeStreams(names,{...opts,kind:'salary'}),/requires explicit/);
const wage=migrateDWZAgeIncomeStreams(names,{...opts,kind:'salary',
 cpi_index_contract:'CURRENT_PERIOD_END_OVER_PRE_PERIOD_CPI'});
const pension=migrateDWZAgeIncomeStreams(pensions,{...opts,kind:'pension',
 cpi_index_contract:'CURRENT_PERIOD_END_OVER_PRE_PERIOD_CPI'});
assert.equal(wage.schedules[0].escalation_model,'DWZ_CPI_INDEX');
assert.equal(pension.schedules[0].escalation_model,'DWZ_CPI_INDEX');
assert.equal(wage.schedules[0].timing,'MONTH_START');
assert.equal(pension.schedules[0].timing,'MONTH_END');
const plan={monthly_expense_yen:10,salary_schedules:wage.schedules,
 pension_schedules:pension.schedules,one_time_events:[{
 id:'endExpense',offset_months:0,kind:'EXPENSE',amount_yen:20,timing:'MONTH_END'
}]};
const portfolio={initial_holdings_yen:{RISK:1000},target_weights:{RISK:1},
 withdrawal_timing:'MONTH_START',rebalance:{mode:'NONE'}};
const result=simulatePersonalMultiAsset({monthly_market_returns:market(1,.1),portfolio,
 plan,cpi_levels:cpi(1)});
assert.equal(result.ending_assets_yen,1234);
assert.equal(result.rows[0].cashflow_breakdown.salary_month_start_yen,110);
assert.equal(result.rows[0].cashflow_breakdown.pension_month_end_yen,44);
assert.equal(result.rows[0].cashflow_breakdown.dwz_income_cpi_multiplier,1.1);
assert.equal(result.rows[0].cashflow_breakdown.dwz_income_cpi_reference_month,'2000-02');
assert.equal(result.rows[0].investment_gain_yen,110);
assert.equal(result.scheduled_expenses_yen,30);
assert.equal(result.expected_deposits_yen,154);
assert.equal(result.rows[0].phases.MONTH_START.contribution_yen,110);
assert.equal(result.rows[0].phases.MONTH_END.contribution_yen,44);
// Frozen DWZ fixture uses identical CPI index at both phases of a period.
const ctx=vm.createContext({Math,Array,Object,Number,Error});
const fixed=fs.readFileSync('research/analytics/fixtures/dwz_simulateOne_r4_v16_9_research_fixture.js','utf8');
new vm.Script([
 "const validation_js_1={validateInputs(){return true;}};",
 "const exports={ENGINE_VERSION:'audit-v07'};",
 "const clone=(x)=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k,{...v}]));",
 fixed,"globalThis.simulateDWZ=simulateOne;"
].join('\n')).runInContext(ctx);
const flat=(timing,amount)=>({timing,startAgeMonths:480,endAgeMonths:481,
 monthlyAmount:amount,escalationModel:{type:'NONE'}});
const legacy={id:'research-only',schemaVersion:'audit',portfolio:{
 holdings:{RISK:{marketValue:1000,costBasis:1000}}},person:{simulationStartAgeMonths:480},
 lifeEvents:[],incomeStreams:names,pensionStreams:pensions,
 expenseStreams:[flat('BEGINNING_OF_MONTH',10),flat('END_OF_MONTH',20)],
 target:{valueBasis:'NOMINAL',targetAssets:0}};
const dwz=ctx.simulateDWZ(legacy,{months:['2000-02'],cpiIndex:[1.1],
 returns:{RISK:[.1]},datasetVersion:'synthetic-index'});
assert.equal(dwz.summary.finalAssets,result.ending_assets_yen);
assert.equal(dwz.summary.totalInvestmentReturn,result.market_investment_gain_yen);
assert.equal(dwz.summary.totalIncome,110);
assert.equal(dwz.summary.totalPension,44);
const fullPlan={salary_schedules:[{id:'wage',start_offset:0,end_offset_exclusive:12,
 monthly_yen:100,timing:'MONTH_START',escalation_model:'DWZ_CPI_INDEX'}]};
const costs=cpi(12,120),flows=cashflowsForPlan(fullPlan,12,'2000-01',costs);
assert.equal(flows.breakdown[0].salary_month_start_yen,120);
assert.equal(flows.breakdown[11].salary_month_start_yen,120);
// Explicit source and continuity validation.
assert.throws(()=>simulatePersonalMultiAsset({portfolio,monthly_market_returns:market(1),
 plan,cpi_levels:undefined}),/origin|CPI/i);
assert.throws(()=>simulatePersonalMultiAsset({portfolio,monthly_market_returns:market(1),
 plan,cpi_levels:cpi(1).map(x=>({...x,origin:'OBSERVED'}))}),/CPI origin/);
assert.throws(()=>simulatePersonalMultiAsset({portfolio,monthly_market_returns:market(1),
 plan,cpi_levels:[cpi(1)[0],{...cpi(1)[1],month:'2000-04'}]}),/calendar/);
assert.throws(()=>cashflowsForPlan({salary_schedules:[{
 id:'wage',start_offset:0,end_offset_exclusive:12,monthly_yen:100,
 escalation_model:'CPI_LINKED'
}]},12,'2000-01',costs),/escalation_model/);
assert.throws(()=>migrateDWZAgeIncomeStreams([{...names[0],
 escalationModel:{type:'CUSTOM_PATH'}}],{...opts,kind:'salary',
 cpi_index_contract:'CURRENT_PERIOD_END_OVER_PRE_PERIOD_CPI'}),/requires an explicit transformation/);
assert.throws(()=>migrateDWZAgeIncomeStreams(names,{...opts,kind:'salary',
 cpi_index_contract:'PERIOD_START'}),/requires explicit/);
// Controlled cross product of 1, 2, 4, 8, 12 asset portfolios, both phases,
// 12 months of income, exact gross/net and integer capital conservation.
let checks=0;
for(const count of [1,2,4,8,12])
for(const salaryPhase of ['MONTH_START','MONTH_END'])
for(const pensionPhase of ['MONTH_START','MONTH_END'])
for(const inflation of [0,.05,.2])
for(const income of [0,80,1000]){
 const ids=Array.from({length:count},(_,i)=>'ASSET'+i);
 const portfolio={initial_holdings_yen:Object.fromEntries(ids.map(id=>[id,1200])),
 target_weights:Object.fromEntries(ids.map(id=>[id,1/count])),
 withdrawal_timing:'MONTH_START',rebalance:{mode:'NONE'}};
 const series=Array.from({length:12},(_,i)=>({month:month(i+1),origin:'SYNTHETIC',
  asset_returns:Object.fromEntries(ids.map(id=>[id,0]))}));
 const levels=Array.from({length:13},(_,i)=>({month:month(i),origin:'SYNTHETIC',
  value:100*(1+inflation*i/12)}));
 const plan={monthly_expense_yen:150,
  salary_schedules:[{id:'salary',start_offset:0,end_offset_exclusive:12,monthly_yen:income,
   timing:salaryPhase,escalation_model:'DWZ_CPI_INDEX'}],
  pension_schedules:[{id:'pension',start_offset:2,end_offset_exclusive:12,monthly_yen:income,
   timing:pensionPhase,escalation_model:'DWZ_CPI_INDEX'}]};
 const r=simulatePersonalMultiAsset({portfolio,monthly_market_returns:series,plan,
  cpi_levels:levels});
 const funded=r.rows.reduce((a,x)=>a+x.paid_withdrawal_yen,0);
 const deposits=r.rows.reduce((a,x)=>a+x.contribution_yen,0);
 assert.equal(r.ending_assets_yen,count*1200+deposits-funded);
 assert.equal(r.expected_deposits_yen,deposits);
 assert.equal(r.net_cashflow_total_yen,r.expected_deposits_yen-r.scheduled_expenses_yen);
 assert.equal(r.realized_net_cashflow_total_yen,deposits-funded);
 assert(r.rows.every(x=>{
  const b=x.cashflow_breakdown;
  return b.salary_month_start_yen+b.salary_month_end_yen===b.salary_yen &&
    b.pension_month_start_yen+b.pension_month_end_yen===b.pension_yen;
 }));
 checks++;
}
assert.equal(checks,180);
console.log('PASS ANALYTICS_DWZ_CPI_INCOME_V07: 180 synthetic CPI-linked salary/pension scenarios, frozen 1-asset DWZ parity, explicit source and normalization failures');
