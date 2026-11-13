'use strict';
/**
 * v0.14. Paired research comparison: CPI-linked vs a specified fixed-rate
 * inflation assumption on exactly the SAME historical rolling starts.
 * No data acquisition, rights grant, forecast, or live trading interpretation.
 */
const {runRollingPortfolioCpiLinked}=require('./rolling-portfolio-cpi.cjs');
const {runRollingPortfolioLifecycle}=require('./rolling-portfolio-lifecycle.cjs');

function assertObject(x,label){
  if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid '+label);
}
function safeDiff(a,b,label){
  if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||!Number.isSafeInteger(a-b))
    throw Error('Unsafe benchmark delta '+label);
  return a-b;
}
function medianInteger(sorted){
  if(!sorted.length)return null;
  const mid=Math.floor(sorted.length/2);
  if(sorted.length%2)return sorted[mid];
  const a=sorted[mid-1],b=sorted[mid];
  // Avoid overflow in (a+b) before division, while matching Math.round.
  const rounded=Math.round(a/2+b/2);
  return Object.is(rounded,-0)?0:rounded;
}
function compareRollingCpiVsFixedInflation({
  monthly_market_returns,jp_cpi_monthly_levels,horizon_months,portfolio,cashflow_plan,
  comparison_annual_expense_inflation,market_mode='OBSERVED_RESEARCH',cashflow_timing='MONTH_START',cpi_reference_policy='LEGACY_SAME_MONTH'
}={}){
  assertObject(cashflow_plan,'cashflow_plan');
  if(Object.prototype.hasOwnProperty.call(cashflow_plan,'annual_expense_inflation'))
    throw Error('CPI paired comparison requires cashflow_plan WITHOUT fixed inflation; supplied separately');
  if(typeof comparison_annual_expense_inflation!=='number'||
     !Number.isFinite(comparison_annual_expense_inflation)||
     comparison_annual_expense_inflation< -0.5||comparison_annual_expense_inflation>1)
    throw Error('Explicit comparison_annual_expense_inflation must be -0.5..1');
  const common={monthly_market_returns,horizon_months,portfolio,market_mode,cashflow_timing};
  const cpi=runRollingPortfolioCpiLinked({...common,jp_cpi_monthly_levels,cashflow_plan,cpi_reference_policy});
  const fixed=runRollingPortfolioLifecycle({...common,cashflow_plan:{...cashflow_plan,
    annual_expense_inflation:comparison_annual_expense_inflation}});
  if(cpi.theoretical_windows_if_no_gaps!==fixed.theoretical_windows_if_no_gaps||
     cpi.complete_market_windows!==fixed.complete_windows)
    throw Error('CPI and fixed market universe mismatch');
  const key=w=>`${w.market_start_month}|${w.market_end_month}`;
  const fixedByKey=new Map();
  for(const window of fixed.windows){
    const k=key(window);
    if(fixedByKey.has(k))throw Error('Duplicate fixed market window');
    fixedByKey.set(k,window);
  }
  const paired=[];
  for(const observed of cpi.windows){
    const other=fixedByKey.get(key(observed));
    if(!other)throw Error('CPI result not found in identical fixed-market windows');
    paired.push({market_start_month:observed.market_start_month,market_end_month:observed.market_end_month,
      cpi_start_level:observed.cpi_start_level,cpi_end_level:observed.cpi_end_level,
      ending_assets_cpi_yen:observed.ending_assets_yen,ending_assets_fixed_yen:other.ending_assets_yen,
      delta_ending_assets_cpi_minus_fixed_yen:safeDiff(observed.ending_assets_yen,other.ending_assets_yen,'ending assets'),
      total_unfunded_cpi_yen:observed.total_unfunded_yen,total_unfunded_fixed_yen:other.total_unfunded_yen,
      delta_unfunded_cpi_minus_fixed_yen:safeDiff(observed.total_unfunded_yen,other.total_unfunded_yen,'unfunded'),
      cpi_funded:observed.status==='FUNDED',fixed_funded:other.status==='FUNDED',
      cpi_first_shortfall_offset_months:observed.first_shortfall_offset_months,
      fixed_first_shortfall_offset_months:other.first_shortfall_offset_months});
  }
  const deltas=paired.map(w=>w.delta_ending_assets_cpi_minus_fixed_yen).sort((a,b)=>a-b);
  const count=paired.length;
  const cpiFunded=paired.filter(w=>w.cpi_funded).length;
  const fixedFunded=paired.filter(w=>w.fixed_funded).length;
  return {schema:'ANALYTICS_PAIRED_CPI_VS_FIXED_RESEARCH_V0_14',
    status:count?'PAIRED_WINDOWS_EVALUATED':'INSUFFICIENT_PAIRED_WINDOWS',
    horizon_months,market_mode,cashflow_timing,cpi_reference_policy,publication_approved:false,source_rights_approved:false,
    source_origin_independently_verified_here:false,future_probability_claim:false,
    inflation_assumptions:{cpi:'JP_HEADLINE_CPI_RELATIVE_TO_EACH_WINDOW_START',
      fixed_annual_expense_inflation:comparison_annual_expense_inflation,
      fixed_calculation:'EXPENSE_BASE * (1+annual_rate)^(months_elapsed/12)'},
    market_timing:cashflow_timing==='MONTH_START'?'NOMINAL_JPY_RETURNS_MONTH_START_CASHFLOWS':'NOMINAL_JPY_RETURNS_MONTH_END_CASHFLOWS',
    cpi_asof_policy:'RETROSPECTIVE_FINAL_CPI_LEVELS_NOT_HISTORICAL_RELEASE_TIME_AVAILABLE',
    comparative_attribution:'INFLATION_MODEL_ONLY_WITH_SAME_MARKET_PATH_PORTFOLIO_AND_PLAN',
    theoretical_windows_if_no_gaps:cpi.theoretical_windows_if_no_gaps,
    excluded_due_to_missing_market_months:cpi.excluded_windows_due_to_missing_market_months,
    excluded_due_to_missing_cpi_months:cpi.excluded_windows_due_to_missing_cpi_months,
    complete_market_windows:fixed.complete_windows,paired_complete_windows:count,
    fixed_only_windows_excluded_from_comparison:fixed.complete_windows-count,
    funded_cpi_windows:cpiFunded,funded_fixed_windows_on_paired_starts:fixedFunded,
    cpi_funded_fixed_shortfall:paired.filter(w=>w.cpi_funded&&!w.fixed_funded).length,
    fixed_funded_cpi_shortfall:paired.filter(w=>!w.cpi_funded&&w.fixed_funded).length,
    funded_fraction_cpi_in_paired_windows:count?cpiFunded/count:null,
    funded_fraction_fixed_in_paired_windows:count?fixedFunded/count:null,
    min_delta_ending_assets_cpi_minus_fixed_yen:deltas[0]??null,
    median_delta_ending_assets_cpi_minus_fixed_yen:medianInteger(deltas),
    max_delta_ending_assets_cpi_minus_fixed_yen:deltas.at(-1)??null,
    notice:'Retrospective overlapping starts, not independent trials, a forecast, a future probability, or live CPI-as-published simulation. Unmatched fixed-rate windows are EXCLUDED from all paired metrics.',
    paired_windows:paired};
}
module.exports={compareRollingCpiVsFixedInflation,medianInteger};
