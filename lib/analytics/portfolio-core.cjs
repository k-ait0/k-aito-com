'use strict';
/** Independent multi-asset nominal JPY research core; v0.5 two-phase extension. No external data or I/O. */
const {monthSerial}=require('./cashflow-core.cjs');
const MAX_ASSETS=12, MAX_MONTHS=1200, MAX_YEN=1_000_000_000_000;
const ID=/^[A-Z][A-Z0-9_]{0,31}$/;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function object(x,label){if(!x||typeof x!=='object'||Array.isArray(x))throw Error(label+' must be object');return x}
function money(v,label){if(!Number.isSafeInteger(v)||v<0||v>MAX_YEN)throw Error(label+' must be integer JPY 0..1e12');return v}
function sumSafe(values,label){const n=values.reduce((a,b)=>a+b,0);if(!Number.isSafeInteger(n)||n>MAX_YEN)throw Error('Overflow '+label);return n}
function roundMoney(n,label){if(!Number.isFinite(n)||n<0||n>MAX_YEN)throw Error('Unsafe monetary result '+label);return Math.round(n)}
function validateWeights(weights,ids){
 object(weights,'target_weights');
 if(Object.keys(weights).length!==ids.length||ids.some(k=>!own(weights,k)))throw Error('Target weight assets mismatch');
 const values=ids.map(id=>weights[id]);
 if(values.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)||Math.abs(values.reduce((a,b)=>a+b,0)-1)>1e-10)throw Error('Target weights must total one');
 return values;
}
/** Largest-remainder apportionment. Deterministic alphabetical tie-break by asset ID. */
function apportion(total,weights,ids){
 money(total,'apportion total');
 const raw=weights.map(w=>total*w),base=raw.map(x=>Math.floor(x));
 const initial=base.reduce((a,b)=>a+b,0),missing=total-initial;
 if(!Number.isSafeInteger(missing)||missing<0||missing>ids.length)throw Error('Unstable rounding in allocation');
 const order=ids.map((_,i)=>i).sort((a,b)=>(raw[b]-base[b])-(raw[a]-base[a])||ids[a].localeCompare(ids[b],'en'));
 for(let i=0;i<missing;i++)base[order[i]]++;
 return base;
}
function validateInput(input){
 object(input,'portfolio input');
 const allowed=new Set(['initial_holdings_yen','target_weights','monthly_returns','monthly_contribution_yen','monthly_withdrawal_yen','market_mode','rebalance','monthly_cashflows','monthly_phase_cashflows','withdrawal_strategy','cash_asset_id','withdrawal_timing']);
 for(const key of Object.keys(input))if(!allowed.has(key))throw Error('Unsupported portfolio input: '+key);
 const holdings=object(input.initial_holdings_yen,'initial_holdings_yen');
 const ids=Object.keys(holdings).sort();
 if(ids.length<1||ids.length>MAX_ASSETS||ids.some(id=>!ID.test(id)))throw Error('Asset IDs must be 1..12 unique uppercase IDs');
 for(const id of ids)money(holdings[id],id);
 sumSafe(ids.map(id=>holdings[id]),'initial portfolio');
 const weights=validateWeights(input.target_weights,ids);
 const contribution=money(input.monthly_contribution_yen??0,'monthly_contribution_yen');
 const withdrawal=money(input.monthly_withdrawal_yen??0,'monthly_withdrawal_yen');
 const withdrawalTiming=input.withdrawal_timing??'MONTH_START';
 if(!['MONTH_START','MONTH_END'].includes(withdrawalTiming))
  throw Error('Invalid withdrawal_timing');
 const withdrawalStrategy=input.withdrawal_strategy??'PRO_RATA';
 if(!['PRO_RATA','CASH_FIRST','RISK_FIRST'].includes(withdrawalStrategy))
  throw Error('Invalid withdrawal_strategy');
 const cashAssetId=input.cash_asset_id??null;
 if(withdrawalStrategy!=='PRO_RATA'){
  if(typeof cashAssetId!=='string'||!ids.includes(cashAssetId))
   throw Error('CASH_FIRST/RISK_FIRST requires an existing cash_asset_id');
 }else if(cashAssetId!==null)
  throw Error('cash_asset_id is only valid for CASH_FIRST/RISK_FIRST');
 const cashIndex=cashAssetId===null?-1:ids.indexOf(cashAssetId);
 const marketMode=input.market_mode??'SYNTHETIC_DEMO';
 if(!['OBSERVED_RESEARCH','SYNTHETIC_DEMO'].includes(marketMode))throw Error('Unknown market_mode');
 const requiredOrigin=marketMode==='OBSERVED_RESEARCH'?'OBSERVED':'SYNTHETIC';
 const rows=input.monthly_returns;
 if(!Array.isArray(rows)||rows.length<1||rows.length>MAX_MONTHS)throw Error('monthly_returns must be 1..1200 months');
 let previous=null;
 const returns=rows.map((row,i)=>{
   object(row,'return row');const idx=monthSerial(row.month);
   if(previous!==null&&(idx<=previous||idx!==previous+1))throw Error('Missing, repeated or out-of-order market month');
   previous=idx;
   if(row.origin!==requiredOrigin||row.proxy===true||row.estimated===true)throw Error('Mixed, proxy or estimated provenance prohibited');
   const monthly=object(row.asset_returns,'asset_returns');
   if(Object.keys(monthly).length!==ids.length||ids.some(id=>!own(monthly,id)))throw Error('Return asset coverage mismatch');
   const rates=ids.map(id=>{
     const r=monthly[id];
     if(typeof r!=='number'||!Number.isFinite(r)||r< -1||r>10)throw Error('Invalid return for '+id+' '+row.month);
     return r;
   });
   if(cashIndex!==-1&&rates[cashIndex]!==0)
    throw Error('cash_asset_id must have zero monthly market return in every month');
   return {month:row.month,rates};
 });
 const hasSchedule=Object.prototype.hasOwnProperty.call(input,'monthly_cashflows');
 const cashflows=hasSchedule?input.monthly_cashflows:null;
 if(hasSchedule){
  if(Object.prototype.hasOwnProperty.call(input,'monthly_contribution_yen')||Object.prototype.hasOwnProperty.call(input,'monthly_withdrawal_yen'))throw Error('Monthly schedule conflicts with fixed cashflows');
  if(!Array.isArray(cashflows)||cashflows.length!==returns.length)throw Error('Monthly cashflow calendar length mismatch');
  for(let i=0;i<returns.length;i++){
   const flow=object(cashflows[i],'monthly cashflow');
   for(const k of Object.keys(flow))if(!['month','contribution_yen','withdrawal_yen'].includes(k))throw Error('Unsupported monthly cashflow field: '+k);
   if(flow.month!==returns[i].month)throw Error('Monthly cashflow calendar mismatch: '+returns[i].month);
   money(flow.contribution_yen,'cashflow contribution '+flow.month);
   money(flow.withdrawal_yen,'cashflow withdrawal '+flow.month);
  }
 }
 const hasPhases=Object.prototype.hasOwnProperty.call(input,'monthly_phase_cashflows');
 const phases=hasPhases?input.monthly_phase_cashflows:null;
 if(hasPhases){
  if(hasSchedule||own(input,'monthly_contribution_yen')||own(input,'monthly_withdrawal_yen'))
   throw Error('Two-phase cashflows conflict with fixed or one-phase schedules');
  if(!Array.isArray(phases)||phases.length!==returns.length)
   throw Error('Two-phase cashflows must cover each market month');
  const allowedPhaseFields=['month','start_contribution_yen','start_withdrawal_yen','end_contribution_yen','end_withdrawal_yen'];
  phases.forEach((p,i)=>{
   object(p,'two-phase cashflow');
   for(const k of Object.keys(p))if(!allowedPhaseFields.includes(k))
     throw Error('Unsupported two-phase cashflow field: '+k);
   if(p.month!==returns[i].month)throw Error('Two-phase cashflow month mismatch: '+returns[i].month);
   for(const k of allowedPhaseFields.slice(1))money(p[k],k+' '+p.month);
  });
 }
 const rebalance=input.rebalance??{mode:'NONE'};
 object(rebalance,'rebalance');
 const rbAllowed=new Set(['mode','interval_months','threshold']);
 for(const k of Object.keys(rebalance))if(!rbAllowed.has(k))throw Error('Unknown rebalance key: '+k);
 if(!['NONE','PERIODIC','THRESHOLD'].includes(rebalance.mode))throw Error('Invalid rebalance mode');
 if(rebalance.mode==='PERIODIC'&&(!Number.isInteger(rebalance.interval_months)||rebalance.interval_months<1||rebalance.interval_months>1200))throw Error('Invalid rebalance interval');
 if(rebalance.mode==='THRESHOLD'&&(typeof rebalance.threshold!=='number'||!Number.isFinite(rebalance.threshold)||rebalance.threshold<=0||rebalance.threshold>=1))throw Error('Invalid threshold');
 if(rebalance.mode!=='PERIODIC'&&own(rebalance,'interval_months'))throw Error('Unexpected rebalance interval');
 if(rebalance.mode!=='THRESHOLD'&&own(rebalance,'threshold'))throw Error('Unexpected threshold');
 return {ids,holdings:ids.map(id=>holdings[id]),weights,returns,contribution,withdrawal,cashflows,phases,marketMode,rebalance,withdrawalStrategy,cashIndex,cashAssetId,withdrawalTiming};
}

