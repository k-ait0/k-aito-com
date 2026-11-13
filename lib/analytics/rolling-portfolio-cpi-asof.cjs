'use strict';
/** v0.25: unpublished CPI cannot affect a cashflow; no implicit reconstructed vintages. */
const {buildRelativeMonthlyCashflows,validateMarketSeries}=require('./rolling-portfolio-lifecycle.cjs');
const {simulatePortfolio,validateInput}=require('./portfolio-core.cjs');
const {auditPortfolioAgainstInputs}=require('./portfolio-input-audit.cjs');
const {settlementDate,validateCpiVintageSnapshots,latestReleasedBefore,getLatestEligibleLevel}=require('./cpi-published-vintages.cjs');
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const MAX_YEN=1_000_000_000_000;
function yen(n){if(!Number.isFinite(n)||n<0||n>MAX_YEN-.5)throw Error('Unsafe CPI-adjusted living expense');return Math.round(n);}
function sum(a,b){if(!Number.isSafeInteger(a+b)||a+b>MAX_YEN)throw Error('CPI cashflow amount overflow');return a+b;}
function runRollingPortfolioCpiAsOf({monthly_market_returns,cpi_vintage_snapshots,horizon_months,portfolio,cashflow_plan,market_mode='SYNTHETIC_DEMO',cashflow_timing='MONTH_START'}={}){
 if(!['MONTH_START','MONTH_END'].includes(cashflow_timing))throw Error('Invalid cashflow_timing');
 if(!Number.isInteger(horizon_months)||horizon_months<1||horizon_months>1200)throw Error('Invalid horizon_months');
 if(!object(cashflow_plan)||own(cashflow_plan,'annual_expense_inflation'))throw Error('CPI vintage mode forbids fixed annual expense inflation');
 if(!object(portfolio)||Object.keys(portfolio).some(k=>!['initial_holdings_yen','target_weights','rebalance'].includes(k)))throw Error('Invalid portfolio policy');
 const plan=buildRelativeMonthlyCashflows(cashflow_plan,horizon_months);
 const market=validateMarketSeries(monthly_market_returns,portfolio,market_mode);
 const vintages=validateCpiVintageSnapshots(cpi_vintage_snapshots,market_mode);
 validateInput({...portfolio,monthly_returns:[monthly_market_returns[0]],monthly_cashflows:[{month:monthly_market_returns[0].month,contribution_yen:plan[0].contribution_yen,withdrawal_yen:plan[0].withdrawal_yen}],cashflow_timing,market_mode});
 const settlement=monthly_market_returns.map(r=>settlementDate(r.month,cashflow_timing));
 const snapshots=settlement.map(d=>latestReleasedBefore(vintages.snapshots,d));
 const references=monthly_market_returns.map((r,i)=>snapshots[i]?getLatestEligibleLevel(snapshots[i],r.month,cashflow_timing):null);
 const windows=[];let startBlock=0,marketWindows=0,skippedUnavailable=0,skippedBaseline=0;
 for(let end=1;end<=monthly_market_returns.length;end++){
  if(end<monthly_market_returns.length&&market.positions[end]===market.positions[end-1]+1)continue;
  for(let start=startBlock;start+horizon_months<=end;start++){
   marketWindows++;
   // The first *published and eligible* observation anchors the living expense
   // in this rolling window. Each future month's ratio comes entirely from ONE
   // snapshot, avoiding level/base mixing across different published vintages.
   if(!references[start]){skippedUnavailable++;continue;}
   const baseline=references[start].month;
   const schedule=[];let reason=null;
   for(let k=0;k<horizon_months;k++){
    const i=start+k,s=snapshots[i],ref=references[i];
    if(!s||!ref){reason='unavailable';break;}
    const baseAtThisVintage=s.byMonth.get(baseline);
    if(baseAtThisVintage===undefined){reason='baseline';break;}
    const expense=yen(plan[k].breakdown.living_expense_yen*ref.value/baseAtThisVintage);
    schedule.push({month:monthly_market_returns[i].month,contribution_yen:plan[k].contribution_yen,
      withdrawal_yen:sum(expense,plan[k].breakdown.one_time_expense_yen)});
   }
   if(reason){if(reason==='unavailable')skippedUnavailable++;else skippedBaseline++;continue;}
   const selected=monthly_market_returns.slice(start,start+horizon_months);
   const inputs={...portfolio,monthly_returns:selected,monthly_cashflows:schedule,market_mode,cashflow_timing};
   const sim=simulatePortfolio(inputs);
   auditPortfolioAgainstInputs(inputs,sim);
   const first=sim.rows.findIndex(x=>x.unfunded_yen>0);
   const endingRef=references[start+horizon_months-1];
   windows.push({market_start_month:selected[0].month,market_end_month:selected.at(-1).month,
     first_settlement_date:settlement[start],last_settlement_date:settlement[start+horizon_months-1],
     baseline_cpi_observation_month:baseline,first_published_vintage:snapshots[start].vintage_id,
     last_published_vintage:snapshots[start+horizon_months-1].vintage_id,
     last_used_cpi_observation_month:endingRef.month,
     first_living_expense_yen:plan[0].breakdown.living_expense_yen,
     final_living_expense_yen:schedule.at(-1).withdrawal_yen-plan.at(-1).breakdown.one_time_expense_yen,
     ending_assets_yen:sim.ending_assets_yen,status:sim.status,total_unfunded_yen:sim.total_unfunded_yen,
     shortfall_months:sim.shortfall_months,first_shortfall_offset_months:first<0?null:first,
     rebalance_count:sim.rows.filter(r=>r.rebalance_executed).length,
     total_turnover_yen:sim.rows.reduce((a,r)=>sum(a,r.rebalance_turnover_yen),0)});
  }
  startBlock=end;
 }
 const theoretical=Math.max(0,market.positions.at(-1)-market.positions[0]-horizon_months+2);
 const funded=windows.filter(x=>x.status==='FUNDED').length;
 return {status:windows.length?'EVALUATED':'INSUFFICIENT_PUBLISHED_CPI_VINTAGES',
  market_mode,cashflow_timing,horizon_months,publication_approved:false,source_rights_approved:false,
  cpi_asof_policy:'PUBLISHED_VINTAGE_STRICT_PRIOR_CALENDAR_DAY',
  cpi_vintage_metadata_source:vintages.source_provenance,cpi_source_archive_authenticated_here:false,
  recorded_release_date_precision:'DATE_ONLY_NO_INTRADAY_TIME',
  historical_original_vintage_evidence_required_for_real_world_no_lookahead_claim:true,
  no_lookahead_of_supplied_publication_schedule:true,actual_release_dates_independently_verified:false,
  reported_market_returns_provenance:market_mode==='SYNTHETIC_DEMO'?'SYNTHETIC':'USER_ASSERTED_OBSERVED_UNVERIFIED',
  inflation_formula:'latest CPI observed in snapshot published BEFORE cashflow date / baseline month CPI from SAME snapshot',
  cashflow_rule:'MONTH_START first calendar day; MONTH_END last calendar day. Same-day releases excluded.',
  theoretical_windows_if_no_market_gaps:theoretical,complete_market_windows:marketWindows,
  excluded_due_to_missing_market_months:theoretical-marketWindows,
  excluded_due_to_no_published_cpi:skippedUnavailable,excluded_due_to_missing_baseline_in_vintage:skippedBaseline,
  complete_windows:windows.length,funded_windows:funded,shortfall_windows:windows.length-funded,
  synthetic_funded_fraction:market_mode==='SYNTHETIC_DEMO'&&windows.length?funded/windows.length:null,
  historical_funded_fraction:null, // Not independently authenticated; never label unverified vintage inputs as verified history.
  unverified_observed_candidate_funded_fraction:market_mode==='OBSERVED_RESEARCH'&&windows.length?funded/windows.length:null,
  interpretation:'Overlapping windows are not independent; historical descriptive shares are not future probabilities.',
  windows};
}
module.exports={runRollingPortfolioCpiAsOf};
