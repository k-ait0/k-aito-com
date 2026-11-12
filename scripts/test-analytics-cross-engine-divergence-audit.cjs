#!/usr/bin/env node
'use strict';
/**
 * K. Aito Analytics cross-engine discrepancy audit.
 * All examples synthetic, exactly reproducible. A PASS proves that
 * the systems are NOT interchangeable unless the timing and
 * accounting contracts are matched.
 */
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const {simulatePortfolio}=require('../lib/analytics/portfolio-core.cjs');
const {simulateMonthlyCashflow}=require('../lib/analytics/cashflow-core.cjs');
const {cashflowsForPlan,simulatePersonalMultiAsset,rollingPersonalMultiAsset}=require('../lib/analytics/personal-multiasset-bridge.cjs');
const {buildRelativeMonthlyCashflows}=require('../lib/analytics/rolling-portfolio-lifecycle.cjs');
const {monthSerial,formatMonth}=require('../lib/analytics/cashflow-core.cjs');
const html=fs.readFileSync('research/analytics/personal-lab/index.html','utf8');
const js=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert(js);
const start=js.indexOf('const $='),end=js.indexOf('function setOptions(){');
const oldCx=vm.createContext({Intl,Map,Set,Math,Number,Date,String,Array,
 document:{getElementById:()=>({})}});