/** Integer JPY withdrawals from already funded holdings, with no overdrafts.
 * The default PRO_RATA route is bit-for-bit equivalent to prior Core.
 * CASH_FIRST: cash before risky sleeves; RISK_FIRST: risky before cash.
 * All risky sleeves are paid proportionally by their remaining value.
 */
function selectWithdrawalPayments(available,paid,ids,strategy,cashIndex){
 const total=sumSafe(available,'withdrawal available');
 if(paid>total)throw Error('Withdrawal paid exceeds assets');
 if(total===0||paid===0)return available.map(()=>0);
 if(strategy==='PRO_RATA')return apportion(paid,available.map(x=>x/total),ids);
 if(cashIndex<0||cashIndex>=ids.length)throw Error('Missing cash asset for withdrawal strategy');
 const cash=Math.min(available[cashIndex],paid);
 const riskIndices=available.map((_,i)=>i).filter(i=>i!==cashIndex);
 const riskTotal=sumSafe(riskIndices.map(i=>available[i]),'risk assets');
 const riskPay=strategy==='CASH_FIRST'?paid-cash:Math.min(paid,riskTotal);
 const cashPay=paid-riskPay;
 if(cashPay>available[cashIndex]||riskPay>riskTotal)
  throw Error('Not enough eligible holdings for withdrawal strategy');
 const withdrawals=available.map(()=>0);
 withdrawals[cashIndex]=cashPay;
 if(riskPay>0){
  const distributed=apportion(riskPay,riskIndices.map(i=>available[i]/riskTotal),
   riskIndices.map(i=>ids[i]));
  riskIndices.forEach((i,j)=>{withdrawals[i]=distributed[j];});
 }
 if(withdrawals.reduce((a,b)=>a+b,0)!==paid||
    withdrawals.some((x,i)=>x<0||x>available[i]))
  throw Error('Withdrawal allocation failed exact integer conservation');
 return withdrawals;
}


