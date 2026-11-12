'use strict';
/**
 * K. Aito Analytics | Personal 1..12-asset lifecycle bridge v0.5
 * Local/private research only. No network, no file access, no securities data.
 * Explicit monthly salary/pension/event income and expense phases, gross JPY ledger.
 * Legacy floating-yen Personal Lab v0.5 remains a separate calculation model.
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
 keys(s,['id','start_offset','end_offset_exclusive','monthly_yen','timing'],name);
 if(typeof s.id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(s.id))throw Error('Invalid '+name+' id');
 const from=s.start_offset,to=s.end_offset_exclusive,amount=yen(s.monthly_yen,name+' monthly');
 if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<0||to<from||to>MAX_HORIZON)throw Error('Invalid '+name+' offsets');
 const timing=s.timing??'MONTH_START';
 if(!['MONTH_START','MONTH_END'].includes(timing))
  throw Error('Invalid '+name+' timing: expected MONTH_START or MONTH_END');
 return {id:s.id,start:from,end:to,amount,timing};
}
function validatePlan(plan,horizon){
 keys(plan,['initial_holdings_yen','target_weights','rebalance','monthly_contribution_yen','monthly_contribution_source','monthly_expense_yen',
  'expense_mode','annual_expense_inflation','expense_priority','salary_schedules','pension_schedules','one_time_events'], 'personal plan');
 if(!Number.isSafeInteger(horizon)||horizon<1||horizon>MAX_HORIZON)throw Error('Invalid horizon');
 const contribution=yen(plan.monthly_contribution_yen??0,'monthly_contribution_yen');
 const contributionSource=plan.monthly_contribution_source??'EXTERNAL_NEW_MONEY';
 if(!['EXTERNAL_NEW_MONEY','INTERNAL_FROM_SALARY_PENSION'].includes(contributionSource))
  throw Error('Unknown monthly_contribution_source');
 const expense=yen(plan.monthly_expense_yen??0,'monthly_expense_yen');
 const mode=plan.expense_mode??'NOMINAL_FIXED';
 if(!['NOMINAL_FIXED','ANNUAL_ASSUMPTION','HISTORICAL_CPI'].includes(mode))throw Error('Unsupported expense_mode');
 const priority=plan.expense_priority??'EVENT_FIRST';
 if(!['EVENT_FIRST','LIVING_FIRST'].includes(priority))
  throw Error('Unsupported expense_priority; choose EVENT_FIRST or LIVING_FIRST');
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
  keys(e,['id','offset_months','kind','amount_yen','timing'],'event '+i);
  if(typeof e.id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(e.id)||seen.has(e.id))
   throw Error('Invalid/duplicate event id');seen.add(e.id);
  if(!Number.isSafeInteger(e.offset_months)||e.offset_months<0||e.offset_months>=MAX_HORIZON)
   throw Error('Event offset must be between 0 and 1199');
  if(!['INCOME','EXPENSE'].includes(e.kind))throw Error('Invalid event kind');
  if(e.timing!==undefined&&!['MONTH_START','MONTH_END'].includes(e.timing))
   throw Error('Invalid event timing; use MONTH_START or MONTH_END');
  return {id:e.id,at:e.offset_months,kind:e.kind,amount:yen(e.amount_yen,'event amount'),
   explicitTiming:e.timing??null};
 });
 return {contribution,contributionSource,expense,mode,inflation,priority,salary,pension,events:eventList};
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
function cashflowsForPlan(plan,horizon,periodStartMonth,cpiLevels,withdrawalTiming='MONTH_START'){
 if(!['MONTH_START','MONTH_END'].includes(withdrawalTiming))
  throw Error('Unsupported withdrawal_timing for cashflow construction');
 const p=validatePlan(plan,horizon);
 const first=monthSerial(periodStartMonth);
 const cpi=p.mode==='HISTORICAL_CPI'?validateCpi(cpiLevels,periodStartMonth,horizon):null;
 const breakdown=[],monthly_cashflows=[],monthly_phase_cashflows=[],base=cpi?.[0]??1;
 const requiresTwoPhase=
  p.events.some(e=>e.at<horizon&&e.explicitTiming!==null&&
   e.explicitTiming!==(e.kind==='INCOME'?'MONTH_START':withdrawalTiming))||
  [...p.salary,...p.pension].some(x=>x.timing==='MONTH_END'&&x.amount>0&&
   x.start<horizon&&x.end>0);
 for(let i=0;i<horizon;i++){
  const month=formatMonth(first+i+1);
  let salary=0,pension=0,extraIncome=0,extraExpense=0;
  let startSalary=0,endSalary=0,startPension=0,endPension=0;
  let startExtraIncome=0,endExtraIncome=0,startExtraExpense=0,endExtraExpense=0;
  const eventExpenseItems=[];
  const eventIncomeItems=[];
  for(const item of p.salary)if(i>=item.start&&i<item.end){
   salary=add(salary,item.amount,'salary');
   if(item.timing==='MONTH_START')startSalary=add(startSalary,item.amount,'salary at start');
   else endSalary=add(endSalary,item.amount,'salary at end');
  }
  for(const item of p.pension)if(i>=item.start&&i<item.end){
   pension=add(pension,item.amount,'pension');
   if(item.timing==='MONTH_START')startPension=add(startPension,item.amount,'pension at start');
   else endPension=add(endPension,item.amount,'pension at end');
  }
  for(const event of p.events)if(event.at===i){
   const phase=event.explicitTiming??(event.kind==='INCOME'?'MONTH_START':withdrawalTiming);
   if(event.kind==='INCOME'){
    extraIncome=add(extraIncome,event.amount,'event income');
    if(phase==='MONTH_START')startExtraIncome=add(startExtraIncome,event.amount,'start event income');
    else endExtraIncome=add(endExtraIncome,event.amount,'end event income');
    eventIncomeItems.push({id:event.id,amount_yen:event.amount,timing:phase});
   }else{
    extraExpense=add(extraExpense,event.amount,'event expense');
    if(phase==='MONTH_START')startExtraExpense=add(startExtraExpense,event.amount,'start event expense');
    else endExtraExpense=add(endExtraExpense,event.amount,'end event expense');
    eventExpenseItems.push({id:event.id,due_yen:event.amount,timing:phase});
   }
  }
  const expenseCpiIndex=withdrawalTiming==='MONTH_END'?i+1:i;
  const multiplier=p.mode==='HISTORICAL_CPI'?cpi[expenseCpiIndex]/base:
    p.mode==='ANNUAL_ASSUMPTION'?Math.pow(1+p.inflation,expenseCpiIndex/12):1;
  const livingRaw=p.expense*multiplier;
  if(!Number.isFinite(livingRaw)||livingRaw<0||livingRaw>MAX_YEN)throw Error('Expense inflation overflow');
  const living=Math.round(livingRaw);
  const earned=add(salary,pension,'salary + pension');
  if(p.contributionSource==='INTERNAL_FROM_SALARY_PENSION'&&p.contribution>earned)
   throw Error('内部振替の毎月積立額が当月の給与・年金の流入を超えています（資金源の二重計上防止）');
  const externalContribution=p.contributionSource==='EXTERNAL_NEW_MONEY'?p.contribution:0;
  const internalContribution=p.contributionSource==='INTERNAL_FROM_SALARY_PENSION'?p.contribution:0;
  const income=add(add(add(externalContribution,salary,'external contribution + salary'),pension,'pension'),extraIncome,'event');
  const spending=add(living,extraExpense,'living + event expense');
  monthly_cashflows.push({month,contribution_yen:income,withdrawal_yen:spending});
  const firstIncome=add(add(add(externalContribution,startSalary,'start salary'),startPension,'start pension'),
   startExtraIncome,'start one-time income');
  const lastIncome=add(add(endSalary,endPension,'end recurring income'),endExtraIncome,'end one-time income');
  const firstExpense=add(withdrawalTiming==='MONTH_START'?living:0,startExtraExpense,'start expense');
  const lastExpense=add(withdrawalTiming==='MONTH_END'?living:0,endExtraExpense,'end expense');
  monthly_phase_cashflows.push({month,start_contribution_yen:firstIncome,
   start_withdrawal_yen:firstExpense,end_contribution_yen:lastIncome,
   end_withdrawal_yen:lastExpense});
  breakdown.push({month,relative_offset:i,monthly_contribution_yen:p.contribution,
    monthly_contribution_source:p.contributionSource,
    external_contribution_yen:externalContribution,internal_from_income_yen:internalContribution,
    salary_yen:salary,pension_yen:pension,one_time_income_yen:extraIncome,
    salary_month_start_yen:startSalary,salary_month_end_yen:endSalary,
    pension_month_start_yen:startPension,pension_month_end_yen:endPension,
    living_expense_yen:living,one_time_expense_yen:extraExpense,
    expense_price_level_month:formatMonth(first+expenseCpiIndex),
    event_expense_items:eventExpenseItems,event_income_items:eventIncomeItems,
    start_contribution_yen:firstIncome,start_withdrawal_yen:firstExpense,
    end_contribution_yen:lastIncome,end_withdrawal_yen:lastExpense,
    net_month_start_yen:firstIncome-firstExpense,net_month_end_yen:lastIncome-lastExpense,
    total_income_yen:income,total_requested_expense_yen:spending});
 }
 return {monthly_cashflows,monthly_phase_cashflows,requires_two_phase:requiresTwoPhase,
  breakdown,expense_mode:p.mode,expense_priority:p.priority,
  contribution_source:p.contributionSource,
  skipped_events_after_horizon:p.events.filter(e=>e.at>=horizon).map(e=>({id:e.id,offset_months:e.at,kind:e.kind,amount_yen:e.amount})),
  timing:requiresTwoPhase?'TWO_PHASE_START_INCOME_EXPENSE_RETURN_END_INCOME_EXPENSE':
   withdrawalTiming==='MONTH_START'?
   'MONTH_START_ALL_CASHFLOWS_BEFORE_MARKET_RETURN':
   'MONTH_START_INCOME_THEN_RETURN_THEN_MONTH_END_ALL_EXPENSES'};
}

/** Allocate the Core's actually paid GROSS expense to declared obligations.
 * This does NOT change portfolio sales; it only makes the contractual order
 * explicit in the due/paid/unfunded expense ledger.
 * Same-priority events are resolved in input order. Every integer yen audited.
 */
