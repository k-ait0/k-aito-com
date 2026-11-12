'use strict';
/**
 * K. Aito Analytics / FINOWA shared research cashflow core v0.1.
 * No network, browser, filesystem, tax or implicit market-data loading.
 * Monetary inputs and outputs are integer JPY. Research only; not production-approved.
 */
const MONTH_RE=/^(\d{4})-(0[1-9]|1[0-2])$/;
const MAX_MONTHS=1200;
function monthSerial(value){
  const match=typeof value==='string' && MONTH_RE.exec(value);
  if(!match)throw Error('Invalid month: expected YYYY-MM');
  return Number(match[1])*12+Number(match[2])-1;
}
function formatMonth(serial){
  if(!Number.isSafeInteger(serial)||serial<0||serial>9999*12+11)throw Error('Invalid month index');
  return String(Math.floor(serial/12)).padStart(4,'0')+'-'+String(serial%12+1).padStart(2,'0');
}
function yen(value,name){
  if(!Number.isSafeInteger(value)||value<0)throw Error(name+' must be a nonnegative safe integer (JPY)');
  return value;
}
function validateMonthlyReturns(monthlyReturns,origin,{allowGaps=false}={}){
  if(!['OBSERVED','SYNTHETIC'].includes(origin))throw Error('provenance must be OBSERVED or SYNTHETIC');
  if(!Array.isArray(monthlyReturns)||monthlyReturns.length<1||monthlyReturns.length>MAX_MONTHS)
    throw Error('monthly_returns must contain 1..'+MAX_MONTHS+' records');
  let previous=null;
  return monthlyReturns.map((r,i)=>{
    if(!r||typeof r!=='object'||Array.isArray(r))throw Error('Malformed return record at '+i);
    for(const key of Object.keys(r))
      if(!['month','origin','monthly_return','proxy','estimated'].includes(key))
        throw Error('Unsupported return record field: '+key);
    const serial=monthSerial(r.month);
    if(previous!==null&&(serial<=previous||(!allowGaps&&serial!==previous+1)))
      throw Error(serial<=previous?'Duplicate or out-of-order month: '+r.month:'Missing month before '+r.month);
    previous=serial;
    if(r.origin!==origin||
       (Object.prototype.hasOwnProperty.call(r,'proxy')&&r.proxy!==false)||
       (Object.prototype.hasOwnProperty.call(r,'estimated')&&r.estimated!==false))
      throw Error('Mixed, proxy or estimated return series is forbidden: '+r.month);
    if(typeof r.monthly_return!=='number'||!Number.isFinite(r.monthly_return)||r.monthly_return< -1||r.monthly_return>10)
      throw Error('Invalid monthly return: '+r.month);
    return {month:r.month,serial,rate:r.monthly_return};
  });
}
function safeRound(value,context){
  if(!Number.isFinite(value)||value<0||value>Number.MAX_SAFE_INTEGER-0.5)
    throw Error('Unsafe monetary result: '+context);
  return Math.round(value);
}
function simulateMonthlyCashflow({
  initial_assets_yen,monthly_withdrawal_yen,monthly_contribution_yen=0,
  monthly_returns,provenance='SYNTHETIC'
}){
  const opening=yen(initial_assets_yen,'initial_assets_yen');
  const withdrawal=yen(monthly_withdrawal_yen,'monthly_withdrawal_yen');
  const contribution=yen(monthly_contribution_yen,'monthly_contribution_yen');
  const returns=validateMonthlyReturns(monthly_returns,provenance);
  let assets=opening,totalUnfunded=0,firstShortfall=null,shortfallMonths=0;
  const rows=[];
  for(const r of returns){
    const available=safeRound(assets+contribution,'available '+r.month);
    const paid=Math.min(available,withdrawal);
    const unfunded=withdrawal-paid;
    const invested=available-paid;
    const closing=safeRound(invested*(1+r.rate),'closing '+r.month);
    if(unfunded>0){shortfallMonths++;if(firstShortfall===null)firstShortfall=r.month;}
    totalUnfunded=safeRound(totalUnfunded+unfunded,'unfunded total');
    rows.push({month:r.month,opening_yen:assets,contribution_yen:contribution,
      requested_withdrawal_yen:withdrawal,paid_withdrawal_yen:paid,unfunded_yen:unfunded,
      invested_before_return_yen:invested,monthly_return:r.rate,investment_gain_yen:closing-invested,
      closing_yen:closing});
    assets=closing;
  }
  return {status:shortfallMonths?'SHORTFALL':'FUNDED',provenance,publication_approved:false,
    timing:'MONTH_START_CONTRIBUTION_THEN_WITHDRAWAL_THEN_RETURN',
    horizon_months:rows.length,first_shortfall_month:firstShortfall,
    shortfall_months:shortfallMonths,total_unfunded_yen:totalUnfunded,
    ending_assets_yen:assets,rows};
}
/** Rolling history accepts only observed (non-proxy) private research paths.
 * Gaps split the series; windows crossing a gap are excluded, not failed.
 */