/** Per-phase gross cashflow preservation. START income and spending happen
 * before monthly return; END income and spending happen after return.
 * Per-asset amounts and per-phase unpaid obligations are always retained.
 * This function is intentionally separate from legacy simulatePortfolio to
 * guarantee the old single-phase results stay bit-for-bit unchanged.
 */
function simulatePortfolioTwoPhase(v){
 let holdings=[...v.holdings],firstShortfall=null,shortfallMonths=0,totalUnfunded=0;
 const ledger=[],zero=()=>v.ids.map(()=>0);
 for(let i=0;i<v.returns.length;i++){
  const month=v.returns[i].month,opening=sumSafe(holdings,'phased opening '+month);
  const flow=v.phases[i];
  const contribute=(existing,amount,phase)=>{
   const allocation=apportion(amount,v.weights,v.ids);
   const updated=existing.map((h,j)=>h+allocation[j]);
   sumSafe(updated,'phased contribution '+phase+' '+month);
   return {holdings:updated,allocation};
  };
  const pay=(existing,requested,phase)=>{
   const available=sumSafe(existing,'phased available '+phase+' '+month);
   const paid=Math.min(available,requested),unfunded=requested-paid;
   const allocation=selectWithdrawalPayments(existing,paid,v.ids,v.withdrawalStrategy,v.cashIndex);
   const updated=existing.map((h,j)=>h-allocation[j]);
   if(updated.some(x=>x<0))throw Error('Negative after '+phase+' withdrawal');
   sumSafe(updated,'phased remaining '+phase+' '+month);
   return {holdings:updated,paid,unfunded,allocation};
  };
  const sc=contribute(holdings,flow.start_contribution_yen,'MONTH_START');
  const sw=pay(sc.holdings,flow.start_withdrawal_yen,'MONTH_START');
  const beforeReturns=sumSafe(sw.holdings,'phased before return '+month);
  const market=sw.holdings.map((h,j)=>roundMoney(h*(1+v.returns[i].rates[j]),
   'phased market return '+month+' '+v.ids[j]));
  const marketValue=sumSafe(market,'phased market close '+month);
  const investmentGain=marketValue-beforeReturns;
  const ec=contribute(market,flow.end_contribution_yen,'MONTH_END');
  const ew=pay(ec.holdings,flow.end_withdrawal_yen,'MONTH_END');
  const afterReturnWithdrawals=sumSafe(ew.holdings,'phased post-payment '+month);
  const afterReturnWeights=afterReturnWithdrawals?
   ew.holdings.map(x=>x/afterReturnWithdrawals):v.weights;
  let rebalance=false;
  if(v.rebalance.mode==='PERIODIC')rebalance=(i+1)%v.rebalance.interval_months===0;
  if(v.rebalance.mode==='THRESHOLD'&&afterReturnWithdrawals>0)
   rebalance=afterReturnWeights.some((w,j)=>Math.abs(w-v.weights[j])>v.rebalance.threshold);
  let closing=[...ew.holdings],turnover=0;
  if(rebalance){
   closing=apportion(afterReturnWithdrawals,v.weights,v.ids);
   turnover=closing.reduce((n,x,j)=>n+Math.max(0,x-ew.holdings[j]),0);
  }
  const total=sumSafe(closing,'phased final '+month);
  if(total!==afterReturnWithdrawals)throw Error('Phased rebalance changed capital');
  const contribution=sumSafe([flow.start_contribution_yen,flow.end_contribution_yen],'gross income '+month);
  const due=sumSafe([flow.start_withdrawal_yen,flow.end_withdrawal_yen],'gross due '+month);
  const paid=sumSafe([sw.paid,ew.paid],'gross paid '+month);
  const unfunded=sumSafe([sw.unfunded,ew.unfunded],'gross unpaid '+month);
  if(due!==paid+unfunded)throw Error('Phased due/paid/unfunded mismatch');
  if(opening+contribution+investmentGain-paid!==total)
   throw Error('Phased capital conservation failed '+month);
  if(unfunded>0){shortfallMonths++;if(firstShortfall===null)firstShortfall=month;}
  totalUnfunded=sumSafe([totalUnfunded,unfunded],'phased cumulative unfunded');
  const assets=Object.fromEntries(v.ids.map((id,j)=>[id,{
    opening_yen:holdings[j],contribution_yen:sc.allocation[j]+ec.allocation[j],
    withdrawal_yen:sw.allocation[j]+ew.allocation[j],
    contribution_month_start_yen:sc.allocation[j],contribution_month_end_yen:ec.allocation[j],
    withdrawal_month_start_yen:sw.allocation[j],withdrawal_month_end_yen:ew.allocation[j],
    market_return:v.returns[i].rates[j],before_rebalance_yen:ew.holdings[j],
    closing_yen:closing[j]
  }]));
  ledger.push({month,opening_yen:opening,contribution_yen:contribution,
   requested_withdrawal_yen:due,paid_withdrawal_yen:paid,unfunded_yen:unfunded,
   invested_before_return_yen:beforeReturns,investment_gain_yen:investmentGain,
   pre_rebalance_yen:afterReturnWithdrawals,rebalance_executed:rebalance,
   rebalance_turnover_yen:turnover,closing_yen:total,holdings:assets,
   phases:{
    MONTH_START:{contribution_yen:flow.start_contribution_yen,
      requested_withdrawal_yen:flow.start_withdrawal_yen,
      paid_withdrawal_yen:sw.paid,unfunded_yen:sw.unfunded},
    MONTH_END:{contribution_yen:flow.end_contribution_yen,
      requested_withdrawal_yen:flow.end_withdrawal_yen,
      paid_withdrawal_yen:ew.paid,unfunded_yen:ew.unfunded}
   }
  });
  holdings=closing;
 }
 return {status:shortfallMonths?'SHORTFALL':'FUNDED',market_mode:v.marketMode,
  publication_approved:false,provenance_verified:false,
  assumptions:'GROSS_NOMINAL_JPY_NO_FEES_TAXES_FX_OR_DEBTS',
  timing:'TWO_PHASE_START_CONTRIBUTION_WITHDRAWAL_THEN_RETURNS_THEN_END_CONTRIBUTION_WITHDRAWAL_THEN_REBALANCE',
  withdrawal_timing:'MIXED_TWO_PHASE',withdrawal_strategy:v.withdrawalStrategy,
  cash_asset_id:v.cashAssetId,cashflow_mode:'TWO_PHASE_SCHEDULE',
  assets:v.ids,rebalance_mode:v.rebalance.mode,horizon_months:ledger.length,
  ending_assets_yen:sumSafe(holdings,'phased ending assets'),
  ending_holdings_yen:Object.fromEntries(v.ids.map((id,j)=>[id,holdings[j]])),
  first_shortfall_month:firstShortfall,shortfall_months:shortfallMonths,
  total_unfunded_yen:totalUnfunded,rows:ledger};
}

