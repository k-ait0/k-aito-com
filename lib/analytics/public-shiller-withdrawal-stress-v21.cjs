'use strict';
/**
 * v0.21: AUDITABLE OBSERVATIONAL STRESS STUDY, NOT AN INVESTABLE TOTAL-RETURN BACKTEST.
 * Distinct from validated historical market inputs. Never marks approximated returns as OBSERVED.
 * USD-numbered units, not JPY; no FX, taxes, fees, interest, or contributions.
 */
const crypto=require('node:crypto');
const R=require('./private-shiller-recovery.cjs');
const HORIZONS=Object.freeze([120,240,360]);
const WITHDRAWAL_BPS=Object.freeze([25,30,50,100]); // 0.25%, 0.30%, 0.50%, 1.00% of initial capital per month
const CAPITAL=100000;
const KEY='SHILLER_PUBLIC_CANDIDATE_WITHDRAWAL_STRESS_V021';
const ROUND=n=>Number(n.toFixed(8));
const median=arr=>{if(!arr.length)throw Error('Empty median');const a=arr.slice().sort((x,y)=>x-y);const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function validateRows(rows,{minRows=4}={}){
 if(!Array.isArray(rows)||rows.length<minRows||rows.length>1500)throw Error('Invalid monthly historical source');
 let prev=null;
 return rows.map((r,i)=>{
  if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.month!=='string'||!/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(r.month))throw Error('Invalid month');
  for(const k of Object.keys(r))if(!['month','price','dividend','cpi'].includes(k))throw Error('Unexpected source field: '+k);
  const serial=Number(r.month.slice(0,4))*12+Number(r.month.slice(5,7))-1;
  if(prev!==null&&serial!==prev+1)throw Error('Gap/repeated month');prev=serial;
  const price=Number(r.price),div=Number(r.dividend),cpi=Number(r.cpi);
  if(![price,div,cpi].every(Number.isFinite)||price<=0||div<0||cpi<=0||[price,div,cpi].some(x=>x>1e9))throw Error('Invalid price/dividend/CPI');
  return {month:r.month,price,dividend:div,cpi};
 });
}
function runWindow(rows, start, months, withdrawalBps, mode, capital=CAPITAL){
 if(!Number.isSafeInteger(capital)||capital<=0||capital>1e9)throw Error('Bad initial capital');
 if(!Number.isInteger(start)||start<2||!Number.isInteger(months)||months<1||start+months>rows.length)throw Error('Bad window');
 if(!Number.isSafeInteger(withdrawalBps)||withdrawalBps<0||withdrawalBps>10000)throw Error('Bad withdrawal bps');
 if(!['FIXED_NOMINAL','US_CPI_LAG_2_MONTHS'].includes(mode))throw Error('Unsupported expense mode');
 const baseCpi=rows[start-2].cpi;
 let wealth=capital,shortfallMonth=null,shortfallTotal=0,paidTotal=0,requestedTotal=0;
 for(let i=start;i<start+months;i++){
  const current=rows[i],prev=rows[i-1];
  const factor=(current.price+current.dividend/12)/prev.price;
  if(!Number.isFinite(factor)||factor<=0||factor>10)throw Error('Unreasonable approximate return factor');
  const expenseMultiplier=mode==='FIXED_NOMINAL'?1:rows[i-2].cpi/baseCpi;
  if(!Number.isFinite(expenseMultiplier)||expenseMultiplier<=0||expenseMultiplier>1000)throw Error('Bad CPI index multiplier');
  const requested=Math.round(capital*withdrawalBps/10000*expenseMultiplier);
  if(!Number.isSafeInteger(requested)||requested<0)throw Error('Unsafe expenses');
  const paid=Math.min(wealth,requested);
  const shortfall=requested-paid;
  if(shortfall>0&&shortfallMonth===null)shortfallMonth=current.month;
  shortfallTotal+=shortfall;paidTotal+=paid;requestedTotal+=requested;
  wealth=Math.round((wealth-paid)*factor);
  if(![wealth,shortfallTotal,paidTotal,requestedTotal].every(Number.isSafeInteger))throw Error('Unsafe wealth arithmetic');
 }
 return {funded:shortfallMonth===null,ending_units:wealth,first_shortfall_month:shortfallMonth,
   total_unfunded_units:shortfallTotal,total_paid_units:paidTotal,total_requested_units:requestedTotal};
}
function summarize(rows,{horizons=HORIZONS,withdrawalBps=WITHDRAWAL_BPS,capital=CAPITAL}={}){
 const validated=validateRows(rows);
 if(!Array.isArray(horizons)||horizons.length<1||new Set(horizons).size!==horizons.length)throw Error('Bad horizons');
 if(!Array.isArray(withdrawalBps)||withdrawalBps.length<1||new Set(withdrawalBps).size!==withdrawalBps.length)throw Error('Bad withdrawal rates');
 const summaries=[];
 for(const horizon of horizons){
  if(!Number.isInteger(horizon)||horizon<1||horizon>1200)throw Error('Bad horizon');
  for(const bps of withdrawalBps){
   for(const mode of ['FIXED_NOMINAL','US_CPI_LAG_2_MONTHS']){
    const windows=[];
    // start>=2: CPI[t-2] available. Same exact start months in both expense models.
    for(let start=2;start+horizon<=validated.length;start++){
      const z=runWindow(validated,start,horizon,bps,mode,capital);
      windows.push({start_month:validated[start].month,ending_units:z.ending_units,
       funded:z.funded,shortfall_units:z.total_unfunded_units,first_shortfall_month:z.first_shortfall_month});
    }
    if(!windows.length)continue;
    const paid=windows.filter(w=>w.funded).length;
    const medianEnding=median(windows.map(w=>w.ending_units));
    const sortedByEnd=windows.slice().sort((a,b)=>a.ending_units-b.ending_units||a.start_month.localeCompare(b.start_month));
    const worstShortfall=windows.slice().sort((a,b)=>b.shortfall_units-a.shortfall_units||a.start_month.localeCompare(b.start_month))[0];
    summaries.push({horizon_months:horizon,monthly_initial_withdrawal_bps:bps,
      monthly_initial_withdrawal_pct:ROUND(bps/100),expense_model:mode,
      complete_overlapping_windows:windows.length,first_start:windows[0].start_month,last_start:windows.at(-1).start_month,
      fully_funded_windows:paid,unfunded_windows:windows.length-paid,
      historical_funded_share_descriptive_only:ROUND(paid/windows.length),
      minimum_ending_units:sortedByEnd[0].ending_units,minimum_ending_start:sortedByEnd[0].start_month,
      median_ending_units:medianEnding,maximum_ending_units:sortedByEnd.at(-1).ending_units,
      maximum_unfunded_units_in_single_window:worstShortfall.shortfall_units,maximum_unfunded_start:worstShortfall.start_month});
   }
  }
 }
 return {schema:KEY,status:'PUBLISHED_SOURCE_RESEARCH_CANDIDATE_NOT_PINNED_LEGACY_QA',
   return_quality:'DERIVED_APPROX_PRICE_AND_ANNUAL_DIVIDEND_FROM_MONTHLY_AVERAGES',
   labels:['US_DOLLAR_DENOMINATED_UNITS','USD_ONLY_NOT_JPY','NOT_SP500_TOTAL_RETURN','NOT_INVESTABLE_EXECUTION','OVERLAPPING_WINDOWS_NOT_PROBABILITIES'],
   source_rows:validated.length,source_first_month:validated[0].month,source_last_month:validated.at(-1).month,
   initial_capital_units:capital,withdrawal_timing:'AT_WINDOW_MONTH_START_THEN_APPROX_MARKET_RETURN',
   expense_cpi_model:'US_CPI_TWO_MONTH_LAG_ILLUSTRATIVE_RELEASE_CALENDAR_NOT_REPLAYED',
   inflation_indexed_withdrawal_is_not_japan_cpi:true,fx_applied:false,transaction_costs_included:false,
   taxes_included:false,pension_income_included:false,publication_approved:false,
   study_parameters:{horizons_months:horizons,withdrawal_rates_bps:withdrawalBps,paired_starts_only:true},summaries};
}
function analyzePinnedRaw(raw){
 if(!Buffer.isBuffer(raw)||R.gitBlob(raw)!==R.UPSTREAM_GIT_BLOB)throw Error('Pinned public Git blob mismatch');
 const report=summarize(R.parsedUpstream(raw));
 return {...report,source_repo:'datasets/s-and-p-500',source_commit:R.UPSTREAM_COMMIT,
   source_git_blob_sha1:R.UPSTREAM_GIT_BLOB,source_sha256:sha(raw),
   old_legacy_private_sha256:R.PINNED_SHILLER_SHA256,legacy_exact_matched:false};
}
module.exports={KEY,CAPITAL,HORIZONS,WITHDRAWAL_BPS,validateRows,runWindow,summarize,analyzePinnedRaw};
