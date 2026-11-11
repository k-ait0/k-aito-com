'use strict';
/** Strict private observed-data gateway. Metadata and resulting raw values never ship in web builds. */
const crypto=require('node:crypto');
const {monthSerial}=require('./cashflow-core.cjs');
const {deriveShillerApproxUsdReturns}=require('./private-shiller-raw-reader.cjs');
const {canonicalRows}=require('./private-canonical-csv.cjs');
const {preparePrivateShillerJpyResearch}=require('./private-shiller-jpy-adapter.cjs');
const {runRollingPortfolioLifecycle}=require('./rolling-portfolio-lifecycle.cjs');
const FILES={shiller:'raw-shiller.csv',fed:'raw-fed-h10.html',cpi_headline:'raw-cpi-headline.csv',cpi_ex_rent:'raw-cpi-ex-rent.csv',fx_canonical:'normalized-fed-h10.csv',cpi_canonical:'normalized-jp-cpi.csv'};
const SHA=/^[a-f0-9]{64}$/i;
const sha256=x=>crypto.createHash('sha256').update(x).digest('hex');
function requireObject(x,label){if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid '+label);return x}
function hashPin(value,label){if(typeof value!=='string'||!SHA.test(value))throw Error('Missing/invalid canonical SHA256 '+label);return value.toLowerCase()}
function assertHash(buffer,pin,label){if(!Buffer.isBuffer(buffer))throw Error('Expected source file bytes for '+label);const actual=sha256(buffer),expected=hashPin(pin,label);if(actual!==expected)throw Error('Raw or canonical byte SHA256 mismatch: '+label);return actual}
function ensureSortedContinuous(rows,label,first,last,expectedCount){
 if(!rows.length)throw Error('No rows for '+label);
 if(rows[0].month!==first||rows.at(-1).month!==last)throw Error('Canonical coverage boundary mismatch: '+label);
 for(let i=1;i<rows.length;i++)if(monthSerial(rows[i].month)!==monthSerial(rows[i-1].month)+1)throw Error('Canonical unexplained gap: '+label);
 if(expectedCount!==undefined&&rows.length!==expectedCount)throw Error('Canonical observation count mismatch: '+label);
}
function requireMetadata(row,expected,label){
 for(const [k,val] of Object.entries(expected))if(row[k]!==val)throw Error('Canonical observation metadata mismatch: '+label+' '+k);
}
function reconcilePrivateSources({source_registry,manifest,files}){
 const registry=requireObject(source_registry,'source_registry');requireObject(manifest,'manifest');requireObject(files,'files');
 for(const k of Object.keys(FILES))if(!Buffer.isBuffer(files[k]))throw Error('Missing private source bytes '+FILES[k]);
 const {assets,auxiliary,acquisition}=registry;
 if(!Array.isArray(assets)||!Array.isArray(auxiliary)||!acquisition)throw Error('No canonical source registry');
 const fx=auxiliary.find(x=>x.aux_id==='FX');
 const jp=auxiliary.find(x=>x.aux_id==='CPI_JP');
 if(!fx||!jp)throw Error('Canonical FX/JP-CPI metadata missing');
 const shillerPin=acquisition.private_research_normalization_v04?.source_sha256;
 const fxRaw=fx.full_pinned_history_20261111?.raw_sha256;
 const fxNorm=fx.full_pinned_history_20261111?.normalized_csv_sha256;
 const jpRaw=jp.actual_coverage?.cpi_headline?.raw_sha256;
 const exRaw=jp.actual_coverage?.cpi_ex_imputed_rent?.raw_sha256;
 const jpNorm=jp.actual_coverage?.metadata?.common_csv_sha256;
 const actual={
  shiller:assertHash(files.shiller,shillerPin,'Shiller extracted research raw'),
  fed:assertHash(files.fed,fxRaw,'Fed pinned H10 source raw'),
  cpi_headline:assertHash(files.cpi_headline,jpRaw,'e-Stat headline CPI raw'),
  cpi_ex_rent:assertHash(files.cpi_ex_rent,exRaw,'e-Stat ex-rent CPI raw'),
  fx_canonical:assertHash(files.fx_canonical,fxNorm,'Fed H10 canonical monthly CSV'),
  cpi_canonical:assertHash(files.cpi_canonical,jpNorm,'e-Stat canonical CPI CSV')
 };
 if(manifest.usd?.raw_sha256!==actual.shiller||manifest.fx?.raw_sha256!==actual.fed||manifest.cpi?.raw_sha256!==actual.cpi_headline)throw Error('Manifest receipt disagrees with verified source bytes');
 const shillerRaw=deriveShillerApproxUsdReturns(files.shiller,acquisition.verified_existing_research?.rows);
 const shillerPeriod=acquisition.verified_existing_research?.period;
 if(shillerPeriod!==shillerRaw.first_source_month+'/'+shillerRaw.last_source_month)throw Error('Shiller raw month boundary changed');
 const fxCanonical=canonicalRows(files.fx_canonical,{label:'Fed H10',allowedSeries:new Set(['FED_H10_USDJPY_MONTH_END'])});
 const cpiCanonical=canonicalRows(files.cpi_canonical,{label:'e-Stat CPI',allowedSeries:new Set(['JP_CPI_HEADLINE_2025_LINKED','JP_CPI_EX_RENT_2025_LINKED'])});
 const fxRows=[];for(const r of fxCanonical){
  requireMetadata(r,{series_id:'FED_H10_USDJPY_MONTH_END',unit:'JPY_PER_USD',currency:'JPY',series_kind:'FX_RATE',source_id:'FED_BOARD',origin:'OBSERVED',seasonal_adjustment:'NOT_APPLICABLE',raw_response_sha256:actual.fed},'Fed H10');
  fxRows.push({month:r.month,value:Number(r.value),month_status:'COMPLETE_OBSERVED'});
 }
 ensureSortedContinuous(fxRows,'Fed H10',fx.full_pinned_history_20261111?.monthly_first,fx.full_pinned_history_20261111?.monthly_last_complete,fx.full_pinned_history_20261111?.monthly_observed_complete);
 const cpiRows=[];let exRentCount=0;
 for(const r of cpiCanonical){
  const headline=r.series_id==='JP_CPI_HEADLINE_2025_LINKED';
  requireMetadata(r,{unit:'INDEX_2025_100',currency:'NOT_APPLICABLE',series_kind:'CPI_LEVEL',origin:'OBSERVED',source_id:'ESTAT',seasonal_adjustment:'NSA',raw_response_sha256:headline?actual.cpi_headline:actual.cpi_ex_rent},'e-Stat CPI');
  if(headline)cpiRows.push({month:r.month,value:Number(r.value)});else exRentCount++;
 }
 if(exRentCount!==jp.actual_coverage?.cpi_ex_imputed_rent?.months)throw Error('Ex-rent CPI canonical coverage incomplete');
 ensureSortedContinuous(cpiRows,'headline CPI',jp.actual_coverage?.cpi_headline?.first_month,jp.actual_coverage?.cpi_headline?.last_month,jp.actual_coverage?.cpi_headline?.months);
 const market=preparePrivateShillerJpyResearch({usd_monthly_returns:shillerRaw.usd_monthly_returns,fx_monthly_levels:fxRows,jp_cpi_monthly_levels:cpiRows,manifest,source_registry:registry});
 return {market,proof:{all_six_pinned_byte_hashes_matched:true,shiller_recalculated_from_raw:true,
     fed_and_estat_normalized_csv_exact_sha:true,raw_to_canonical_normalization_independently_recomputed:false,
     shiller_rows:shillerRaw.source_rows,usd_approx_return_rows:shillerRaw.usd_monthly_returns.length,
     fed_monthly_levels:fxRows.length,jp_headline_cpi_levels:cpiRows.length,
     jp_ex_rent_cpi_levels:exRentCount,verified_files:FILES}};
}
function buildPrivateReport({source_registry,manifest,files,plan=null,registry_file_sha256=null}){
 const {market,proof}=reconcilePrivateSources({source_registry,manifest,files});
 const first=market.market_rows[0]?.month,last=market.market_rows.at(-1)?.month;
 const coverage=[120,240,360].map(n=>({horizon_months:n,complete_windows:countCompleteWindows(market.market_rows,n)}));
 const response={schema:'ANALYTICS_PRIVATE_HANDOFF_V0_9',status:'PRIVATE_DATA_RECONCILED_RESEARCH_ONLY',
  provenance_verified_from_supplied_bytes:true,source_origin_independently_verified:false,
  data_qa_passed_at_this_boundary:true,publication_approved:false,source_rights_approved:false,
  is_investable_total_return:false,model_is_approximate:true,fx_source_change_adr_approved:false,
  distribution:'PRIVATE_REPORT_ONLY',pinned_registry_bytes_sha256:registry_file_sha256,
  input_proof:proof,markets:{first_return_month:first,last_return_month:last,
   complete_jpy_nominal_months:market.market_rows.length,gap_boundaries:market.gap_boundaries,
   excluded_months:market.excluded_months,coverage},model_tests:[]};
 if(plan!==null){
   const obj=requireObject(plan,'private research plan');
   const allowed=new Set(['portfolio','cashflow_plan','horizons_months']);
   for(const k of Object.keys(obj))if(!allowed.has(k))throw Error('Unsupported private plan field '+k);
   const portfolio=requireObject(obj.portfolio,'portfolio');
   if(Object.keys(portfolio.initial_holdings_yen??{}).join('|')!=='US_EQUITY'||Object.keys(portfolio.target_weights??{}).join('|')!=='US_EQUITY'||portfolio.target_weights.US_EQUITY!==1)throw Error('Only a one-asset Shiller approximation is available for observed portfolio analysis');
   if(!Array.isArray(obj.horizons_months)||obj.horizons_months.length<1||obj.horizons_months.length>3||new Set(obj.horizons_months).size!==obj.horizons_months.length||obj.horizons_months.some(h=>![120,240,360].includes(h)))throw Error('Allowed horizons_months are unique 120,240,360');
   for(const h of obj.horizons_months){
    const result=runRollingPortfolioLifecycle({monthly_market_returns:market.market_rows,horizon_months:h,market_mode:'OBSERVED_RESEARCH',portfolio,cashflow_plan:obj.cashflow_plan});
    response.model_tests.push({horizon_months:h,status:result.status,complete_windows:result.complete_windows,
      excluded_windows_due_to_missing_months:result.excluded_windows_due_to_missing_months,
      funded_windows:result.funded_windows,shortfall_windows:result.shortfall_windows,
      historical_funded_fraction:result.historical_funded_fraction,
      note:'Overlapping historical starts, not independent outcomes or predictive probabilities'});
   }
 }
 return response;
}
function countCompleteWindows(rows,h){
 let n=0,block=0;for(let i=0;i<=rows.length;i++){
  if(i<rows.length&&i>0&&monthSerial(rows[i].month)===monthSerial(rows[i-1].month)+1)continue;
  n+=Math.max(0,i-block-h+1);block=i;
 }return n;
}
module.exports={FILES,sha256,reconcilePrivateSources,buildPrivateReport,countCompleteWindows};