function simulatePortfolio(input){
 const v=validateInput(input);
 if(v.phases)return simulatePortfolioTwoPhase(v);
 let holdings=[...v.holdings],firstShortfall=null,shortfallMonths=0,totalUnfunded=0;
 const ledger=[];
 for(let i=0;i<v.returns.length;i++){
   const month=v.returns[i].month,opening=sumSafe(holdings,'opening '+month);
   const requestedContribution=v.cashflows?v.cashflows[i].contribution_yen:v.contribution;
   const requestedWithdrawal=v.cashflows?v.cashflows[i].withdrawal_yen:v.withdrawal;
   const contributions=apportion(requestedContribution,v.weights,v.ids);
   let available=holdings.map((h,j)=>h+contributions[j]);
   sumSafe(available,'available '+month);
   let paid,unfunded,payments,beforeReturns,afterReturns,afterMarket,investmentGain;
   if(v.withdrawalTiming==='MONTH_START'){
     const totalAvailable=sumSafe(available,'available '+month);
     paid=Math.min(totalAvailable,requestedWithdrawal);unfunded=requestedWithdrawal-paid;
     payments=selectWithdrawalPayments(available,paid,v.ids,v.withdrawalStrategy,v.cashIndex);
     available=available.map((h,j)=>h-payments[j]);
     if(available.some(x=>x<0))throw Error('Negative holdings after withdrawals');
     beforeReturns=sumSafe(available,'before returns '+month);
     afterReturns=available.map((h,j)=>roundMoney(h*(1+v.returns[i].rates[j]),'market return '+month+' '+v.ids[j]));
     afterMarket=sumSafe(afterReturns,'market close '+month);
     investmentGain=afterMarket-beforeReturns;
   }else{
     // Salary and external contributions arrive at the START of this month.
     // All scheduled withdrawal obligations are paid AFTER this month's return,
     // before any terminal rebalancing; this is NOT the old two-phase DWZ
     // scheme where some event expenses occur at month start.
     beforeReturns=sumSafe(available,'before end-month returns '+month);
     const marketHoldings=available.map((h,j)=>roundMoney(h*(1+v.returns[i].rates[j]),'market return '+month+' '+v.ids[j]));
     const marketValue=sumSafe(marketHoldings,'market value before end-month payment '+month);
     investmentGain=marketValue-beforeReturns;
     paid=Math.min(marketValue,requestedWithdrawal);unfunded=requestedWithdrawal-paid;
     payments=selectWithdrawalPayments(marketHoldings,paid,v.ids,v.withdrawalStrategy,v.cashIndex);
     afterReturns=marketHoldings.map((h,j)=>h-payments[j]);
     if(afterReturns.some(x=>x<0))throw Error('Negative holdings after end-month withdrawals');
     afterMarket=sumSafe(afterReturns,'market close after withdrawal '+month);
   }
   const afterReturnWeights=afterMarket?afterReturns.map(x=>x/afterMarket):v.weights;
   let rebalance=false;
   if(v.rebalance.mode==='PERIODIC')rebalance=(i+1)%v.rebalance.interval_months===0;
   if(v.rebalance.mode==='THRESHOLD'&&afterMarket>0)rebalance=afterReturnWeights.some((w,j)=>Math.abs(w-v.weights[j])>v.rebalance.threshold);
   let turnover=0;
   let closing=[...afterReturns];
   if(rebalance){
     closing=apportion(afterMarket,v.weights,v.ids);
     turnover=closing.reduce((n,x,j)=>n+Math.max(0,x-afterReturns[j]),0);
   }
   const final=sumSafe(closing,'closing '+month);
   if(final!==afterMarket)throw Error('Rebalance conservation failed');
   if(unfunded>0){shortfallMonths++;if(firstShortfall===null)firstShortfall=month;}
   totalUnfunded=sumSafe([totalUnfunded,unfunded],'cumulative unmet withdrawal');
   const items=Object.fromEntries(v.ids.map((id,j)=>[id,{opening_yen:holdings[j],contribution_yen:contributions[j],withdrawal_yen:payments[j],market_return:v.returns[i].rates[j],before_rebalance_yen:afterReturns[j],closing_yen:closing[j]}]));
   ledger.push({month,opening_yen:opening,contribution_yen:requestedContribution,requested_withdrawal_yen:requestedWithdrawal,
      paid_withdrawal_yen:paid,unfunded_yen:unfunded,invested_before_return_yen:beforeReturns,
      investment_gain_yen:investmentGain,pre_rebalance_yen:afterMarket,
      rebalance_executed:rebalance,rebalance_turnover_yen:turnover,closing_yen:final,holdings:items});
   holdings=closing;
 }
 return {status:shortfallMonths?'SHORTFALL':'FUNDED',market_mode:v.marketMode,publication_approved:false,
   provenance_verified:false,assumptions:'GROSS_NOMINAL_JPY_NO_FEES_TAXES_FX_OR_DEBTS',
   timing:v.withdrawalTiming==='MONTH_START'?
    (v.withdrawalStrategy==='PRO_RATA'?
     'MONTH_START_CONTRIBUTION_THEN_PROPORTIONAL_WITHDRAWAL_THEN_RETURNS_THEN_REBALANCE':
     'MONTH_START_CONTRIBUTION_THEN_ORDERED_WITHDRAWAL_THEN_RETURNS_THEN_REBALANCE'):
    'MONTH_START_CONTRIBUTION_THEN_RETURNS_THEN_MONTH_END_WITHDRAWAL_THEN_REBALANCE',
   withdrawal_timing:v.withdrawalTiming,
   withdrawal_strategy:v.withdrawalStrategy,cash_asset_id:v.cashAssetId,
   cashflow_mode:v.cashflows?'MONTHLY_SCHEDULE':'FIXED_MONTHLY',
   assets:v.ids,rebalance_mode:v.rebalance.mode,horizon_months:ledger.length,
   ending_assets_yen:sumSafe(holdings,'ending assets'),ending_holdings_yen:Object.fromEntries(v.ids.map((id,j)=>[id,holdings[j]])),
   first_shortfall_month:firstShortfall,shortfall_months:shortfallMonths,total_unfunded_yen:totalUnfunded,rows:ledger};
}
module.exports={simulatePortfolio,validateInput,apportion,selectWithdrawalPayments};
