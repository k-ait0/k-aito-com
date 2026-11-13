'use strict';
/**
 * v0.13: month-by-month CPI-linked living expense on JPY nominal asset returns.
 * Research-only. Reported OBSERVED origin is a claim, NOT raw-source authentication.
 * Requires upstream canonical, byte-pinned Japanese CPI and portfolio return QA.
 */
const {monthSerial,formatMonth}=require('./cashflow-core.cjs');
const {buildRelativeMonthlyCashflows,validateMarketSeries}=require('./rolling-portfolio-lifecycle.cjs');
const {simulatePortfolio,validateInput}=require('./portfolio-core.cjs');
const {auditPortfolioAgainstInputs}=require('./portfolio-input-audit.cjs');
const MAX_MONTHS=1200,MAX_YEN=1_000_000_000_000;
const CPI_KEYS=new Set(['month','value','origin','series_id','source_id','series_kind','unit','seasonal_adjustment']);
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
function isObject(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
function assertKeys(x,keys,label){if(!isObject(x))throw Error('Invalid '+label);for(const k of Object.keys(x))if(!keys.has(k))throw Error('Unsupported '+label+' field: '+k);}
function yen(n,label){if(!Number.isFinite(n)||n<0||n>MAX_YEN-0.5)throw Error('Unsafe monetary amount '+label);return Math.round(n);}
function sum(a,b,label){if(!Number.isSafeInteger(a+b)||a+b>MAX_YEN)throw Error('Monetary overflow '+label);return a+b;}
function readCpi(rows,mode){
  if(!Array.isArray(rows)||rows.length<1||rows.length>MAX_MONTHS)throw Error('CPI levels must be 1..1200 observed monthly levels');
  const expectedOrigin=mode==='OBSERVED_RESEARCH'?'OBSERVED':'SYNTHETIC';
  const source=mode==='OBSERVED_RESEARCH'?'ESTAT':'SYNTHETIC_FIXTURE';
  const byMonth=new Map();let prev=null;
  for(const [i,r] of rows.entries()){
    assertKeys(r,CPI_KEYS,'CPI row '+i);
    const at=monthSerial(r.month);
    if(prev!==null&&at<=prev)throw Error('CPI unsorted or duplicate month');prev=at;
    if(r.origin!==expectedOrigin||r.source_id!==source||r.series_id!=='JP_CPI_HEADLINE_2025_LINKED'||r.series_kind!=='CPI_LEVEL'||r.unit!=='INDEX_2025_100'||r.seasonal_adjustment!=='NSA')
      throw Error('CPI source, basket, basis, adjustment or origin mismatch');
    const raw=r.value;
    if(typeof raw!=='number'&&!(typeof raw==='string'&&/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)))throw Error('Invalid CPI index level');
    const n=Number(raw);
    if(!Number.isFinite(n)||n<=0)throw Error('Invalid positive CPI level');
    byMonth.set(r.month,n);
  }
  return byMonth;
}
function countContiguousMarkets(positions,horizon){
  let blockStart=0,count=0;
  for(let i=1;i<=positions.length;i++){
    if(i<positions.length&&positions[i]===positions[i-1]+1)continue;
    count+=Math.max(0,i-blockStart-horizon+1);blockStart=i;
  }
  return count;
}
function runRollingPortfolioCpiLinked({monthly_market_returns,jp_cpi_monthly_levels,horizon_months,portfolio,cashflow_plan,market_mode='OBSERVED_RESEARCH',cashflow_timing='MONTH_START',cpi_reference_policy='LEGACY_SAME_MONTH'}={}){
  if(!['OBSERVED_RESEARCH','SYNTHETIC_DEMO'].includes(market_mode))throw Error('Unknown market_mode');
  if(!['MONTH_START','MONTH_END'].includes(cashflow_timing))throw Error('Invalid cashflow_timing');
  if(!['LEGACY_SAME_MONTH','CASHFLOW_BOUNDARY'].includes(cpi_reference_policy))throw Error('Invalid cpi_reference_policy');
  if(!Number.isInteger(horizon_months)||horizon_months<1||horizon_months>MAX_MONTHS)throw Error('Invalid horizon_months');
  if(!isObject(cashflow_plan))throw Error('Invalid cashflow_plan');
  if(own(cashflow_plan,'annual_expense_inflation'))throw Error('CPI-linked mode conflicts with fixed annual_expense_inflation; no double inflation');
  if(!isObject(portfolio)||Object.keys(portfolio).some(k=>!['initial_holdings_yen','target_weights','rebalance'].includes(k)))throw Error('Unsupported portfolio policy');
  const baseFlows=buildRelativeMonthlyCashflows(cashflow_plan,horizon_months); // zero fixed inflation; pensions/events unchanged
  const market=validateMarketSeries(monthly_market_returns,portfolio,market_mode);
  const cpi=readCpi(jp_cpi_monthly_levels,market_mode);
  validateInput({...portfolio,monthly_returns:[monthly_market_returns[0]],monthly_cashflows:[{month:monthly_market_returns[0].month,contribution_yen:baseFlows[0].contribution_yen,withdrawal_yen:baseFlows[0].withdrawal_yen}],market_mode,cashflow_timing});
  const windows=[];
  let startBlock=0,marketOnlyWindows=0;
  for(let i=1;i<=monthly_market_returns.length;i++){
    if(i<monthly_market_returns.length&&market.positions[i]===market.positions[i-1]+1)continue;
    for(let start=startBlock;start+horizon_months<=i;start++){
      marketOnlyWindows++;
      const selected=monthly_market_returns.slice(start,start+horizon_months);
      // Under CASHFLOW_BOUNDARY the CPI level belongs to the settlement boundary.
      // MONTH_START -> previous market calendar month; MONTH_END -> current month.
      // These are final revised historical levels, NOT what was published that day.
      const refMonths=selected.map(r=>cpi_reference_policy==='CASHFLOW_BOUNDARY'&&cashflow_timing==='MONTH_START'?
        formatMonth(monthSerial(r.month)-1):r.month);
      const prices=refMonths.map(m=>cpi.get(m));
      if(prices.some(p=>p===undefined))continue; // Do NOT impute or splice past CPI gaps.
      const priceStart=prices[0];
      const schedule=baseFlows.map((f,k)=>{
        const living=yen(f.breakdown.living_expense_yen*(prices[k]/priceStart),'CPI-linked living '+selected[k].month);
        return {month:selected[k].month,contribution_yen:f.contribution_yen,
          withdrawal_yen:sum(living,f.breakdown.one_time_expense_yen,'CPI month '+selected[k].month)};
      });
      const inputs={...portfolio,monthly_returns:selected,monthly_cashflows:schedule,market_mode,cashflow_timing};
      const result=simulatePortfolio(inputs);
      auditPortfolioAgainstInputs(inputs,result); // Independent source input/ledger reconciliation.
      const first=result.rows.findIndex(r=>r.unfunded_yen>0);
      windows.push({market_start_month:selected[0].month,market_end_month:selected.at(-1).month,
        cpi_start_level:priceStart,cpi_end_level:prices.at(-1),cpi_start_reference_month:refMonths[0],cpi_end_reference_month:refMonths.at(-1),
        ending_assets_yen:result.ending_assets_yen,status:result.status,
        total_unfunded_yen:result.total_unfunded_yen,shortfall_months:result.shortfall_months,
        first_shortfall_offset_months:first<0?null:first,
        rebalance_count:result.rows.filter(r=>r.rebalance_executed).length,
        total_turnover_yen:result.rows.reduce((a,r)=>sum(a,r.rebalance_turnover_yen,'turnover'),0),
        initial_living_expense_yen:baseFlows[0].breakdown.living_expense_yen,
        final_living_expense_yen:yen(baseFlows.at(-1).breakdown.living_expense_yen*(prices.at(-1)/priceStart),'final living')});
    }
    startBlock=i;
  }
  const theoretical=Math.max(0,market.positions.at(-1)-market.positions[0]-horizon_months+2);
  const funded=windows.filter(w=>w.status==='FUNDED').length;
  return {status:windows.length?'EVALUATED':'INSUFFICIENT_CONTIGUOUS_MARKET_AND_CPI',
    horizon_months,market_mode,cashflow_timing,cpi_reference_policy,expense_inflation_mode:'OBSERVED_JP_CPI_LEVEL_RELATIVE_TO_EACH_WINDOW_START',
    market_path_provenance:market_mode==='OBSERVED_RESEARCH'?'OBSERVED_USER_ASSERTED_UNVERIFIED':'SYNTHETIC',
    cpi_provenance_verified_here:false,publication_approved:false,source_rights_approved:false,
    life_plan_provenance:'SYNTHETIC_ASSUMPTIONS',future_probability_claim:false,
    money_basis:'NOMINAL_JPY_ASSETS_AND_WITHDRAWALS',
    index_method:'LIVING_EXPENSE[t]=BASE_LIVING_EXPENSE*JP_CPI[settlement_reference_t]/JP_CPI[first_settlement_reference]; pension/events kept nominal',
    cpi_asof_policy:'RETROSPECTIVE_FINAL_REVISED_CPI_LEVELS_NOT_RELEASE_TIME_AVAILABLE',
    cpi_legacy_lookahead_risk:cpi_reference_policy==='LEGACY_SAME_MONTH'&&cashflow_timing==='MONTH_START',
    cpi_release_time_lookahead_possible:true, // Neither policy includes historical publication timestamps.
    market_months:monthly_market_returns.length,cpi_level_months:jp_cpi_monthly_levels.length,
    market_first_month:monthly_market_returns[0].month,market_last_month:monthly_market_returns.at(-1).month,
    gap_boundaries:market.gap_boundaries,theoretical_windows_if_no_gaps:theoretical,
    complete_market_windows:marketOnlyWindows,complete_windows:windows.length,
    excluded_windows_due_to_missing_market_months:theoretical-marketOnlyWindows,
    excluded_windows_due_to_missing_cpi_months:marketOnlyWindows-windows.length,
    funded_windows:funded,shortfall_windows:windows.length-funded,
    historical_funded_fraction:market_mode==='OBSERVED_RESEARCH'&&windows.length?funded/windows.length:null,
    demo_funded_fraction:market_mode==='SYNTHETIC_DEMO'&&windows.length?funded/windows.length:null,
    input_concordance_audited_windows:windows.length,
    input_concordance_note:'Audited against supplied input path (publisher source and CPI not independently authenticated)',
    note:'The fraction counts OVERLAPPING historical starts, not independent outcomes or future success probabilities. CPI provenance and rights need independent raw byte validation.',
    windows};
}
module.exports={readCpi,runRollingPortfolioCpiLinked};
