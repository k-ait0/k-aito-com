#!/usr/bin/env node
'use strict';
// Cross-engine research QA. Exact matched-conditions parity is asserted only where valid.
// A monthly CORE row labels the month of RETURN, Personal v0.5 labels the boundary.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {simulatePersonalMultiAsset,rollingPersonalMultiAsset,cashflowsForPlan,validatePlan}
  =require('../lib/analytics/personal-multiasset-bridge.cjs');
const {simulatePortfolio}=require('../lib/analytics/portfolio-core.cjs');
const {monthSerial,formatMonth}=require('../lib/analytics/cashflow-core.cjs');
const html=fs.readFileSync('research/analytics/personal-lab/index.html','utf8');
const source=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert(source);
const first=source.indexOf('const $='),last=source.indexOf('function setOptions(){');
const cx=vm.createContext({Map,Set,Math,Number,String,Array,Intl,Date,document:{getElementById:()=>({})}});
new vm.Script(source.slice(first,last)+'\n globalThis.api={simulateTwoAsset,addMonths};').runInContext(cx);
const personal=cx.api;
const path=[];
for(let i=0;i<120;i++)path.push({month:formatMonth(monthSerial('2000-01')+i),origin:'SYNTHETIC',
 asset_returns:{JPY_CASH:0,USD_REFERENCE:0}});
const cpi=Array.from({length:121},(_,i)=>({month:formatMonth(monthSerial('1999-12')+i),
 value:100,origin:'SYNTHETIC'}));
const p={initial_holdings_yen:{JPY_CASH:50000,USD_REFERENCE:50000},
 target_weights:{JPY_CASH:0.5,USD_REFERENCE:0.5},rebalance:{mode:'NONE'}};
const plan={monthly_contribution_yen:1000,monthly_expense_yen:500,expense_mode:'NOMINAL_FIXED',
 salary_schedules:[{id:'salary',start_offset:0,end_offset_exclusive:6,monthly_yen:2000}],
 pension_schedules:[{id:'pension',start_offset:6,end_offset_exclusive:12,monthly_yen:400}],
 one_time_events:[{id:'gift',offset_months:2,kind:'INCOME',amount_yen:1000},
  {id:'repair',offset_months:3,kind:'EXPENSE',amount_yen:200}]};
const one=simulatePersonalMultiAsset({monthly_market_returns:path.slice(0,12),portfolio:p,plan});
const expected=100000+12000+6*2000+6*400+1000-12*500-200;
assert.equal(one.ending_assets_yen,expected);
assert.equal(one.expected_deposits_yen,27400);
assert.equal(one.scheduled_expenses_yen,6200);
assert.equal(one.market_investment_gain_yen,0);
assert.equal(one.rows.length,12);
assert.equal(one.period_start_month,'1999-12');
assert.equal(one.rows[0].month,'2000-01');
assert.equal(one.rows[0].cashflow_breakdown.salary_yen,2000);
assert.equal(one.rows[6].cashflow_breakdown.pension_yen,400);
assert.equal(one.rows[6].cashflow_breakdown.salary_yen,0);
const oldRows=Array.from({length:13},(_,i)=>({month:formatMonth(monthSerial('1999-12')+i),
 fx:100,cpi:100,gold:100}));
const old=personal.simulateTwoAsset(oldRows,0,1,100000,500,'usd',false,'BEGINNING_OF_MONTH',{
 cashPercent:50,sellOrder:'PRO_RATA',rebalance:'NONE',monthlyContribution:1000,
 lifecycle:{salary:{monthly:2000,start:0,end:6},pension:{monthly:400,start:6,end:12},
 events:[{id:'gift',at:2,kind:'INCOME',amount:1000},{id:'repair',at:3,kind:'EXPENSE',amount:200}]}
});
assert.equal(old.remaining,one.ending_assets_yen,'Equal integer stable two-sleeve final value');
assert.equal(old.total,one.actually_paid_expenses_yen,'gross payments for matched phase');
assert.equal(old.totalContributed,12000);
assert.equal(old.totalSalaryIncome,12000);
assert.equal(old.totalPensionIncome,2400);
assert.equal(old.totalEventExpensePaid,200);
assert.equal(one.rows.reduce((a,r)=>a+r.contribution_yen,0),27400);
// Deliberately different contracts must NOT be advertised as interchangeable:
const growthRows=Array.from({length:13},(_,i)=>({month:formatMonth(monthSerial('2000-01')+i),
 fx:100*Math.pow(1.011,i),cpi:100,gold:100}));
