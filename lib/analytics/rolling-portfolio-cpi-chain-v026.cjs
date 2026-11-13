'use strict';
/** Strict as-of, chain-linked CPI living expenses; handles verified basis change dates.
 * Does NOT claim to authenticate the submitted historical vintage data or release dates.
 */
const {buildRelativeMonthlyCashflows,validateMarketSeries}=require('./rolling-portfolio-lifecycle.cjs');
const {simulatePortfolio,validateInput}=require('./portfolio-core.cjs');
const {auditPortfolioAgainstInputs}=require('./portfolio-input-audit.cjs');
const {validateHistoricalCpiVintages,settlementDate,latestReleasedBefore,getLatestEligibleLevel}=require('./cpi-historical-release-contract-v026.cjs');
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const MAX_YEN=1_000_000_000_000;
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
function yen(n){if(!Number.isFinite(n)||n<0||n>=MAX_YEN-.5)throw Error('Unsafe CPI-indexed expense');return Math.round(n);}
function add(a,b){const x=a+b;if(!Number.isSafeInteger(x)||x>MAX_YEN)throw Error('Overflow in expense or turnover');return x;}
function runRollingPortfolioCpiHistoricalChain({monthly_market_returns,cpi_vintage_snapshots,horizon_months,portfolio,cashflow_plan,market_mode='SYNTHETIC_DEMO',cashflow_timing='MONTH_START'}={}){
 if(!['MONTH_START','MONTH_END'].includes(cashflow_timing))throw Error('Invalid cashflow_timing');
 if(!Number.isInteger(horizon_months)||horizon_months<1||horizon_months>1200)throw Error('Invalid horizon_months');
 if(!obj(cashflow_plan)||own(cashflow_plan,'annual_expense_inflation'))throw Error('CPI mode forbids fixed annual expense inflation');
 if(!obj(portfolio)||Object.keys(portfolio).some(k=>!['initial_holdings_yen','target_weights','rebalance'].includes(k)))throw Error('Invalid portfolio');
 const plan=buildRelativeMonthlyCashflows(cashflow_plan,horizon_months);
 const market=validateMarketSeries(monthly_market_returns,portfolio,market_mode);
 const release=validateHistoricalCpiVintages(cpi_vintage_snapshots,market_mode);
 validateInput({...portfolio,monthly_returns:[monthly_market_returns[0]],monthly_cashflows:[{month:monthly_market_returns[0].month,contribution_yen:plan[0].contribution_yen,withdrawal_yen:plan[0].withdrawal_yen}],cashflow_timing,market_mode});
 const settlement=monthly_market_returns.map(r=>settlementDate(r.month,cashflow_timing));
 const vintages=settlement.map(date=>latestReleasedBefore(release.snapshots,date));
 const refs=monthly_market_returns.map((r,i)=>vintages[i]?getLatestEligibleLevel(vintages[i],r.month,cashflow_timing):null);
 const windows=[];let block=0,validMarketWindows=0,missingRelease=0,missingOverlap=0,regressingCpi=0;
 for(let end=1;end<=monthly_market_returns.length;end++){
  if(end<monthly_market_returns.length&&market.positions[end]===market.positions[end-1]+1)continue;
  for(let start=block;start+horizon_months<=end;start++){
   validMarketWindows++;
   if(!vintages[start]||!refs[start]){missingRelease++;continue;}
   let previousRef=null,relative=1,reason=null,lastExpense=0,transitions=0;
   const schedule=[];
   for(let k=0;k<horizon_months;k++){
    const at=start+k,snap=vintages[at],current=refs[at];
    if(!snap||!current){reason='missing_release';break;}
    if(previousRef){
     if(current.month<previousRef){reason='regressed_reference';break;}
     const previousInCurrent=snap.byMonth.get(previousRef);
     if(previousInCurrent===undefined){reason='missing_overlap';break;}
     const factor=current.value/previousInCurrent;
     if(!(factor>0&&Number.isFinite(factor))){reason='missing_overlap';break;}
     relative*=factor;
     if(!Number.isFinite(relative)||relative>MAX_YEN){throw Error('Unsafe cumulative CPI chain multiplier');}
     if(snap.series_id!==vintages[at-1].series_id)transitions++;
    }
    const expense=yen(plan[k].breakdown.living_expense_yen*relative);
    lastExpense=expense;
    schedule.push({month:monthly_market_returns[at].month,contribution_yen:plan[k].contribution_yen,
     withdrawal_yen:add(expense,plan[k].breakdown.one_time_expense_yen)});
    previousRef=current.month;
   }
   if(reason){if(reason==='missing_release')missingRelease++;else if(reason==='missing_overlap')missingOverlap++;else regressingCpi++;continue;}
   const selected=monthly_market_returns.slice(start,start+horizon_months);
   const inputs={...portfolio,monthly_returns:selected,monthly_cashflows:schedule,market_mode,cashflow_timing};
   const sim=simulatePortfolio(inputs);auditPortfolioAgainstInputs(inputs,sim);
   const shortage=sim.rows.findIndex(x=>x.unfunded_yen>0);
   windows.push({market_start_month:selected[0].month,market_end_month:selected.at(-1).month,
    first_settlement_date:settlement[start],last_settlement_date:settlement[start+horizon_months-1],
    initial_index_reference_month:refs[start].month,last_index_reference_month:previousRef,
    first_cpi_basis_year:vintages[start].basis_year,last_cpi_basis_year:vintages[start+horizon_months-1].basis_year,
    base_transition_count:transitions,first_cpi_release:vintages[start].vintage_id,last_cpi_release:vintages[start+horizon_months-1].vintage_id,
    first_living_expense_yen:plan[0].breakdown.living_expense_yen,last_living_expense_yen:lastExpense,
    ending_assets_yen:sim.ending_assets_yen,status:sim.status,total_unfunded_yen:sim.total_unfunded_yen,
    shortfall_months:sim.shortfall_months,first_shortfall_offset_months:shortage<0?null:shortage,
    rebalance_count:sim.rows.filter(r=>r.rebalance_executed).length,
    total_turnover_yen:sim.rows.reduce((n,r)=>add(n,r.rebalance_turnover_yen),0)});
  }
  block=end;
 }
 const theoretical=Math.max(0,market.positions.at(-1)-market.positions[0]-horizon_months+2);
 const funded=windows.filter(w=>w.status==='FUNDED').length;
 return {status:windows.length?'EVALUATED':'INSUFFICIENT_HISTORICAL_VINTAGES',market_mode,cashflow_timing,horizon_months,
  policy:'ASOF_CHAIN_LINK_LATEST_RELEASE_STRICT_PREVIOUS_CALENDAR_DAY',historical_first_release_policy_verified:true,
  actual_individual_release_dates_verified:false,source_snapshot_bytes_authenticated_here:false,
  publication_approved:false,rights_approved:false,
  old_base_series_silently_replaced:false,uses_current_2025_base_for_pre_2026_vintages:false,
  formula:'for each step CPI(current_observation/current_release) / CPI(previous_observation/current_release); multiply step factors; never directly ratio across bases',
  price_index_release_time_precision:'DATE_ONLY_NO_INTRADAY',historical_funded_fraction:null,
  descriptive_fraction_of_unverified_observed_candidates:market_mode==='OBSERVED_RESEARCH'&&windows.length?funded/windows.length:null,
  overlapping_windows_not_independent:true,future_probability_claim:false,
  theoretical_calendar_windows:theoretical,complete_market_windows:validMarketWindows,
  excluded_market_gap_windows:theoretical-validMarketWindows,
  excluded_no_published_release:missingRelease,excluded_no_overlap:missingOverlap,
  excluded_regressing_reference:regressingCpi,complete_windows:windows.length,funded_windows:funded,
  shortfall_windows:windows.length-funded,windows};
}
module.exports={runRollingPortfolioCpiHistoricalChain};
