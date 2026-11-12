'use strict';
/**
 * v0.22 - historical initial withdrawal ceiling, RESEARCH_CANDIDATE ONLY.
 * A ceiling is specific to each observed, overlapping historical start window.
 * It is not a future safe withdrawal rate or an investable TR benchmark.
 */
const X=require('./public-shiller-withdrawal-stress-v21.cjs');
const crypto=require('node:crypto');
const R=require('./private-shiller-recovery.cjs');
const INITIAL_UNITS=100000;
// 1 unit is 0.1bp = 0.001% of initial capital per month.
const UNITS_PER_100_PERCENT=100000;
const HORIZONS=Object.freeze([120,240,360]);
const MODES=Object.freeze(['FIXED_NOMINAL','US_CPI_LAG_2_MONTHS']);
function int(x,name,min,max){if(!Number.isSafeInteger(x)||x<min||x>max)throw Error('Invalid '+name);return x;}
function index(rows,mode,start,k){return mode===MODES[0]?1:rows[k-2].cpi/rows[start-2].cpi;}
function rawRun(rows,start,months,rateTenthsBp,mode,capital){
 const base=capital*rateTenthsBp/UNITS_PER_100_PERCENT;
 let balance=capital,firstShortfall=null,requestedTotal=0,paidTotal=0,unfundedTotal=0;
 for(let k=start;k<start+months;k++){
  const factor=(rows[k].price+rows[k].dividend/12)/rows[k-1].price;
  const adjustment=index(rows,mode,start,k);
  if(!(factor>0&&factor<=10&&Number.isFinite(factor)))throw Error('Invalid market factor');
  if(!(adjustment>0&&adjustment<=1000&&Number.isFinite(adjustment)))throw Error('Invalid CPI factor');
  const due=Math.round(base*adjustment);
  if(!Number.isSafeInteger(due)||due<0)throw Error('Unsafe withdrawal');
  const paid=Math.min(balance,due),unfunded=due-paid;
  if(unfunded>0&&firstShortfall===null)firstShortfall=rows[k].month;
  requestedTotal+=due;paidTotal+=paid;unfundedTotal+=unfunded;
  balance=Math.round((balance-paid)*factor);
  if(![balance,requestedTotal,paidTotal,unfundedTotal].every(Number.isSafeInteger))throw Error('Unsafe wealth arithmetic');
 }
 return {funded:firstShortfall===null,ending_units:balance,first_shortfall_month:firstShortfall,
   total_unfunded_units:unfundedTotal,total_requested_units:requestedTotal,total_paid_units:paidTotal};
}
function checkedRun(rows,start,months,rateTenthsBp,mode,capital=INITIAL_UNITS){
 const v=X.validateRows(rows);
 checkParams(v,start,months,rateTenthsBp,mode,capital);
 return rawRun(v,start,months,rateTenthsBp,mode,capital);
}
function checkParams(rows,start,months,rate,mode,capital){
 int(start,'start',2,rows.length-1);int(months,'months',2,1200);
 if(start+months>rows.length)throw Error('Window exceeds source history');
 int(rate,'tenths of basis point',0,UNITS_PER_100_PERCENT);
 int(capital,'initial capital',1,1000000000);
 if(!MODES.includes(mode))throw Error('Unknown expense mode');
}
function boundaryValidated(rows,start,months,mode,capital=INITIAL_UNITS){
 checkParams(rows,start,months,0,mode,capital);
 if(!rawRun(rows,start,months,0,mode,capital).funded)throw Error('Zero-withdrawal failure');
 if(rawRun(rows,start,months,UNITS_PER_100_PERCENT,mode,capital).funded)throw Error('Boundary cap not sufficient');
 let low=0,high=UNITS_PER_100_PERCENT-1;
 while(low<high){
  const mid=Math.floor((low+high+1)/2);
  if(rawRun(rows,start,months,mid,mode,capital).funded)low=mid;else high=mid-1;
 }
 // Prove transition at the discovered historical boundary (does not assume smooth returns).
 if(!rawRun(rows,start,months,low,mode,capital).funded||
    rawRun(rows,start,months,low+1,mode,capital).funded)throw Error('Non-monotone or unverified rate boundary');
 return low;
}
function maxFundedRate(rows,start,months,mode,capital=INITIAL_UNITS){
 const v=X.validateRows(rows);
 return boundaryValidated(v,start,months,mode,capital);
}
function percentile(sorted,p){if(!sorted.length)throw Error('No observations');if(!(p>0&&p<=1))throw Error('Invalid percentile');return sorted[Math.ceil(sorted.length*p)-1];}
function med(sorted){if(!sorted.length)throw Error('No observations');const m=sorted.length>>1;return sorted.length%2?sorted[m]:(sorted[m-1]+sorted[m])/2;}
function stats(values){const ordered=values.slice().sort((a,b)=>a-b);return {
  minimum:ordered[0],p10_nearest_rank:percentile(ordered,0.1),median:med(ordered),p90_nearest_rank:percentile(ordered,0.9),maximum:ordered.at(-1)
 };}
