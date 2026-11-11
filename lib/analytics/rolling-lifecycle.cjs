'use strict';
/** Historical observed-return rolling windows with synthetic relative-month life plans.
 * Research only. No fetching, browser, rights approval or hidden backfill.
 */
const {validateMonthlyReturns,formatMonth}=require('./cashflow-core.cjs');
const {simulateLifecycleCashflow}=require('./lifecycle-core.cjs');
const MAX_MONTHS=1200,MAX_PENSIONS=20,MAX_EVENTS=500;
const INPUT_KEYS=new Set(['monthly_returns','horizon_months','initial_assets_yen',
  'monthly_withdrawal_yen','monthly_contribution_yen','annual_expense_inflation',
  'relative_pension_schedule','relative_one_time_events','market_mode']);
const PENSION_KEYS=new Set(['id','start_offset_months','end_offset_months','monthly_yen']);
const EVENT_KEYS=new Set(['id','offset_months','kind','amount_yen']);
function nonnegativeInt(n,label){
  if(!Number.isSafeInteger(n)||n<0)throw Error(label+' must be a nonnegative safe integer');
  return n;
}
function assertRecord(value,label,allowedKeys){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid '+label);
  for(const k of Object.keys(value))if(!allowedKeys.has(k))throw Error('Unsupported '+label+' field: '+k);
}
function validId(value,label){
  if(typeof value!=='string'||!(/^[A-Za-z][A-Za-z0-9_-]{0,39}$/).test(value)||
    ['constructor','prototype','__proto__'].includes(value))throw Error('Invalid '+label);
  return value;
}
function planSchedules(input,horizon){
  const pensions=input.relative_pension_schedule??[];
  const events=input.relative_one_time_events??[];
  if(!Array.isArray(pensions)||pensions.length>MAX_PENSIONS)throw Error('Invalid relative_pension_schedule');
  if(!Array.isArray(events)||events.length>MAX_EVENTS)throw Error('Invalid relative_one_time_events');
  const pensionIds=new Set(),eventIds=new Set();
  const pp=pensions.map((p,i)=>{
    assertRecord(p,'pension '+i,PENSION_KEYS);
    validId(p.id,'pension id');
    if(pensionIds.has(p.id))throw Error('Duplicate pension id '+p.id);
    pensionIds.add(p.id);
    const start=nonnegativeInt(p.start_offset_months,'start_offset_months');
    if(start>=horizon)throw Error('Pension starts outside rolling horizon');
    const end=p.end_offset_months===undefined?undefined:nonnegativeInt(p.end_offset_months,'end_offset_months');
    if(end!==undefined&&(end<start||end>=horizon))throw Error('Pension end outside rolling horizon or before start');
    return {id:p.id,start,end,monthly_yen:nonnegativeInt(p.monthly_yen,'monthly_yen')};
  });
  const ee=events.map((e,i)=>{
    assertRecord(e,'event '+i,EVENT_KEYS);
    validId(e.id,'event id');if(eventIds.has(e.id))throw Error('Duplicate event id '+e.id);
    eventIds.add(e.id);
    const at=nonnegativeInt(e.offset_months,'offset_months');
    if(at>=horizon)throw Error('Event outside rolling horizon');
    if(!['INCOME','EXPENSE'].includes(e.kind))throw Error('Invalid event kind');
    return {id:e.id,at,kind:e.kind,amount_yen:nonnegativeInt(e.amount_yen,'amount_yen')};
  });
  return {pensions:pp,events:ee};
}
function shiftedPlan(plan,firstSerial){
  return {
    pension_schedule:plan.pensions.map(p=>({id:p.id,start_month:formatMonth(firstSerial+p.start),
      ...(p.end===undefined?{}:{end_month:formatMonth(firstSerial+p.end)}),monthly_yen:p.monthly_yen})),
    one_time_events:plan.events.map(e=>({id:e.id,month:formatMonth(firstSerial+e.at),
      kind:e.kind,amount_yen:e.amount_yen}))
  };
}
function runRollingLifecycleCashflow(input){
  assertRecord(input,'rolling lifecycle input',INPUT_KEYS);
  const horizon=nonnegativeInt(input.horizon_months,'horizon_months');
  if(horizon<1||horizon>MAX_MONTHS)throw Error('horizon_months must be 1..1200');
  const marketMode=input.market_mode??'OBSERVED';
  if(!['OBSERVED','SYNTHETIC_DEMO'].includes(marketMode))throw Error('Unsupported market_mode');
  const provenance=marketMode==='OBSERVED'?'OBSERVED':'SYNTHETIC';
  const records=validateMonthlyReturns(input.monthly_returns,provenance,{allowGaps:true});
  const plan=planSchedules(input,horizon);
  // Validate financial fields and inflation even when no complete window exists.
  nonnegativeInt(input.initial_assets_yen,'initial_assets_yen');
  nonnegativeInt(input.monthly_withdrawal_yen,'monthly_withdrawal_yen');
  nonnegativeInt(input.monthly_contribution_yen??0,'monthly_contribution_yen');
  const inflation=input.annual_expense_inflation??0;
  if(typeof inflation!=='number'||!Number.isFinite(inflation)||inflation< -0.5||inflation>1)
    throw Error('Invalid annual_expense_inflation');
  const cases=[];let gaps=0,blockStart=0;
  function evaluateBlock(from,to){
    for(let i=from;i+horizon<=to;i++){
      const selected=input.monthly_returns.slice(i,i+horizon);
      const mapped=shiftedPlan(plan,records[i].serial);
      const result=simulateLifecycleCashflow({initial_assets_yen:input.initial_assets_yen,
        monthly_withdrawal_yen:input.monthly_withdrawal_yen,
        monthly_contribution_yen:input.monthly_contribution_yen??0,
        annual_expense_inflation:inflation,provenance,monthly_returns:selected,...mapped});
      const firstShortfallOffset=result.rows.findIndex(r=>r.unfunded_yen>0);
      cases.push({market_start_month:selected[0].month,market_end_month:selected.at(-1).month,
        status:result.status,ending_assets_yen:result.ending_assets_yen,
        total_unfunded_yen:result.total_unfunded_yen,
        first_shortfall_offset_months:firstShortfallOffset<0?null:firstShortfallOffset,
        shortfall_months:result.shortfall_months});
    }
  }
  for(let i=1;i<=records.length;i++){
    if(i<records.length&&records[i].serial===records[i-1].serial+1)continue;
    evaluateBlock(blockStart,i);
    if(i<records.length)gaps++;
    blockStart=i;
  }
  const theoretical=Math.max(0,records.at(-1).serial-records[0].serial-horizon+2);
  const complete=cases.length;
  const funded=cases.filter(x=>x.status==='FUNDED').length;
  return {status:complete?'EVALUATED':'INSUFFICIENT_CONTIGUOUS_HISTORY',
    publication_approved:false, market_mode:marketMode,market_provenance:provenance,
    life_plan_provenance:'SYNTHETIC_ASSUMPTIONS',
    methodology:marketMode==='OBSERVED'?'HISTORICAL_MONTHLY_RETURNS_WITH_RELATIVE_SYNTHETIC_LIFECYCLE':'DETERMINISTIC_SYNTHETIC_DEMO_NO_OBSERVED_MARKET_DATA',
    future_probability_claim:false,
    notice:marketMode==='OBSERVED'?'Observed historical paths combined with hypothetical life plans; overlapping starts are not independent trials or future probabilities.':'Entire market path and life plans are synthetic illustrations. These counts are not observed histories or forecasts.',
    horizon_months:horizon,first_observed_month:records[0].month,last_observed_month:records.at(-1).month,
    observed_return_months:records.length, gap_boundaries:gaps,
    theoretical_windows_if_no_gaps:theoretical,complete_windows:complete,
    excluded_windows_due_to_missing_months:theoretical-complete,
    funded_windows:funded,shortfall_windows:complete-funded,
    historical_funded_fraction:marketMode==='OBSERVED'&&complete?funded/complete:null,
    demo_funded_fraction:marketMode==='SYNTHETIC_DEMO'&&complete?funded/complete:null,
    relative_event_semantics:'OFFSET_ZERO_IS_THE_FIRST_MONTH_OF_EACH_WINDOW',windows:cases};
}
module.exports={runRollingLifecycleCashflow};
