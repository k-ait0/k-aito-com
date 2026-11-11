'use strict';
/**
 * K. Aito Analytics / FINOWA scenario comparison v0.2, research only.
 * CommonJS, no external dependencies. Does not import market data or make network calls.
 */
const {simulateMonthlyCashflow}=require('./cashflow-core.cjs');
const {simulateLifecycleCashflow}=require('./lifecycle-core.cjs');
const ALLOWED_INPUTS=new Set(['id','label','initial_assets_yen','monthly_withdrawal_yen','monthly_contribution_yen','monthly_returns','provenance','annual_expense_inflation','pension_schedule','one_time_events']);
const ADVANCED_INPUTS=['annual_expense_inflation','pension_schedule','one_time_events'];
const MAX_SCENARIOS=8;
function safeDelta(value,base,context){
  const delta=value-base;
  if(!Number.isSafeInteger(delta))throw Error('Unsafe comparison delta: '+context);
  return delta;
}
function totalPaid(rows){
  return rows.reduce((sum,row)=>{
    const next=sum+row.paid_withdrawal_yen;
    if(!Number.isSafeInteger(next))throw Error('Unsafe cumulative withdrawal');
    return next;
  },0);
}
/**
 * CONTROLLED: all cases share identical return path, so differences arise from cashflow inputs.
 * STRESS: rates may differ, and results cannot isolate the cause of differences.
 * Neither mode is a statistical forecast; observed and synthetic input cannot be mixed.
 */
function compareScenarios({scenarios,baseline_id,comparison_mode='CONTROLLED'}={}){
  if(!Array.isArray(scenarios)||scenarios.length<2||scenarios.length>MAX_SCENARIOS)
    throw Error('scenarios must contain 2..'+MAX_SCENARIOS+' cases');
  if(!['CONTROLLED','STRESS'].includes(comparison_mode))
    throw Error('comparison_mode must be CONTROLLED or STRESS');
  const ids=new Set();
  const cases=scenarios.map((input,i)=>{
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Malformed scenario '+i);
    if(typeof input.id!=='string'||!(/^[A-Za-z][A-Za-z0-9_-]{0,39}$/).test(input.id))
      throw Error('Invalid scenario id at '+i);
    if(['constructor','prototype','__proto__'].includes(input.id))
      throw Error('Invalid scenario id at '+i);
    if(ids.has(input.id))throw Error('Duplicate scenario id: '+input.id);
    ids.add(input.id);
    if(input.label!==undefined&&(typeof input.label!=='string'||input.label.length>80))
      throw Error('Invalid scenario label: '+input.id);
    for(const key of Object.keys(input))if(!ALLOWED_INPUTS.has(key))throw Error('Unsupported scenario input: '+key);
    const advanced=ADVANCED_INPUTS.some(key=>Object.prototype.hasOwnProperty.call(input,key));
    const {id:scenarioId,label:scenarioLabel,...calcInput}=input;
    const result=advanced?simulateLifecycleCashflow(calcInput):simulateMonthlyCashflow(calcInput);
    return {id:input.id,label:input.label??input.id,result};
  });
  const baseline=baseline_id===undefined?cases[0]:cases.find(c=>c.id===baseline_id);
  if(!baseline)throw Error('Unknown baseline_id');
  const reference=baseline.result;
  const referenceMonths=reference.rows.map(r=>r.month);
  const sameReturnPath=cases.every(c=>c.result.rows.every((r,i)=>
    r.monthly_return===reference.rows[i]?.monthly_return));
  for(const c of cases){
    const rows=c.result.rows;
    if(c.result.provenance!==reference.provenance)throw Error('Mixed market provenance is not comparable');
    if(rows.length!==referenceMonths.length||rows.some((r,i)=>r.month!==referenceMonths[i]))
      throw Error('Scenario calendar mismatch: '+c.id);
  }
  if(comparison_mode==='CONTROLLED'&&!sameReturnPath)
    throw Error('CONTROLLED requires an identical monthly return path; use STRESS to compare different paths');
  const aggregate=cases.map(c=>{
    const r=c.result;
    return {id:c.id,label:c.label,status:r.status,ending_assets_yen:r.ending_assets_yen,
      total_paid_withdrawal_yen:totalPaid(r.rows),total_unfunded_yen:r.total_unfunded_yen,
      shortfall_months:r.shortfall_months,first_shortfall_month:r.first_shortfall_month};
  });
  const baseSummary=aggregate.find(x=>x.id===baseline.id);
  const summary=aggregate.map(a=>({...a,delta_vs_baseline:{
    ending_assets_yen:safeDelta(a.ending_assets_yen,baseSummary.ending_assets_yen,a.id+' ending'),
    total_paid_withdrawal_yen:safeDelta(a.total_paid_withdrawal_yen,baseSummary.total_paid_withdrawal_yen,a.id+' paid'),
    total_unfunded_yen:safeDelta(a.total_unfunded_yen,baseSummary.total_unfunded_yen,a.id+' unfunded'),
    shortfall_months:a.shortfall_months-baseSummary.shortfall_months
  }}));
  const timeline=referenceMonths.map((month,i)=>{
    const base=baseline.result.rows[i];
    return {month,scenarios:cases.map(c=>{
      const row=c.result.rows[i];
      return {id:c.id,closing_yen:row.closing_yen,paid_withdrawal_yen:row.paid_withdrawal_yen,
        unfunded_yen:row.unfunded_yen,
        delta_closing_vs_baseline_yen:safeDelta(row.closing_yen,base.closing_yen,c.id+' '+month)};
    })};
  });
  return {status:'RESEARCH_ONLY_HOLD',publication_approved:false,baseline_id:baseline.id,
    comparison_mode,provenance:reference.provenance,same_market_path:sameReturnPath,
    attribution: sameReturnPath?'CASHFLOW_INPUT_DIFFERENCES':'MIXED_CASHFLOW_AND_MARKET_EFFECTS',
    horizon_months:referenceMonths.length,first_month:referenceMonths[0],last_month:referenceMonths.at(-1),
    notice:'Research-only comparisons are not investment advice, actual future probabilities, or production-approved calculations.',
    summary,timeline};
}
module.exports={compareScenarios};
