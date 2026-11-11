'use strict';
/** Comparison of life plans under identical observed historical return windows. */
const {runRollingLifecycleCashflow}=require('./rolling-lifecycle.cjs');
const MAX_PLANS=8;
const ALLOWED_PLAN=new Set(['id','label','initial_assets_yen','monthly_withdrawal_yen',
  'monthly_contribution_yen','annual_expense_inflation','relative_pension_schedule','relative_one_time_events']);
function safeDelta(a,b,label){
  const diff=a-b;if(!Number.isSafeInteger(diff))throw Error('Unsafe comparison delta '+label);return diff;
}
function compareRollingLifecyclePlans({monthly_returns,horizon_months,plans,baseline_id}={}){
  if(!Array.isArray(plans)||plans.length<2||plans.length>MAX_PLANS)
    throw Error('plans must contain 2..8 distinct plans');
  const unique=new Set();
  const runs=plans.map((plan,i)=>{
    if(!plan||typeof plan!=='object'||Array.isArray(plan))throw Error('Invalid plan '+i);
    if(typeof plan.id!=='string'||!(/^[A-Za-z][A-Za-z0-9_-]{0,39}$/).test(plan.id)||
      ['constructor','prototype','__proto__'].includes(plan.id))throw Error('Invalid plan id');
    if(unique.has(plan.id))throw Error('Duplicate plan id '+plan.id);unique.add(plan.id);
    if(plan.label!==undefined&&(typeof plan.label!=='string'||plan.label.length>80))throw Error('Invalid plan label');
    for(const k of Object.keys(plan))if(!ALLOWED_PLAN.has(k))throw Error('Unsupported plan field '+k);
    const {id,label,...terms}=plan;
    return {id,label:label??id,result:runRollingLifecycleCashflow({monthly_returns,horizon_months,...terms})};
  });
  const baseline=baseline_id===undefined?runs[0]:runs.find(x=>x.id===baseline_id);
  if(!baseline)throw Error('Unknown baseline_id');
  const first=baseline.result;
  for(const r of runs){
    if(r.result.complete_windows!==first.complete_windows||r.result.windows.some((w,i)=>
      w.market_start_month!==first.windows[i].market_start_month||w.market_end_month!==first.windows[i].market_end_month))
      throw Error('Rolling windows were not aligned');
  }
  return {
    status:first.status,publication_approved:false,future_probability_claim:false,
    market_provenance:'OBSERVED',life_plan_provenance:'SYNTHETIC_ASSUMPTIONS',
    notice:'These overlapping historical comparisons are not independent forecasts or estimates of future probabilities.',
    baseline_id:baseline.id,horizon_months:first.horizon_months,
    complete_windows:first.complete_windows,excluded_windows_due_to_missing_months:first.excluded_windows_due_to_missing_months,
    summary:runs.map(x=>({id:x.id,label:x.label,funded_windows:x.result.funded_windows,
      shortfall_windows:x.result.shortfall_windows,historical_funded_fraction:x.result.historical_funded_fraction,
      delta_funded_windows_vs_baseline:x.result.funded_windows-first.funded_windows})),
    windows:first.windows.map((w,i)=>({market_start_month:w.market_start_month,market_end_month:w.market_end_month,
      scenarios:runs.map(x=>({id:x.id,status:x.result.windows[i].status,
        ending_assets_yen:x.result.windows[i].ending_assets_yen,
        total_unfunded_yen:x.result.windows[i].total_unfunded_yen,
        first_shortfall_offset_months:x.result.windows[i].first_shortfall_offset_months,
        delta_ending_assets_vs_baseline_yen:safeDelta(x.result.windows[i].ending_assets_yen,
          baseline.result.windows[i].ending_assets_yen,x.id)}))}))
  };
}
module.exports={compareRollingLifecyclePlans};