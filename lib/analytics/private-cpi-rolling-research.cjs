'use strict';
/** v0.13: private CPI-indexed JPY rolling research following six-file v0.10 byte & normalization QA. */
const {buildPrivateV10Report}=require('./private-normalization-parity.cjs');
const {reconcilePrivateSources}=require('./private-jpy-e2e.cjs');
const {canonicalRows}=require('./private-canonical-csv.cjs');
const {runRollingPortfolioCpiLinked}=require('./rolling-portfolio-cpi.cjs');
const exactKeys=(x,allowed,label)=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid '+label);for(const k of Object.keys(x))if(!allowed.includes(k))throw Error('Unsupported '+label+' field '+k);};
function extractVerifiedHeadlineCpi(bytes){
 const observations=canonicalRows(bytes,{label:'private JP CPI',allowedSeries:new Set(['JP_CPI_HEADLINE_2025_LINKED','JP_CPI_EX_RENT_2025_LINKED'])});
 return observations.filter(r=>r.series_id==='JP_CPI_HEADLINE_2025_LINKED').map(r=>({month:r.month,value:r.value,
   origin:r.origin,series_id:r.series_id,source_id:r.source_id,series_kind:r.series_kind,
   unit:r.unit,seasonal_adjustment:r.seasonal_adjustment}));
}
function validateResearchPlan(plan){
 exactKeys(plan,['portfolio','cashflow_plan','horizons_months'],'private CPI rolling plan');
 exactKeys(plan.portfolio,['initial_holdings_yen','target_weights','rebalance'],'portfolio');
 exactKeys(plan.cashflow_plan,['monthly_contribution_yen','monthly_withdrawal_yen','relative_pension_schedule','relative_one_time_events'],'cashflow plan');
 if(Object.keys(plan.portfolio.initial_holdings_yen||{}).join('|')!=='US_EQUITY'||Object.keys(plan.portfolio.target_weights||{}).join('|')!=='US_EQUITY'||plan.portfolio.target_weights.US_EQUITY!==1)
  throw Error('Only verified one-asset Shiller approximate USD-to-JPY return is available');
 if(!Array.isArray(plan.horizons_months)||!plan.horizons_months.length||plan.horizons_months.length>3||new Set(plan.horizons_months).size!==plan.horizons_months.length||plan.horizons_months.some(x=>![120,240,360].includes(x)))
  throw Error('Allowed horizons_months are unique [120,240,360]');
 return plan;
}
function buildPrivateCpiRollingReport({source_registry,manifest,files,plan}={}){
 validateResearchPlan(plan);
 // Fail closed before relying on any index values: six pinned bytes + raw-to-canonical parity.
 const qa=buildPrivateV10Report({source_registry,manifest,files,plan:null});
 if(qa.raw_to_canonical_normalization_independently_recomputed!==true||qa.source_raw_value_matches_canonical!==true||qa.publication_approved!==false)
  throw Error('Private raw/canonical QA did not pass');
 const market=reconcilePrivateSources({source_registry,manifest,files}).market;
 const cpi=extractVerifiedHeadlineCpi(files.cpi_canonical);
 const model_tests=plan.horizons_months.map(h=>{
  const x=runRollingPortfolioCpiLinked({monthly_market_returns:market.market_rows,jp_cpi_monthly_levels:cpi,
    horizon_months:h,portfolio:plan.portfolio,cashflow_plan:plan.cashflow_plan,market_mode:'OBSERVED_RESEARCH'});
  const sorted=x.windows.map(w=>w.ending_assets_yen).sort((a,b)=>a-b);
  const median=sorted.length?sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.floor(sorted.length/2)]:null;
  return {horizon_months:h,status:x.status,complete_windows:x.complete_windows,
    complete_market_windows:x.complete_market_windows,
    excluded_due_to_market_gaps:x.excluded_windows_due_to_missing_market_months,
    excluded_due_to_cpi_gaps:x.excluded_windows_due_to_missing_cpi_months,
    funded_windows:x.funded_windows,shortfall_windows:x.shortfall_windows,
    historical_funded_fraction:x.historical_funded_fraction,
    min_ending_assets_yen:sorted.length?sorted[0]:null,
    median_ending_assets_yen:median===null?null:Math.round(median/2),
    max_ending_assets_yen:sorted.length?sorted.at(-1):null,
    first_start_month:x.windows[0]?.market_start_month??null,
    last_start_month:x.windows.at(-1)?.market_start_month??null};
 });
 return {schema:'ANALYTICS_PRIVATE_JP_CPI_ROLLING_V0_13',status:'PRIVATE_VERIFIED_BYTES_RESEARCH_ONLY',
   publication_approved:false,source_rights_approved:false,source_origin_independently_verified:false,
   source_receipts_byte_pinned:true,raw_to_canonical_normalization_independently_recomputed:true,
   expense_inflation_mode:'OBSERVED_JP_HEADLINE_CPI_RELATIVE_TO_ROLLING_START',
   money_basis:'NOMINAL_JPY_NO_DOUBLE_CPI_DEFLATION',market_return_kind:'SHILLER_RESEARCH_APPROX_NOT_OFFICIAL_SP500_TR',
   data_coverage:{first_market_month:market.market_rows[0].month,last_market_month:market.market_rows.at(-1).month,
     available_market_months:market.market_rows.length,verified_jp_cpi_months:cpi.length},
   model_tests,warning:'Historical overlapping windows are not independent draws or future probabilities; taxes, fees, index-license rights and independent publisher authentication remain outside this calculation.'};
}
module.exports={extractVerifiedHeadlineCpi,validateResearchPlan,buildPrivateCpiRollingReport};