function allocatePriorityExpenses(b,paid,priority){
 yen(paid,'paid monthly expenses');
 if(!['EVENT_FIRST','LIVING_FIRST'].includes(priority))throw Error('Unsupported expense priority');
 const items=b.event_expense_items||[];
 if(items.length>500)throw Error('Too many expense events');
 const allocated=items.map(e=>({id:e.id,due_yen:yen(e.due_yen,'event due'),paid_yen:0,unfunded_yen:0}));
 const living=yen(b.living_expense_yen,'living due');
 const totalDue=add(living,allocated.reduce((v,e)=>add(v,e.due_yen,'event due total'),0),'combined due');
 if(paid>totalDue)throw Error('Core paid more than scheduled');
 let available=paid,livingPaid=0;
 const payEvents=()=>{for(const e of allocated){e.paid_yen=Math.min(available,e.due_yen);available-=e.paid_yen;
   e.unfunded_yen=e.due_yen-e.paid_yen;}};
 const payLiving=()=>{livingPaid=Math.min(available,living);available-=livingPaid;};
 if(priority==='EVENT_FIRST'){payEvents();payLiving();}else{payLiving();payEvents();}
 const eventPaid=allocated.reduce((v,e)=>add(v,e.paid_yen,'event paid total'),0);
 const eventUnfunded=allocated.reduce((v,e)=>add(v,e.unfunded_yen,'event unfunded total'),0);
 const livingUnfunded=living-livingPaid;
 if(available!==0||paid!==eventPaid+livingPaid||
    totalDue-paid!==eventUnfunded+livingUnfunded)
  throw Error('Expense priority allocation invariant mismatch');
 return {expense_priority:priority,paid_living_expense_yen:livingPaid,
   unfunded_living_expense_yen:livingUnfunded,
   paid_event_expense_yen:eventPaid,unfunded_event_expense_yen:eventUnfunded,
   event_payment_allocations:allocated};
}
/** Explicit conversion of the legacy inclusive pension interval.
 * No implicit parsing and no silent +1 inside the Core.
 */