const personalStart=personal.simulateTwoAsset(growthRows,0,1,101,5,'usd',false,'BEGINNING_OF_MONTH',
 {cashPercent:0,sellOrder:'PRO_RATA',rebalance:'NONE',monthlyContribution:0});
const personalEnd=personal.simulateTwoAsset(growthRows,0,1,101,5,'usd',false,'END_OF_MONTH',
 {cashPercent:0,sellOrder:'PRO_RATA',rebalance:'NONE',monthlyContribution:0});
assert(Math.abs(personalStart.remaining-personalEnd.remaining)>1e-6,
 'With positive monthly return, BEGIN and END withdrawals must produce different values');
const marketRounded=Array.from({length:12},(_,i)=>({month:formatMonth(monthSerial('2000-02')+i),
 origin:'SYNTHETIC',asset_returns:{RISK:0.011}}));
const coreRounded=simulatePersonalMultiAsset({monthly_market_returns:marketRounded,
 portfolio:{initial_holdings_yen:{RISK:101},target_weights:{RISK:1},rebalance:{mode:'NONE'}},
 plan:{monthly_expense_yen:5}});
assert(Math.abs(coreRounded.ending_assets_yen-personalStart.remaining)>1e-6,
 'Integer Core rounding must remain distinct from prior floating-yen Personal calculations');
assert.equal(one.accounting_contract,'MONTH_START_ALL_CASHFLOWS_BEFORE_MARKET_RETURN');
assert.equal(one.rounding_contract,'INTEGER_JPY_EACH_ASSET_RETURN_AND_LARGEST_REMAINDER_FOR_ALLOCATION');
// Core is the engine for all 1..12 assets; separate one-asset and 12-asset checks.
for(const count of [1,2,3,5,8,12]){
 const ids=Array.from({length:count},(_,i)=>'A'+String(i+1));
 const holdings=Object.fromEntries(ids.map(id=>[id,1_000_000]));
 const weights=Object.fromEntries(ids.map(id=>[id,1/count]));
 const rows=Array.from({length:240},(_,i)=>({month:formatMonth(monthSerial('1980-01')+i),
  origin:'SYNTHETIC',
  asset_returns:Object.fromEntries(ids.map((id,j)=>[id,(j%2===0?.01:-.006)]))}));
 const result=simulatePersonalMultiAsset({monthly_market_returns:rows,
  portfolio:{initial_holdings_yen:holdings,target_weights:weights,
   rebalance:{mode:'PERIODIC',interval_months:12}},
  plan:{monthly_contribution_yen:40000,monthly_expense_yen:10000,
   salary_schedules:[{id:'wage',start_offset:0,end_offset_exclusive:120,monthly_yen:10000}],
   pension_schedules:[{id:'publicpension',start_offset:120,end_offset_exclusive:240,monthly_yen:15000}],
   one_time_events:[{id:'renovation',offset_months:72,kind:'EXPENSE',amount_yen:2000000}]}});
 assert.equal(result.assets.length,count);
 assert.equal(result.rows.length,240);
 assert.equal(result.expected_deposits_yen,240*40000+120*10000+120*15000);
 assert.equal(result.scheduled_expenses_yen,240*10000+2000000);
 assert.equal(result.ending_assets_yen,Object.values(result.ending_holdings_yen).reduce((a,b)=>a+b,0));
 assert.equal(result.source_rights_approved,false);
 assert.equal(result.personal_only,true);
}
// CPI historical input: start previous December; no forward CPI leakage in phase.
const two=simulatePersonalMultiAsset({monthly_market_returns:path.slice(0,12),portfolio:p,
 plan:{monthly_contribution_yen:0,monthly_expense_yen:10000,expense_mode:'HISTORICAL_CPI'},
 cpi_levels:cpi.slice(0,13).map((x,i)=>({...x,value:100+i}))});
