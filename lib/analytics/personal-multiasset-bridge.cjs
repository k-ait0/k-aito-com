'use strict';
/**
 * K. Aito Analytics | Personal 1..12-asset lifecycle bridge v0.1
 * Local/private research only. No network, no file access, no securities data.
 * One accounting contract: INTEGER_JPY_MONTH_START_INCOME_EXPENSE_THEN_RETURN.
 * The Personal Lab v0.5 END_OF_MONTH withdrawal option is NOT equivalent.
 */
const {simulatePortfolio,validateInput}=require('./portfolio-core.cjs');
const {validateMarketSeries}=require('./rolling-portfolio-lifecycle.cjs');
const {monthSerial,formatMonth}=require('./cashflow-core.cjs');
const MAX_YEN=1_000_000_000_000,MAX_HORIZON=1200;
function obj(x,name){if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid '+name);return x;}
function keys(x,allowed,name){obj(x,name);for(const k of Object.keys(x))if(!allowed.includes(k))throw Error('Unknown '+name+': '+k);}
function yen(x,name){if(!Number.isSafeInteger(x)||x<0||x>MAX_YEN)throw Error('Invalid integer yen '+name);return x;}
function add(a,b,name){if(!Number.isSafeInteger(a+b)||a+b>MAX_YEN)throw Error('Overflow '+name);return a+b;}
function interval(s,name,horizon){
 keys(s,['id','start_offset','end_offset_exclusive','monthly_yen'],name);
 if(typeof s.id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(s.id))throw Error('Invalid '+name+' id');
 const from=s.start_offset,to=s.end_offset_exclusive,amount=yen(s.monthly_yen,name+' monthly');
 if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<0||to<from||to>MAX_HORIZON)throw Error('Invalid '+name+' offsets');
 return {id:s.id,start:from,end:to,amount};
}
function validatePlan(plan,horizon){
 keys(plan,['initial_holdings_yen','target_weights','rebalance','monthly_contribution_yen','monthly_expense_yen',
  'expense_mode','annual_expense_inflation','salary_schedules','pension_schedules','one_time_events'], 'personal plan');
 if(!Number.isSafeInteger(horizon)||horizon<1||horizon>MAX_HORIZON)throw Error('Invalid horizon');
 const contribution=yen(plan.monthly_contribution_yen??0,'monthly_contribution_yen');
 const expense=yen(plan.monthly_expense_yen??0,'monthly_expense_yen');
 const mode=plan.expense_mode??'NOMINAL_FIXED';
 if(!['NOMINAL_FIXED','ANNUAL_ASSUMPTION','HISTORICAL_CPI'].includes(mode))throw Error('Unsupported expense_mode');
 const inflation=plan.annual_expense_inflation??0;
 if(typeof inflation!=='number'||!Number.isFinite(inflation)||inflation< -0.5||inflation>1)throw Error('Invalid annual inflation');
 if(mode!=='ANNUAL_ASSUMPTION'&&inflation!==0)throw Error('Inflation rate only for annual assumption mode');
 const salaries=plan.salary_schedules??[],pensions=plan.pension_schedules??[],events=plan.one_time_events??[];
 if(!Array.isArray(salaries)||salaries.length>20||!Array.isArray(pensions)||pensions.length>20||
    !Array.isArray(events)||events.length>500)throw Error('Schedule size invalid');
 const seen=new Set();
 const stream=(items,kind)=>items.map((x,i)=>{
  const s=interval(x,kind+' '+i,horizon);
  if(seen.has(s.id))throw Error('Duplicate schedule id');seen.add(s.id);
  return s;
 });
 const salary=stream(salaries,'salary'),pension=stream(pensions,'pension');
 const eventList=events.map((e,i)=>{
  keys(e,['id','offset_months','kind','amount_yen'],'event '+i);
  if(typeof e.id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(e.id)||seen.has(e.id))
   throw Error('Invalid/duplicate event id');seen.add(e.id);
  if(!Number.isSafeInteger(e.offset_months)||e.offset_months<0||e.offset_months>=horizon)
   throw Error('Event outside horizon');
  if(!['INCOME','EXPENSE'].includes(e.kind))throw Error('Invalid event kind');
  return {id:e.id,at:e.offset_months,kind:e.kind,amount:yen(e.amount_yen,'event amount')};
 });
 return {contribution,expense,mode,inflation,salary,pension,events:eventList};
}
function validateCpi(cpi,startMonth,horizon){
 if(!Array.isArray(cpi)||cpi.length!==horizon+1)throw Error('CPI requires horizon+1 consecutive levels');
 const first=monthSerial(startMonth);
 return cpi.map((x,i)=>{
  keys(x,['month','value','origin'],'CPI level');
  if(monthSerial(x.month)!==first+i)throw Error('Missing/unsorted CPI calendar month');
  if(typeof x.value!=='number'||!Number.isFinite(x.value)||x.value<=0)throw Error('Invalid CPI level');
  if(!['OBSERVED','SYNTHETIC'].includes(x.origin))throw Error('CPI origin not accepted');
  return x.value;
 });
}
function cashflowsForPlan(plan,horizon,periodStartMonth,cpiLevels){
 const p=validatePlan(plan,horizon);
 const first=monthSerial(periodStartMonth);
 const cpi=p.mode==='HISTORICAL_CPI'?validateCpi(cpiLevels,periodStartMonth,horizon):null;
 const breakdown=[],monthly_cashflows=[],base=cpi?.[0]??1;
 for(let i=0;i<horizon;i++){
  const month=formatMonth(first+i+1);
  let salary=0,pension=0,extraIncome=0,extraExpense=0;
  for(const item of p.salary)if(i>=item.start&&i<item.end)salary=add(salary,item.amount,'salary');
  for(const item of p.pension)if(i>=item.start&&i<item.end)pension=add(pension,item.amount,'pension');
  for(const event of p.events)if(event.at===i){
   if(event.kind==='INCOME')extraIncome=add(extraIncome,event.amount,'event income');
   else extraExpense=add(extraExpense,event.amount,'event expense');
  }
  const multiplier=p.mode==='HISTORICAL_CPI'?cpi[i]/base:
    p.mode==='ANNUAL_ASSUMPTION'?Math.pow(1+p.inflation,i/12):1;
  const livingRaw=p.expense*multiplier;
  if(!Number.isFinite(livingRaw)||livingRaw<0||livingRaw>MAX_YEN)throw Error('Expense inflation overflow');
  const living=Math.round(livingRaw);
  const income=add(add(add(p.contribution,salary,'contribution + salary'),pension,'pension'),extraIncome,'event');
  const spending=add(living,extraExpense,'living + event expense');
  monthly_cashflows.push({month,contribution_yen:income,withdrawal_yen:spending});
  breakdown.push({month,relative_offset:i,monthly_contribution_yen:p.contribution,
    salary_yen:salary,pension_yen:pension,one_time_income_yen:extraIncome,
    living_expense_yen:living,one_time_expense_yen:extraExpense,
    total_income_yen:income,total_requested_expense_yen:spending});
 }
 return {monthly_cashflows,breakdown,expense_mode:p.mode,timing:'MONTH_START_ALL_CASHFLOWS_BEFORE_MARKET_RETURN'};
}
function simulatePersonalMultiAsset({monthly_market_returns,portfolio,plan,market_mode='SYNTHETIC_DEMO',cpi_levels}={}){
 if(!Array.isArray(monthly_market_returns)||!monthly_market_returns.length)throw Error('Missing market path');
 keys(portfolio,['initial_holdings_yen','target_weights','rebalance'],'portfolio');
 const firstMonth=monthly_market_returns[0]?.month;
 const startMonth=formatMonth(monthSerial(firstMonth)-1);
 if(plan?.expense_mode==='HISTORICAL_CPI'){
  const expected=market_mode==='OBSERVED_RESEARCH'?'OBSERVED':
    market_mode==='SYNTHETIC_DEMO'?'SYNTHETIC':null;
  if(!expected||!Array.isArray(cpi_levels)||cpi_levels.some(x=>x?.origin!==expected))
    throw Error('CPI origin must match market provenance for integrated results');
 }
 const flow=cashflowsForPlan(plan,monthly_market_returns.length,startMonth,cpi_levels);
 const core=simulatePortfolio({
  ...portfolio,monthly_returns:monthly_market_returns,monthly_cashflows:flow.monthly_cashflows,market_mode
 });
 const detail=core.rows.map((r,i)=>({...r,relative_offset:i,cashflow_breakdown:flow.breakdown[i]}));
 const income=flow.breakdown.reduce((s,r)=>add(s,r.total_income_yen,'all income'),0);
 const scheduled=flow.breakdown.reduce((s,r)=>add(s,r.total_requested_expense_yen,'all expenses'),0);
 const paid=core.rows.reduce((s,r)=>add(s,r.paid_withdrawal_yen,'paid'),0);
 const gains=core.rows.reduce((s,r)=>s+r.investment_gain_yen,0);
 const initial=Object.values(portfolio.initial_holdings_yen).reduce((a,b)=>a+b,0);
 if(!Number.isSafeInteger(initial+income+gains-paid)||
    initial+income+gains-paid!==core.ending_assets_yen)throw Error('Multi-asset ledger identity mismatch');
 if(scheduled!==paid+core.total_unfunded_yen)throw Error('Expense / unfunded mismatch');
 return {...core,rows:detail,cashflow_breakdown:flow.breakdown,period_start_month:startMonth,
   expected_deposits_yen:income,scheduled_expenses_yen:scheduled,actually_paid_expenses_yen:paid,
   market_investment_gain_yen:gains,accounting_contract:flow.timing,
   expense_mode:flow.expense_mode,
   rounding_contract:'INTEGER_JPY_EACH_ASSET_RETURN_AND_LARGEST_REMAINDER_FOR_ALLOCATION',
   source_rights_approved:false,personal_only:true};
}
function rollingPersonalMultiAsset({monthly_market_returns,horizon_months,portfolio,plan,market_mode='SYNTHETIC_DEMO',cpi_levels}={}){
 if(!Number.isInteger(horizon_months)||horizon_months<1||horizon_months>MAX_HORIZON)throw Error('Invalid horizon_months');
 if(!Array.isArray(monthly_market_returns)||!monthly_market_returns.length)throw Error('Missing rolling market');
 const origin=market_mode==='SYNTHETIC_DEMO'?'SYNTHETIC':market_mode==='OBSERVED_RESEARCH'?'OBSERVED':null;
 if(!origin)throw Error('Unsupported market mode');
 // Preflight the ENTIRE supplied market history, not only windows that
 // happen to fit the selected horizon. Missing calendar months are allowed
 // and excluded from windows; bad origin, duplicate dates, proxy/estimated
 // market values or malformed returns must abort instead of being counted
 // as ordinary historical gaps.
 const marketAudit=validateMarketSeries(monthly_market_returns,portfolio,market_mode);
 validatePlan(plan,horizon_months);
 validateInput({...portfolio,monthly_returns:[monthly_market_returns[0]],market_mode,
  monthly_cashflows:[{month:monthly_market_returns[0].month,contribution_yen:0,withdrawal_yen:0}]});
 const cpiMap=new Map();
 if(cpi_levels!==undefined){
  if(!Array.isArray(cpi_levels))throw Error('CPI series must be array');
  for(const entry of cpi_levels){
   if(!entry||typeof entry!=='object'||entry.origin!==origin)
    throw Error('CPI origin must match market provenance');
   if(cpiMap.has(entry.month))throw Error('Duplicate CPI month');
   cpiMap.set(entry.month,entry);
  }
 }
 const windows=[];let skipped=0;
 for(let i=0;i+horizon_months<=monthly_market_returns.length;i++){
  const market=monthly_market_returns.slice(i,i+horizon_months);
  if(market.some((r,k)=>!r||r.origin!==origin||(k>0&&monthSerial(r.month)!==monthSerial(market[k-1].month)+1))){
   skipped++;continue;
  }
  const start=formatMonth(monthSerial(market[0].month)-1);
  const cpi=plan.expense_mode==='HISTORICAL_CPI'?Array.from({length:horizon_months+1},(_,j)=>
   cpiMap.get(formatMonth(monthSerial(start)+j))):undefined;
  if(plan.expense_mode==='HISTORICAL_CPI'&&cpi.some(x=>!x)){skipped++;continue;}
  const result=simulatePersonalMultiAsset({monthly_market_returns:market,portfolio,plan,market_mode,cpi_levels:cpi});
  windows.push({market_start_month:market[0].month,period_start_month:start,
   market_end_month:market.at(-1).month,ending_assets_yen:result.ending_assets_yen,
   first_shortfall_month:result.first_shortfall_month,
   total_unfunded_yen:result.total_unfunded_yen,status:result.status});
 }
 // Calendar-span coverage differs from row-count-based candidate windows.
 // A ten-year calendar gap can hide many possible start dates even if
 // only a few row-adjacent windows visibly cross it.
 const theoreticalCalendar=Math.max(0,
   marketAudit.positions.at(-1)-marketAudit.positions[0]-horizon_months+2);
 const missingCalendar=theoreticalCalendar-windows.length;
 if(missingCalendar<0||!Number.isSafeInteger(missingCalendar))
   throw Error('Invalid rolling calendar coverage arithmetic');
 return {windows,complete_windows:windows.length,
  row_based_candidates:Math.max(0,monthly_market_returns.length-horizon_months+1),
  excluded_windows_due_to_gap_or_cpi:skipped,
  theoretical_calendar_windows:theoreticalCalendar,
  excluded_calendar_windows_due_to_gap_or_cpi:missingCalendar,
  observed_calendar_gap_boundaries:marketAudit.gap_boundaries,
  future_probability_claim:false,personal_only:true,source_rights_approved:false,
  accounting_contract:'INTEGER_JPY_MONTH_START_INCOME_EXPENSE_THEN_RETURN'};
}
module.exports={validatePlan,cashflowsForPlan,simulatePersonalMultiAsset,rollingPersonalMultiAsset};