function migrateLegacyInclusivePensions(entries,horizon){
 if(!Array.isArray(entries)||entries.length>20)throw Error('Legacy pensions must be an array up to 20');
 if(!Number.isSafeInteger(horizon)||horizon<1||horizon>MAX_HORIZON)throw Error('Legacy migration horizon invalid');
 const seen=new Set();
 return entries.map((e,i)=>{
   keys(e,['id','start_offset_months','end_offset_months','monthly_yen'],'legacy pension '+i);
   if(typeof e.id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(e.id)||seen.has(e.id))
    throw Error('Legacy pension id invalid/duplicated');
   seen.add(e.id);
   const start=e.start_offset_months,end=e.end_offset_months??horizon-1;
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
      start<0||end<start||end>=horizon)
    throw Error('Legacy inclusive pension interval outside horizon');
   return {id:e.id,start_offset:start,end_offset_exclusive:end+1,
     monthly_yen:yen(e.monthly_yen,'legacy pension yen')};
 });
}

function simulatePersonalMultiAsset({monthly_market_returns,portfolio,plan,market_mode='SYNTHETIC_DEMO',cpi_levels}={}){
 if(!Array.isArray(monthly_market_returns)||!monthly_market_returns.length)throw Error('Missing market path');
 keys(portfolio,['initial_holdings_yen','target_weights','rebalance','withdrawal_strategy','cash_asset_id','withdrawal_timing'],'portfolio');
 const firstMonth=monthly_market_returns[0]?.month;
 const startMonth=formatMonth(monthSerial(firstMonth)-1);
 if(plan?.expense_mode==='HISTORICAL_CPI'){
  const expected=market_mode==='OBSERVED_RESEARCH'?'OBSERVED':
    market_mode==='SYNTHETIC_DEMO'?'SYNTHETIC':null;
  if(!expected||!Array.isArray(cpi_levels)||cpi_levels.some(x=>x?.origin!==expected))
    throw Error('CPI origin must match market provenance for integrated results');
 }
 const flow=cashflowsForPlan(plan,monthly_market_returns.length,startMonth,cpi_levels,portfolio.withdrawal_timing??'MONTH_START');
 const core=simulatePortfolio({
  ...portfolio,monthly_returns:monthly_market_returns,market_mode,
  ...(flow.requires_two_phase?{monthly_phase_cashflows:flow.monthly_phase_cashflows}:
      {monthly_cashflows:flow.monthly_cashflows})
 });
 const detail=core.rows.map((r,i)=>{
  const b=flow.breakdown[i];
  let allocated;
  if(flow.requires_two_phase){
   const portions=['MONTH_START','MONTH_END'].map(phase=>{
    const living=phase===(portfolio.withdrawal_timing??'MONTH_START')?b.living_expense_yen:0;
    const events=b.event_expense_items.filter(e=>e.timing===phase);
    const phaseDue=living+events.reduce((v,e)=>add(v,e.due_yen,'phase event dues'),0);
    const phasePaid=r.phases[phase].paid_withdrawal_yen;
    if(phaseDue!==r.phases[phase].requested_withdrawal_yen)
     throw Error('Per-phase expenses disagree with Core scheduled amount');
    const result=allocatePriorityExpenses({living_expense_yen:living,event_expense_items:events},
      phasePaid,flow.expense_priority);
    return {phase,...result};
   });
   const sums=(k)=>portions.reduce((v,p)=>add(v,p[k],'phase '+k),0);
   const allocations=b.event_expense_items.map(e=>{
     const paid=portions.flatMap(p=>p.event_payment_allocations).find(x=>x.id===e.id);
     if(!paid)throw Error('Missing per-event payment from its due phase');
     return {...paid,timing:e.timing};
   });
   allocated={
    expense_priority:flow.expense_priority,
    paid_living_expense_yen:sums('paid_living_expense_yen'),
    unfunded_living_expense_yen:sums('unfunded_living_expense_yen'),
    paid_event_expense_yen:sums('paid_event_expense_yen'),
    unfunded_event_expense_yen:sums('unfunded_event_expense_yen'),
    event_payment_allocations:allocations,
    phase_payment_allocations:Object.fromEntries(portions.map(p=>[p.phase,{
     paid_living_expense_yen:p.paid_living_expense_yen,
     unfunded_living_expense_yen:p.unfunded_living_expense_yen,
     paid_event_expense_yen:p.paid_event_expense_yen,
     unfunded_event_expense_yen:p.unfunded_event_expense_yen
    }]))
   };
  }else{
   allocated=allocatePriorityExpenses(b,r.paid_withdrawal_yen,flow.expense_priority);
   allocated.event_payment_allocations=allocated.event_payment_allocations.map(e=>({
    ...e,timing:b.event_expense_items.find(x=>x.id===e.id)?.timing??(portfolio.withdrawal_timing??'MONTH_START')
   }));
  }
  if(r.unfunded_yen!==allocated.unfunded_living_expense_yen+allocated.unfunded_event_expense_yen)
   throw Error('Gross Core unfunded amount does not match classified expenses');
  const actualPhases=r.phases??{
   MONTH_START:{
    contribution_yen:b.start_contribution_yen,
    paid_withdrawal_yen:(portfolio.withdrawal_timing??'MONTH_START')==='MONTH_START'?r.paid_withdrawal_yen:0
   },
   MONTH_END:{
    contribution_yen:b.end_contribution_yen,
    paid_withdrawal_yen:(portfolio.withdrawal_timing??'MONTH_START')==='MONTH_END'?r.paid_withdrawal_yen:0
   }
  };
  return {...r,relative_offset:i,
   cashflow_breakdown:{...b,...allocated,
    scheduled_net_month_start_yen:b.net_month_start_yen,
    scheduled_net_month_end_yen:b.net_month_end_yen,
    realized_net_month_start_yen:actualPhases.MONTH_START.contribution_yen-
      actualPhases.MONTH_START.paid_withdrawal_yen,
    realized_net_month_end_yen:actualPhases.MONTH_END.contribution_yen-
      actualPhases.MONTH_END.paid_withdrawal_yen
   }};
 });
 const livingPaidTotal=detail.reduce((v,r)=>add(v,r.cashflow_breakdown.paid_living_expense_yen,'living paid'),0);
 const eventPaidTotal=detail.reduce((v,r)=>add(v,r.cashflow_breakdown.paid_event_expense_yen,'event paid'),0);
 const livingUnfundedTotal=detail.reduce((v,r)=>add(v,r.cashflow_breakdown.unfunded_living_expense_yen,'living unfunded'),0);
 const eventUnfundedTotal=detail.reduce((v,r)=>add(v,r.cashflow_breakdown.unfunded_event_expense_yen,'event unfunded'),0);
 const income=flow.breakdown.reduce((s,r)=>add(s,r.total_income_yen,'all income'),0);
 const scheduled=flow.breakdown.reduce((s,r)=>add(s,r.total_requested_expense_yen,'all expenses'),0);
 const paid=core.rows.reduce((s,r)=>add(s,r.paid_withdrawal_yen,'paid'),0);
 const gains=core.rows.reduce((s,r)=>s+r.investment_gain_yen,0);
 const initial=Object.values(portfolio.initial_holdings_yen).reduce((a,b)=>a+b,0);
 if(!Number.isSafeInteger(initial+income+gains-paid)||
    initial+income+gains-paid!==core.ending_assets_yen)throw Error('Multi-asset ledger identity mismatch');
 if(scheduled!==paid+core.total_unfunded_yen)throw Error('Expense / unfunded mismatch');
 if(paid!==livingPaidTotal+eventPaidTotal||
    core.total_unfunded_yen!==livingUnfundedTotal+eventUnfundedTotal)
  throw Error('Classified expenses fail total Core ledger reconciliation');
 return {...core,rows:detail,cashflow_breakdown:flow.breakdown,period_start_month:startMonth,
   expected_deposits_yen:income,scheduled_expenses_yen:scheduled,actually_paid_expenses_yen:paid,
   market_investment_gain_yen:gains,accounting_contract:flow.timing,
   two_phase_enabled:flow.requires_two_phase,
   gross_cashflow_contract:'RECORD_GROSS_PHASE_INCOME_AND_LIABILITIES_WITH_NET_DERIVED',
   net_cashflow_total_yen:income-scheduled,
   scheduled_net_cashflow_total_yen:income-scheduled,
   realized_net_cashflow_total_yen:income-paid,
   expense_mode:flow.expense_mode,expense_priority:flow.expense_priority,
   contribution_source:flow.contribution_source,
   external_contribution_yen:flow.breakdown.reduce((v,b)=>add(v,b.external_contribution_yen,'external contributions'),0),
   internal_from_income_yen:flow.breakdown.reduce((v,b)=>add(v,b.internal_from_income_yen,'internal transfers'),0),
   paid_living_expense_yen:livingPaidTotal,paid_event_expense_yen:eventPaidTotal,
   unfunded_living_expense_yen:livingUnfundedTotal,unfunded_event_expense_yen:eventUnfundedTotal,
   skipped_events_after_horizon:flow.skipped_events_after_horizon,
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
   total_unfunded_yen:result.total_unfunded_yen,
   paid_event_expense_yen:result.paid_event_expense_yen,
   unfunded_event_expense_yen:result.unfunded_event_expense_yen,
   contribution_source:result.contribution_source,
   external_contribution_yen:result.external_contribution_yen,
   internal_from_income_yen:result.internal_from_income_yen,
   withdrawal_strategy:result.withdrawal_strategy,
   two_phase_enabled:result.two_phase_enabled,
   skipped_events_after_horizon:result.skipped_events_after_horizon.length,
   status:result.status});
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
  accounting_contract:portfolio.withdrawal_timing==='MONTH_END'?
   'INTEGER_JPY_MONTH_START_INCOME_RETURN_MONTH_END_EXPENSE':
   'INTEGER_JPY_MONTH_START_INCOME_EXPENSE_THEN_RETURN'};
}
module.exports={validatePlan,cashflowsForPlan,allocatePriorityExpenses,migrateLegacyInclusivePensions,simulatePersonalMultiAsset,rollingPersonalMultiAsset};