function compare(rows,{horizons=HORIZONS,capital=INITIAL_UNITS}={}){
 const validated=X.validateRows(rows);int(capital,'initial capital',1,1000000000);
 if(!Array.isArray(horizons)||!horizons.length||new Set(horizons).size!==horizons.length)throw Error('Invalid horizon list');
 const horizonReports=[];
 for(const horizon of horizons){
  int(horizon,'horizon',2,1200);
  const cases=[];
  for(let start=2;start+horizon<=validated.length;start++){
   const fixed=boundaryValidated(validated,start,horizon,MODES[0],capital);
   const indexed=boundaryValidated(validated,start,horizon,MODES[1],capital);
   cases.push({start_month:validated[start].month,fixed,indexed,difference:fixed-indexed});
  }
  if(!cases.length)continue;
  const pairedDeltas=cases.map(c=>c.difference),sF=stats(cases.map(c=>c.fixed)),sI=stats(cases.map(c=>c.indexed)),sD=stats(pairedDeltas);
  const worstF=cases.reduce((a,b)=>a.fixed<=b.fixed?a:b),worstI=cases.reduce((a,b)=>a.indexed<=b.indexed?a:b);
  horizonReports.push({horizon_months:horizon,complete_overlapping_windows:cases.length,
   first_start:cases[0].start_month,last_start:cases.at(-1).start_month,
   fixed_nominal_ceiling_tenth_bps:sF,cpi_indexed_ceiling_tenth_bps:sI,
   paired_fixed_minus_cpi_ceiling_tenth_bps:sD,
   paired_starts_fixed_greater:cases.filter(c=>c.difference>0).length,
   paired_starts_equal:cases.filter(c=>c.difference===0).length,
   paired_starts_cpi_greater:cases.filter(c=>c.difference<0).length,
   most_restrictive_fixed_start:worstF.start_month,
   most_restrictive_cpi_start:worstI.start_month,
   historical_funded_at_0_30pct_monthly_fixed:cases.filter(c=>c.fixed>=300).length,
   historical_funded_at_0_30pct_monthly_cpi:cases.filter(c=>c.indexed>=300).length,
   historical_funded_at_0_50pct_monthly_fixed:cases.filter(c=>c.fixed>=500).length,
   historical_funded_at_0_50pct_monthly_cpi:cases.filter(c=>c.indexed>=500).length,
   historical_funded_at_1_00pct_monthly_fixed:cases.filter(c=>c.fixed>=1000).length,
   historical_funded_at_1_00pct_monthly_cpi:cases.filter(c=>c.indexed>=1000).length});
 }
 return {schema:'ANALYTICS_SHILLER_CANDIDATE_WITHDRAWAL_BOUNDARY_V022',status:'PUBLIC_SOURCE_HISTORICAL_RESEARCH_ONLY',
  observation_quality:'OBSERVED_MONTHLY_AVERAGE_PRICE_AND_ANNUALIZED_DIVIDEND; DERIVED_APPROX_RETURN',
  source_rows:validated.length,source_first_month:validated[0].month,source_last_month:validated.at(-1).month,
  initial_units:capital,rate_step:'0.1 BASIS POINT (0.001% of initial assets PER MONTH)',
  rate_100_percent_tenth_bps:UNITS_PER_100_PERCENT,
  experiment:'WITHDRAW_AT_MONTH_START_THEN_APPLY_APPROX_MONTHLY_USD_MARKET_RETURN',
  us_cpi_assumption:'CPI_OBSERVED_2_MONTH_LAG_ILLUSTRATIVE',
  matched_start_months:true,overlapping_starts_not_independent:true,
  exclude_tax_fees_fx_pension:true,cpi_is_us_not_jp:true,official_total_return:false,
  forward_probability_not_estimated:true,publication_approved:false,
  private_legacy_source_sha_matched:false,horizons:horizonReports};
}
function analyzePinnedRaw(raw){
 if(!Buffer.isBuffer(raw)||R.gitBlob(raw)!==R.UPSTREAM_GIT_BLOB)throw Error('Published source Git blob SHA mismatch');
 return {...compare(R.parsedUpstream(raw)),source_repository:'datasets/s-and-p-500',
  source_commit:R.UPSTREAM_COMMIT,source_git_blob_sha1:R.UPSTREAM_GIT_BLOB,
  source_sha256:crypto.createHash('sha256').update(raw).digest('hex')};
}
module.exports={INITIAL_UNITS,UNITS_PER_100_PERCENT,HORIZONS,MODES,rawRun,checkedRun,boundaryValidated,maxFundedRate,compare,analyzePinnedRaw};