new vm.Script(js.slice(start,end)+'\n globalThis.old={simulateTwoAsset,simulateWithdrawal,addMonths};').runInContext(oldCx);
const old=oldCx.old;
const fixture=fs.readFileSync('research/analytics/fixtures/dwz_simulateOne_r4_v16_9_research_fixture.js','utf8');
const dwzCx=vm.createContext({Math,Object,Array,Number,Error});
new vm.Script([
"const validation_js_1={validateInputs(){return true;}};",
"const exports={ENGINE_VERSION:'audit-fixture'};",
"const clone=(h)=>Object.fromEntries(Object.entries(h).map(([k,v])=>[k,{...v}]));",
fixture,"globalThis.simulate=simulateOne;"
].join('\n')).runInContext(dwzCx);
const say=(id,details)=>console.log('AUDIT_'+id+' '+JSON.stringify(details));
const close=(a,b,what)=>assert(Math.abs(a-b)<1e-7,what+' '+a+' vs '+b);
const level=(assetGrowthByMonth=()=>1,cpiByMonth=()=>100)=>{
 let price=100;
 return Array.from({length:13},(_,i)=>{
  if(i)price*=assetGrowthByMonth(i);
  return {month:old.addMonths('2000-01',i),fx:price,cpi:cpiByMonth(i),gold:null};
 });
};
// #1: SELL ORDER changes next month risk exposure.
{
 const data=level(i=>i===1?1.1:1);
 const x=old.simulateTwoAsset(data,0,1,200,100,'usd',false,'BEGINNING_OF_MONTH',
   {cashPercent:50,sellOrder:'CASH_FIRST',rebalance:'NONE',monthlyContribution:0});
 const y=old.simulateTwoAsset(data,0,1,200,100,'usd',false,'BEGINNING_OF_MONTH',
   {cashPercent:50,sellOrder:'PRO_RATA',rebalance:'NONE',monthlyContribution:0});
 close(x.rows[1].investment_return,10,'cash-first risk exposure gains');
 close(y.rows[1].investment_return,5,'pro-rata risk exposure gains');
 // Old Personal v0.5 attaches the NEXT month-start withdrawal to the same
 // end-boundary row; these row closing balances are not comparable to Core's
 // one-period end states without subtracting that next withdrawal.
 close(x.rows[1].value,10,'old next-month-start cash-first ledger balance');
 close(y.rows[1].value,5,'old next-month-start pro-rata ledger balance');
 const portfolio=simulatePortfolio({
  initial_holdings_yen:{CASH:100,RISK:100},target_weights:{CASH:.5,RISK:.5},
  monthly_returns:[{month:'2000-02',origin:'SYNTHETIC',asset_returns:{CASH:0,RISK:.1}}],
  monthly_withdrawal_yen:100,market_mode:'SYNTHETIC_DEMO',rebalance:{mode:'NONE'}});
 close(portfolio.rows[0].closing_yen,105,'canonical pro rata first month');
 say('SELL_ORDER',{old_first_month_gain_cash_first:10,old_first_month_gain_pro_rata:5,
 old_next_boundary_cash_first:10,old_next_boundary_pro_rata:5,core_end_first_period:105});
}
// #2: DWZ nets gross streams within one timing phase. Same end value but
// cashflow ledger and future tax/cost-basis are not equivalent.
{
 const s={id:'synthetic-netting',schemaVersion:'audit',
  portfolio:{holdings:{A:{marketValue:100,costBasis:100}}},
  person:{simulationStartAgeMonths:480},lifeEvents:[],
  expenseStreams:[{timing:'BEGINNING_OF_MONTH',startAgeMonths:480,endAgeMonths:481,
    monthlyAmount:60,escalationModel:{type:'NONE'}}],
  incomeStreams:[{timing:'BEGINNING_OF_MONTH',startAgeMonths:480,endAgeMonths:481,
    monthlyAmount:60,escalationModel:{type:'NONE'}}],pensionStreams:[],
  target:{valueBasis:'NOMINAL',targetAssets:0}};
 const d=dwzCx.simulate(s,{months:['2000-02'],cpiIndex:[1],
  returns:{A:[0]},datasetVersion:'synthetic'});
 const c=simulatePortfolio({
  initial_holdings_yen:{A:100},target_weights:{A:1},
  monthly_returns:[{month:'2000-02',origin:'SYNTHETIC',asset_returns:{A:0}}],
  monthly_contribution_yen:60,monthly_withdrawal_yen:60,market_mode:'SYNTHETIC_DEMO',
  rebalance:{mode:'NONE'}});
 assert.equal(d.summary.totalContributions,0);
 assert.equal(d.summary.totalWithdrawals,0);
 assert.equal(d.summary.totalExpenses,60);
 assert.equal(d.summary.totalIncome,60);
 assert.equal(c.rows[0].contribution_yen,60);
 assert.equal(c.rows[0].paid_withdrawal_yen,60);
 assert.equal(d.summary.finalAssets,c.ending_assets_yen);
 say('GROSS_VS_NET_CASHFLOW',{dwz_deposit:0,dwz_paid:0,
  core_deposit:60,core_paid:60,closing:100});
}
// #3: Legacy lifecycle pension ENDS INCLUSIVE; new bridge EXCLUSIVE.
{
 const oldPlan=buildRelativeMonthlyCashflows({
  monthly_contribution_yen:0,monthly_withdrawal_yen:0,
  relative_pension_schedule:[{id:'pension',start_offset_months:0,end_offset_months:12,monthly_yen:100}]
 },24);
 const newPlan=cashflowsForPlan({
  monthly_expense_yen:0,
  pension_schedules:[{id:'pension',start_offset:0,end_offset_exclusive:12,monthly_yen:100}]
 },24,'2000-01');
 assert.equal(oldPlan[12].breakdown.pension_yen,100);
 assert.equal(newPlan.breakdown[12].pension_yen,0);
 assert.equal(oldPlan.reduce((x,y)=>x+y.breakdown.pension_yen,0),1300);
 assert.equal(newPlan.breakdown.reduce((x,y)=>x+y.pension_yen,0),1200);
 say('PENSION_END',{legacy_total_yen:1300,new_total_yen:1200});
}
// #4: Old END_OF_MONTH CPI uses month END's CPI, while the Core
// start-of-period spending for the same market interval uses month START.
{
 const values=level(()=>1,i=>i===0?100:110);
 const oldEnd=old.simulateTwoAsset(values,0,1,20000,1000,'usd',true,'END_OF_MONTH',
  {cashPercent:100,sellOrder:'CASH_FIRST',rebalance:'NONE',monthlyContribution:0});
 const newer=cashflowsForPlan({monthly_expense_yen:1000,expense_mode:'HISTORICAL_CPI'},
  12,'2000-01',values.map(x=>({month:x.month,value:x.cpi,origin:'SYNTHETIC'})));
 assert.equal(oldEnd.rows[1].due,1100);
 assert.equal(newer.breakdown[0].living_expense_yen,1000);
 assert.equal(newer.breakdown[0].month,'2000-02');
 say('CPI_REFERENCE_MONTH',{old_end_first_due:1100,new_core_first_due:1000,
  new_core_cashflow_month:'2000-02'});
}
// #5: Per-asset INTEGER_YEN rounding vs float retained internally.
{
 const all=level(i=>i===1?1.01:1);
 const floating=old.simulateTwoAsset(all,0,1,101,0,'usd',false,'BEGINNING_OF_MONTH',
  {cashPercent:0,sellOrder:'PRO_RATA',rebalance:'NONE',monthlyContribution:0});
 const rounded=simulatePortfolio({initial_holdings_yen:{RISK:101},target_weights:{RISK:1},
  monthly_returns:[{month:'2000-02',origin:'SYNTHETIC',asset_returns:{RISK:.01}}],
  monthly_withdrawal_yen:0,market_mode:'SYNTHETIC_DEMO',rebalance:{mode:'NONE'}});
 close(floating.remaining,102.01,'prior float 102.01');
 assert.equal(rounded.ending_assets_yen,102);
 say('ROUNDING',{old_float:102.01,new_core_integer:102});
}
// #6: Legacy 2 sleeve gives one-time expense funding priority, the new
// Core aggregates planned expense. Gross paid equal but event paid UNKNOWN.
{
 const oldPath=level(()=>1);
 const legacy=old.simulateTwoAsset(oldPath,0,1,100,1000,'usd',false,'BEGINNING_OF_MONTH',
  {cashPercent:100,sellOrder:'CASH_FIRST',rebalance:'NONE',monthlyContribution:0,
   lifecycle:{events:[{id:'repair',at:0,kind:'EXPENSE',amount:100}]}});
 const newCore=simulatePersonalMultiAsset({
  monthly_market_returns:[{month:'2000-02',origin:'SYNTHETIC',asset_returns:{CASH:0}}],
  portfolio:{initial_holdings_yen:{CASH:100},target_weights:{CASH:1},rebalance:{mode:'NONE'}},
  plan:{monthly_expense_yen:1000,one_time_events:[{id:'repair',offset_months:0,kind:'EXPENSE',amount_yen:100}]}
 });
 assert.equal(legacy.totalEventExpensePaid,100);
 assert.equal(legacy.totalEventExpenseShortfall,0);
 assert.equal(legacy.rows[0].withdrawn,100);
 assert.equal(newCore.rows[0].cashflow_breakdown.one_time_expense_yen,100);
 assert.equal(newCore.rows[0].paid_withdrawal_yen,100);
 assert.equal(newCore.rows[0].unfunded_yen,1000);
 assert.equal(newCore.rows[0].cashflow_breakdown.living_expense_yen,1000);
 assert(!Object.prototype.hasOwnProperty.call(newCore.rows[0],'event_expense_paid_yen'));
 say('EVENT_PAYMENT_PRIORITY',{old_event_paid:100,core_event_due:100,
  core_spending_paid_total:100,core_unpaid_total:1000,core_event_payment_split:'NOT_TRACKED'});
}
// #7: -100% monthly return supported in Core, impossible with prior strictly
// positive price-level ratios.
{
 const p=simulatePortfolio({initial_holdings_yen:{RISK:100},
  target_weights:{RISK:1},monthly_returns:[{month:'2000-02',origin:'SYNTHETIC',asset_returns:{RISK:-1}}],
  market_mode:'SYNTHETIC_DEMO',rebalance:{mode:'NONE'}});
 assert.equal(p.ending_assets_yen,0);
 const bad=level(i=>i===1?0:1);
 assert.throws(()=>old.simulateTwoAsset(bad,0,1,100,0,'usd',false,'BEGINNING_OF_MONTH',
  {cashPercent:0,sellOrder:'RISK_FIRST',rebalance:'NONE',monthlyContribution:0}),/価格比/);
 say('TOTAL_LOSS',{core_ending:0,old_class:'REJECTS_ZERO_PRICE_LEVEL'});
}
// #8: At the terminal month the old Personal model skips rebalancing, Core
// performs scheduled month-end rebalance; final holdings and trade turnover differ.
{
 const levels=level(i=>i===12?2:1);
 const prev=old.simulateTwoAsset(levels,0,1,100,0,'usd',false,'BEGINNING_OF_MONTH',
   {cashPercent:50,sellOrder:'PRO_RATA',rebalance:'MONTHLY',monthlyContribution:0});
 const returns=Array.from({length:12},(_,i)=>({month:formatMonth(monthSerial('2000-02')+i),
  origin:'SYNTHETIC',asset_returns:{CASH:0,RISK:i===11?1:0}}));
 const next=simulatePortfolio({initial_holdings_yen:{CASH:50,RISK:50},
  target_weights:{CASH:.5,RISK:.5},monthly_returns:returns,
  market_mode:'SYNTHETIC_DEMO',rebalance:{mode:'PERIODIC',interval_months:1}});
 assert.equal(prev.remaining,150);
 assert.equal(next.ending_assets_yen,150);
 close(prev.cash,50,'old terminal cash');
 close(prev.risk,100,'old terminal risk');
 assert.equal(next.ending_holdings_yen.CASH,75);
 assert.equal(next.ending_holdings_yen.RISK,75);
 assert.equal(next.rows.at(-1).rebalance_executed,true);
 say('FINAL_REBALANCE',{old_cash:50,old_risk:100,new_cash:75,new_risk:75});
}
// #9: Explicit scope: Core schedules always start-of-month and never carry
// historical tax basis or full DWZ two-phase streams.
{
 const x=simulatePortfolio({initial_holdings_yen:{RISK:500},target_weights:{RISK:1},
  monthly_returns:[{month:'2000-02',origin:'SYNTHETIC',asset_returns:{RISK:0}}],
  market_mode:'SYNTHETIC_DEMO',rebalance:{mode:'NONE'}});
 assert.equal(x.timing,'MONTH_START_CONTRIBUTION_THEN_PROPORTIONAL_WITHDRAWAL_THEN_RETURNS_THEN_REBALANCE');
 assert.equal(x.provenance_verified,false);
 assert.equal(x.publication_approved,false);
 assert(!Object.prototype.hasOwnProperty.call(x.rows[0].holdings.RISK,'costBasis'));
 say('SCOPE_GATES',{core_tax_lots:false,core_two_phase_end_of_month:false,
  official_market_source_verified:false});
}
// #10: Rounding is non-associative: splitting the same asset exposure
// into multiple sleeves can change the total by one yen on tiny balances.
{
 const single=simulatePortfolio({
  initial_holdings_yen:{A:2},target_weights:{A:1},
  monthly_returns:[{month:'2000-02',origin:'SYNTHETIC',asset_returns:{A:.4}}],
  market_mode:'SYNTHETIC_DEMO',rebalance:{mode:'NONE'}});
 const split=simulatePortfolio({
  initial_holdings_yen:{A:1,B:1},target_weights:{A:.5,B:.5},
  monthly_returns:[{month:'2000-02',origin:'SYNTHETIC',asset_returns:{A:.4,B:.4}}],
  market_mode:'SYNTHETIC_DEMO',rebalance:{mode:'NONE'}});
 assert.equal(single.ending_assets_yen,3);
 assert.equal(split.ending_assets_yen,2);
 say('SLEEVE_ROUNDING_NON_ASSOCIATIVITY',{one_sleeve:3,two_sleeves:2});
}
// #11: Events outside the chosen horizon are ignored by old Personal but
// rejected by the new bridge. It matters when switching 10/20/30 years.
{
 const previous=old.simulateTwoAsset(level(()=>1),0,1,500,0,'usd',false,'BEGINNING_OF_MONTH',
 {cashPercent:100,sellOrder:'CASH_FIRST',rebalance:'NONE',monthlyContribution:0,
  lifecycle:{events:[{id:'retirementGift',at:180,kind:'INCOME',amount:2000}]}});
 assert.equal(previous.remaining,500);
 const future=simulatePersonalMultiAsset({
  monthly_market_returns:[{month:'2000-02',origin:'SYNTHETIC',asset_returns:{CASH:0}}],
  portfolio:{initial_holdings_yen:{CASH:500},target_weights:{CASH:1},rebalance:{mode:'NONE'}},
  plan:{monthly_expense_yen:0,one_time_events:[{id:'retirementGift',offset_months:180,
   kind:'INCOME',amount_yen:2000}]}});
 assert.equal(future.ending_assets_yen,500);
 assert.equal(future.skipped_events_after_horizon.length,1);
 assert.equal(future.skipped_events_after_horizon[0].id,'retirementGift');
 say('EVENT_OUTSIDE_HORIZON',{old_personal:'IGNORES_FUTURE_EVENT',
   new_bridge:'SKIPS_WITH_EXPLICIT_AUDIT_RECORD'});
}
// #12: Under exactly matched phase and integer inputs, one-asset finance
// cores CAN be reconciled; mismatch should never be claimed as universal.
{
 const core=simulatePortfolio({
  initial_holdings_yen:{A:120},target_weights:{A:1},
  monthly_returns:[{month:'2000-02',origin:'SYNTHETIC',asset_returns:{A:.1}}],
  monthly_contribution_yen:10,monthly_withdrawal_yen:5,
  market_mode:'SYNTHETIC_DEMO',rebalance:{mode:'NONE'}});
 const simple=simulateMonthlyCashflow({
  initial_assets_yen:120,monthly_contribution_yen:10,monthly_withdrawal_yen:5,
  monthly_returns:[{month:'2000-02',monthly_return:.1,origin:'SYNTHETIC'}],
  provenance:'SYNTHETIC'});
 assert.equal(core.ending_assets_yen,138);
 assert.equal(simple.ending_assets_yen,138);
 assert.equal(core.rows[0].investment_gain_yen,simple.rows[0].investment_gain_yen);
 say('MATCHED_PHASE_PARITY',{canonical_single_asset_core:138,single_cashflow_core:138});
}
console.log('PASS_CROSS_ENGINE_AUDIT: twelve synthetic discrepancy/compatibility assertions; future event behavior now reconciled and recorded');