assert.equal(two.rows[0].requested_withdrawal_yen,10000);
assert.equal(two.rows[1].requested_withdrawal_yen,10100);
assert.equal(two.rows[11].requested_withdrawal_yen,11100);
assert.throws(()=>simulatePersonalMultiAsset({monthly_market_returns:path.slice(0,12),portfolio:p,
 plan:{monthly_expense_yen:10000,expense_mode:'HISTORICAL_CPI'},cpi_levels:cpi.slice(0,11)}),/horizon\+1/);
const annual=simulatePersonalMultiAsset({monthly_market_returns:path.slice(0,12),portfolio:p,
 plan:{monthly_expense_yen:12000,expense_mode:'ANNUAL_ASSUMPTION',annual_expense_inflation:.12}});
assert.equal(annual.rows[0].requested_withdrawal_yen,12000);
assert.equal(annual.rows[1].requested_withdrawal_yen,Math.round(12000*1.12**(1/12)));
assert.equal(annual.rows[11].requested_withdrawal_yen,Math.round(12000*1.12**(11/12)));
// Baseline 1 asset must exactly equal canonical simulation of monthly scheduled flows.
const singlePath=path.slice(0,12).map(x=>({...x,asset_returns:{JPY_CASH:0}}));
const oneAsset={initial_holdings_yen:{JPY_CASH:100000},
 target_weights:{JPY_CASH:1},rebalance:{mode:'NONE'}};
const br=cashflowsForPlan(plan,12,'1999-12');
const raw=simulatePortfolio({...oneAsset,monthly_returns:singlePath,
 monthly_cashflows:br.monthly_cashflows,market_mode:'SYNTHETIC_DEMO'});
const wrapped=simulatePersonalMultiAsset({portfolio:oneAsset,plan,monthly_market_returns:singlePath});
assert.equal(wrapped.ending_assets_yen,raw.ending_assets_yen);
assert.equal(wrapped.total_unfunded_yen,raw.total_unfunded_yen);
assert.deepEqual(wrapped.rows.map(x=>x.closing_yen),raw.rows.map(x=>x.closing_yen));
// 5-year rolling and gap handling.
const rpath=path.slice(0,65).map((x,i)=>({...x,month:formatMonth(monthSerial('2001-01')+i)}));
const roll=rollingPersonalMultiAsset({monthly_market_returns:rpath,horizon_months:60,
 portfolio:p,plan:{monthly_expense_yen:1000}});
assert.equal(roll.complete_windows,6);
const gap=rpath.map(x=>({...x}));gap[30].month='2010-01';
const gaps=rollingPersonalMultiAsset({monthly_market_returns:gap,horizon_months:60,
 portfolio:p,plan:{monthly_expense_yen:1000}});
assert.equal(gaps.complete_windows,0);
assert.equal(gaps.excluded_windows_due_to_gap_or_cpi,6);
for(const [bad,regexp] of [
 [{...plan,unknown:'unused'},/Unknown/],
 [{...plan,salary_schedules:[{id:'bad',start_offset:2,end_offset_exclusive:1,monthly_yen:10}]},/offset/],
 [{...plan,one_time_events:[{id:'repair',offset_months:0,kind:'INCOME',amount_yen:1},{id:'repair',offset_months:1,kind:'EXPENSE',amount_yen:1}]},/duplicate/],
 [{...plan,monthly_expense_yen:1.5},/integer yen/],
 [{...plan,expense_mode:'HISTORICAL_CPI',annual_expense_inflation:.03},/Inflation rate/]
 ]) assert.throws(()=>validatePlan(bad,12),regexp);
assert.throws(()=>simulatePersonalMultiAsset({monthly_market_returns:singlePath.map((x,i)=>i===3?{...x,origin:'OBSERVED'}:x),
 portfolio:oneAsset,plan}),/provenance|origin/i);
console.log('PASS 1..12-asset integer-yen Personal Core bridge: 6 portfolio sizes, salary pension events, independent CPI/annual inflation, 60-month rolling gaps, exact 2-asset flat-timing parity and canonical 1-asset ledger');
