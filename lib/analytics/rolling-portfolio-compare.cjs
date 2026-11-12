'use strict';
/** Same market series, multiple controlled portfolio + relative lifecycle scenarios. */
const {runRollingPortfolioLifecycle}=require('./rolling-portfolio-lifecycle.cjs');
const ALLOWED_PLAN=new Set(['id','label','portfolio','cashflow_plan']);
const diff=(a,b,name)=>{const x=a-b;if(!Number.isSafeInteger(x))throw Error('Unsafe comparative delta '+name);return x;};
function compareRollingPortfolioPlans({monthly_market_returns,horizon_months,plans,baseline_id,market_mode='SYNTHETIC_DEMO'}={}){
 if(!Array.isArray(plans)||plans.length<2||plans.length>8)throw Error('Plans must contain 2..8 cases');
 const ids=new Set();let assetUniverse=null;
 const runs=plans.map((p,i)=>{
   if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Malformed plan '+i);
   for(const key of Object.keys(p))if(!ALLOWED_PLAN.has(key))throw Error('Unsupported comparison plan key '+key);
   if(typeof p.id!=='string'||!(/^[A-Za-z][A-Za-z0-9_-]{0,39}$/).test(p.id)||['constructor','prototype','__proto__'].includes(p.id))throw Error('Invalid plan id');
   if(ids.has(p.id))throw Error('Duplicate plan id '+p.id);ids.add(p.id);
   if(p.label!==undefined&&(typeof p.label!=='string'||p.label.length>80))throw Error('Invalid plan label');
   const universe=Object.keys(p.portfolio?.initial_holdings_yen??{}).sort().join('|');
   if(assetUniverse!==null&&universe!==assetUniverse)throw Error('Different asset universes cannot be directly compared');
   assetUniverse=universe;
   const outcome=runRollingPortfolioLifecycle({monthly_market_returns,horizon_months,portfolio:p.portfolio,cashflow_plan:p.cashflow_plan,market_mode});
   return {id:p.id,label:p.label??p.id,result:outcome};
 });
 const baseline=baseline_id===undefined?runs[0]:runs.find(r=>r.id===baseline_id);
 if(!baseline)throw Error('Unknown baseline_id');
 const first=baseline.result;
 for(const x of runs){
   if(x.result.complete_windows!==first.complete_windows||x.result.windows.some((w,i)=>w.market_start_month!==first.windows[i].market_start_month||w.market_end_month!==first.windows[i].market_end_month))throw Error('Rolling window alignment mismatch');
 }
 return {status:first.status,publication_approved:false,source_rights_approved:false,provenance_verified:false,
   future_probability_claim:false,market_mode,comparison_mode:'CONTROLLED_SHARED_MARKET_PATH',
   attribution:'ALLOCATION_CASHFLOW_REBALANCE_AND_ROUNDING_JOINTLY',
   notice:first.notice,baseline_id:baseline.id,horizon_months,asset_ids:assetUniverse.split('|'),
   complete_windows:first.complete_windows,excluded_windows_due_to_missing_months:first.excluded_windows_due_to_missing_months,
   summary:runs.map(x=>({id:x.id,label:x.label,funded_windows:x.result.funded_windows,
     shortfall_windows:x.result.shortfall_windows, historical_funded_fraction:x.result.historical_funded_fraction,
     demo_funded_fraction:x.result.demo_funded_fraction,
     delta_funded_windows_vs_baseline:x.result.funded_windows-first.funded_windows})),
   windows:first.windows.map((w,i)=>({market_start_month:w.market_start_month,market_end_month:w.market_end_month,
     scenarios:runs.map(x=>({id:x.id,status:x.result.windows[i].status,
       ending_assets_yen:x.result.windows[i].ending_assets_yen,
       total_unfunded_yen:x.result.windows[i].total_unfunded_yen,
       first_shortfall_offset_months:x.result.windows[i].first_shortfall_offset_months,
       rebalance_count:x.result.windows[i].rebalance_count,
       delta_ending_assets_vs_baseline_yen:diff(x.result.windows[i].ending_assets_yen,baseline.result.windows[i].ending_assets_yen,'ending assets')}))}))};
}
module.exports={compareRollingPortfolioPlans};
