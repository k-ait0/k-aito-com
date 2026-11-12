'use strict';
/**
 * v0.14 private, raw-byte-gated CPI versus fixed-inflation comparison.
 * Output is aggregate metadata only; the data never leaves the local process.
 */
const {buildPrivateV10Report}=require('./private-normalization-parity.cjs');
const {reconcilePrivateSources}=require('./private-jpy-e2e.cjs');
const {extractVerifiedHeadlineCpi,validateResearchPlan}=require('./private-cpi-rolling-research.cjs');
const {compareRollingCpiVsFixedInflation}=require('./rolling-cpi-benchmark.cjs');
function buildPrivateCpiBenchmarkReport({source_registry,manifest,files,plan,comparison_annual_expense_inflation}={}){
  validateResearchPlan(plan);
  if(typeof comparison_annual_expense_inflation!=='number'||!
    Number.isFinite(comparison_annual_expense_inflation)||
    comparison_annual_expense_inflation<-.5||comparison_annual_expense_inflation>1)
    throw Error('comparison_annual_expense_inflation required -0.5..1');
  // Re-run complete source byte pins and independent raw-vs-canonical normalization QA.
  const qa=buildPrivateV10Report({source_registry,manifest,files,plan:null});
  if(qa.raw_to_canonical_normalization_independently_recomputed!==true||
     qa.source_raw_value_matches_canonical!==true||qa.publication_approved!==false)
    throw Error('Six-file byte & independent raw normalization gate failed');
  const {market}=reconcilePrivateSources({source_registry,manifest,files});
  const cpi=extractVerifiedHeadlineCpi(files.cpi_canonical);
  const comparison=plan.horizons_months.map(h=>{
    const x=compareRollingCpiVsFixedInflation({monthly_market_returns:market.market_rows,
      jp_cpi_monthly_levels:cpi,horizon_months:h,portfolio:plan.portfolio,
      cashflow_plan:plan.cashflow_plan,comparison_annual_expense_inflation,
      market_mode:'OBSERVED_RESEARCH'});
    // Deliberately strip all per-window CPI level and nominal asset results from this output.
    const {paired_windows, ...aggregate}=x;
    return aggregate;
  });
  return {schema:'ANALYTICS_PRIVATE_PAIRED_CPI_VS_FIXED_V0_14',
    status:'PRIVATE_SIX_FILE_BYTE_AND_NORMALIZATION_QA_RESEARCH_ONLY',
    private_source_byte_pins_passed:true,raw_to_canonical_normalization_independently_recomputed:true,
    source_origin_independently_verified:false,publication_approved:false,source_rights_approved:false,
    performance_claim_approved:false,comparison_annual_expense_inflation,
    market_return_kind:'SHILLER_RESEARCH_APPROX_NOT_SP500_OFFICIAL_TR',
    data_coverage:{first_month:market.market_rows[0].month,last_month:market.market_rows.at(-1).month,
      aligned_monthly_return_count:market.market_rows.length,cpi_months:cpi.length},
    comparison,
    warning:'Computed only from supplied byte-pinned private sources. Historical CPI uses final available index values, not CPI release-lagged information. Overlapping starts are not independent draws or future probabilities; source licenses and publisher origin remain unapproved.'};
}
module.exports={buildPrivateCpiBenchmarkReport};