function runRollingCashflow({
  initial_assets_yen,monthly_withdrawal_yen,monthly_contribution_yen=0,
  monthly_returns,horizon_months
}){
  yen(initial_assets_yen,'initial_assets_yen');
  yen(monthly_withdrawal_yen,'monthly_withdrawal_yen');
  yen(monthly_contribution_yen,'monthly_contribution_yen');
  if(!Number.isInteger(horizon_months)||horizon_months<1||horizon_months>MAX_MONTHS)
    throw Error('horizon_months must be 1..'+MAX_MONTHS);
  const rows=validateMonthlyReturns(monthly_returns,'OBSERVED',{allowGaps:true});
  const windows=[];
  let blockStart=0,gaps=0;
  function evaluateBlock(start,end){
    for(let i=start;i+horizon_months<=end;i++){
      const segment=monthly_returns.slice(i,i+horizon_months);
      const outcome=simulateMonthlyCashflow({initial_assets_yen,monthly_withdrawal_yen,
        monthly_contribution_yen,monthly_returns:segment,provenance:'OBSERVED'});
      windows.push({start_month:segment[0].month,end_month:segment.at(-1).month,
        status:outcome.status,first_shortfall_month:outcome.first_shortfall_month,
        total_unfunded_yen:outcome.total_unfunded_yen,ending_assets_yen:outcome.ending_assets_yen});
    }
  }
  for(let i=1;i<=rows.length;i++){
    if(i<rows.length&&rows[i].serial===rows[i-1].serial+1)continue;
    evaluateBlock(blockStart,i);
    if(i<rows.length)gaps++;
    blockStart=i;
  }
  const theoretical=Math.max(0,rows.at(-1).serial-rows[0].serial+1-horizon_months+1);
  const funded=windows.filter(x=>x.status==='FUNDED').length;
  return {
    status:windows.length?'EVALUATED':'INSUFFICIENT_CONTIGUOUS_HISTORY',
    provenance:'OBSERVED',publication_approved:false,
    research_disclaimer:'Observed historical windows are not independent trials or future probabilities.',
    first_observed_month:rows[0].month,last_observed_month:rows.at(-1).month,
    observed_return_months:rows.length,gap_boundaries:gaps,
    theoretical_windows_if_no_gaps:theoretical,complete_windows:windows.length,
    excluded_windows_due_to_missing_months:theoretical-windows.length,
    funded_windows:funded,shortfall_windows:windows.length-funded,
    observed_funded_fraction:windows.length?funded/windows.length:null,
    windows
  };
}
function makeSyntheticFlatPath({start_month,months,monthly_return}){
  const first=monthSerial(start_month);
  if(!Number.isInteger(months)||months<1||months>MAX_MONTHS)throw Error('Invalid synthetic months');
  if(typeof monthly_return!=='number'||!Number.isFinite(monthly_return)||monthly_return< -1||monthly_return>10)
    throw Error('Invalid synthetic return');
  return Array.from({length:months},(_,i)=>({month:formatMonth(first+i),monthly_return,origin:'SYNTHETIC'}));
}
module.exports={monthSerial,formatMonth,validateMonthlyReturns,simulateMonthlyCashflow,runRollingCashflow,makeSyntheticFlatPath};
