'use strict';
/**
 * K. Aito Analytics v0.7: historical/synthetic rolling portfolio with relative lifecycle.
 * Private research only. Values tagged OBSERVED are NOT independently authenticated here.
 * No I/O, downloads, source substitution or site publication.
 */
const {monthSerial}=require('./cashflow-core.cjs');
const {simulatePortfolio,validateInput}=require('./portfolio-core.cjs');
const MAX_MONTHS=1200,MAX_EVENTS=500,MAX_PENSIONS=20,MAX_YEN=1_000_000_000_000;
const obj=(x,name)=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid '+name);return x;};
const assertKeys=(x,allowed,name)=>{obj(x,name);for(const k of Object.keys(x))if(!allowed.has(k))throw Error('Unsupported '+name+' field: '+k);};
const money=(x,name)=>{if(!Number.isSafeInteger(x)||x<0||x>MAX_YEN)throw Error('Invalid '+name+' (integer JPY 0..1e12)');return x;};
const safeAdd=(a,b,name)=>{const x=a+b;if(!Number.isSafeInteger(x)||x>MAX_YEN)throw Error('Unsafe money '+name);return x;};
const yenRound=(x,name)=>{if(!Number.isFinite(x)||x<0||x>MAX_YEN-0.5)throw Error('Unsafe round '+name);return Math.round(x);};
const id=(x,name)=>{if(typeof x!=='string'||!(/^[A-Za-z][A-Za-z0-9_-]{0,39}$/).test(x)||['constructor','prototype','__proto__'].includes(x))throw Error('Invalid '+name);return x;};
const PORTFOLIO_KEYS=new Set(['initial_holdings_yen','target_weights','rebalance']);
const PLAN_KEYS=new Set(['monthly_contribution_yen','monthly_withdrawal_yen','annual_expense_inflation','relative_pension_schedule','relative_one_time_events']);
const PENSION_KEYS=new Set(['id','start_offset_months','end_offset_months','monthly_yen']);
const EVENT_KEYS=new Set(['id','offset_months','kind','amount_yen']);
function buildRelativeMonthlyCashflows(input,horizon_months){
 assertKeys(input,PLAN_KEYS,'cashflow_plan');
 if(!Number.isInteger(horizon_months)||horizon_months<1||horizon_months>MAX_MONTHS)throw Error('Invalid horizon_months');
 const contribution=money(input.monthly_contribution_yen??0,'monthly_contribution_yen');
 const expense=money(input.monthly_withdrawal_yen,'monthly_withdrawal_yen');
 const inflation=input.annual_expense_inflation??0;
 if(typeof inflation!=='number'||!Number.isFinite(inflation)||inflation< -0.5||inflation>1)throw Error('Invalid annual_expense_inflation');
 const pensions=input.relative_pension_schedule??[];
 const events=input.relative_one_time_events??[];
 if(!Array.isArray(pensions)||pensions.length>MAX_PENSIONS)throw Error('Invalid relative_pension_schedule');
 if(!Array.isArray(events)||events.length>MAX_EVENTS)throw Error('Invalid relative_one_time_events');
 const pensionIds=new Set(),eventIds=new Set();
 const parsedPensions=pensions.map((p,i)=>{
   assertKeys(p,PENSION_KEYS,'pension '+i);id(p.id,'pension id');
   if(pensionIds.has(p.id))throw Error('Duplicate pension id '+p.id);pensionIds.add(p.id);
   const start=money(p.start_offset_months,'start_offset_months');
   const end=p.end_offset_months===undefined?horizon_months-1:money(p.end_offset_months,'end_offset_months');
   if(start>=horizon_months||end>=horizon_months||end<start)throw Error('Pension outside rolling horizon or end before start');
   return {start,end,monthly:money(p.monthly_yen,'pension monthly_yen')};
 });
 const byOffset=new Map();
 for(const [i,e] of events.entries()){
   assertKeys(e,EVENT_KEYS,'event '+i);id(e.id,'event id');
   if(eventIds.has(e.id))throw Error('Duplicate event id '+e.id);eventIds.add(e.id);
   const at=money(e.offset_months,'offset_months');
   if(at>=horizon_months)throw Error('Event outside rolling horizon');
   if(!['INCOME','EXPENSE'].includes(e.kind))throw Error('Invalid event kind');
   const amount=money(e.amount_yen,'event amount_yen');
   const prev=byOffset.get(at)||{income:0,expense:0};
   prev[e.kind==='INCOME'?'income':'expense']=safeAdd(prev[e.kind==='INCOME'?'income':'expense'],amount,'events at '+at);
   byOffset.set(at,prev);
 }
 const values=[];
 for(let i=0;i<horizon_months;i++){
   const living=yenRound(expense*Math.pow(1+inflation,i/12),'living expense month '+i);
   let pension=0;for(const p of parsedPensions)if(i>=p.start&&i<=p.end)pension=safeAdd(pension,p.monthly,'pension month '+i);
   const event=byOffset.get(i)||{income:0,expense:0};
   const income=safeAdd(safeAdd(contribution,pension,'income pension'),event.income,'income event');
   const spending=safeAdd(living,event.expense,'expense event');
   values.push({offset_months:i,contribution_yen:income,withdrawal_yen:spending,
     breakdown:{regular_contribution_yen:contribution,pension_yen:pension,one_time_income_yen:event.income,
       living_expense_yen:living,one_time_expense_yen:event.expense}});
 }
 return values;
}
function validateMarketSeries(rows,assets,market_mode){
 if(!['OBSERVED_RESEARCH','SYNTHETIC_DEMO'].includes(market_mode))throw Error('Invalid market_mode');
 if(!Array.isArray(rows)||!rows.length||rows.length>MAX_MONTHS)throw Error('Expected 1..1200 market months');
 const required=market_mode==='OBSERVED_RESEARCH'?'OBSERVED':'SYNTHETIC';
 const ids=Object.keys(obj(assets.initial_holdings_yen,'initial_holdings_yen')).sort();
 let prev=null,gaps=0;
 const positions=[];
 for(const [i,row] of rows.entries()){
   assertKeys(row,new Set(['month','origin','asset_returns','proxy','estimated']),'market row '+i);
   const at=monthSerial(row.month);
   if(prev!==null&&at<=prev)throw Error('Repeated or out-of-order market month '+row.month);
   if(prev!==null&&at>prev+1)gaps++;
   prev=at;
   if(row.origin!==required||row.proxy===true||row.estimated===true)throw Error('Mixed, proxy or estimated market provenance');
   const values=obj(row.asset_returns,'asset_returns');
   if(Object.keys(values).length!==ids.length||ids.some(k=>!Object.prototype.hasOwnProperty.call(values,k)))throw Error('Return asset coverage mismatch');
   for(const assetId of ids){const rate=values[assetId];if(typeof rate!=='number'||!Number.isFinite(rate)||rate< -1||rate>10)throw Error('Invalid return for '+assetId+' '+row.month);}
   positions.push(at);
 }
 return {positions,gap_boundaries:gaps};
}
function runRollingPortfolioLifecycle({monthly_market_returns,horizon_months,portfolio,cashflow_plan,market_mode='SYNTHETIC_DEMO'}={}){
 if(!Number.isInteger(horizon_months)||horizon_months<1||horizon_months>MAX_MONTHS)throw Error('Invalid horizon_months');
 assertKeys(portfolio,PORTFOLIO_KEYS,'portfolio');
 const plan=buildRelativeMonthlyCashflows(cashflow_plan,horizon_months);
 const market=validateMarketSeries(monthly_market_returns,portfolio,market_mode);
 // Validate portfolio policy, asset IDs, weights and rebalance even if no complete rolling window exists.
 validateInput({...portfolio,monthly_returns:[monthly_market_returns[0]],market_mode,
   monthly_cashflows:[{month:monthly_market_returns[0].month,contribution_yen:plan[0].contribution_yen,withdrawal_yen:plan[0].withdrawal_yen}]});
 const windows=[];
 let blockStart=0;
 for(let i=1;i<=monthly_market_returns.length;i++){
   if(i<monthly_market_returns.length&&market.positions[i]===market.positions[i-1]+1)continue;
   for(let start=blockStart;start+horizon_months<=i;start++){
     const selected=monthly_market_returns.slice(start,start+horizon_months);
     const monthly_cashflows=plan.map((x,k)=>({month:selected[k].month,contribution_yen:x.contribution_yen,withdrawal_yen:x.withdrawal_yen}));
     const simulation=simulatePortfolio({...portfolio,monthly_returns:selected,monthly_cashflows,market_mode});
     const firstShortfallOffset=simulation.rows.findIndex(x=>x.unfunded_yen>0);
     windows.push({market_start_month:selected[0].month,market_end_month:selected.at(-1).month,
       ending_assets_yen:simulation.ending_assets_yen,status:simulation.status,
       total_unfunded_yen:simulation.total_unfunded_yen,shortfall_months:simulation.shortfall_months,
       first_shortfall_offset_months:firstShortfallOffset===-1?null:firstShortfallOffset,
       rebalance_count:simulation.rows.filter(x=>x.rebalance_executed).length,
       total_turnover_yen:simulation.rows.reduce((s,x)=>safeAdd(s,x.rebalance_turnover_yen,'rolling turnover'),0)});
   }
   blockStart=i;
 }
 const theoretical=Math.max(0,market.positions.at(-1)-market.positions[0]-horizon_months+2);
 const funded=windows.filter(x=>x.status==='FUNDED').length;
 return {status:windows.length?'EVALUATED':'INSUFFICIENT_CONTIGUOUS_HISTORY',
   market_mode,publication_approved:false,source_rights_approved:false,provenance_verified:false,
   market_path_provenance:market_mode==='SYNTHETIC_DEMO'?'SYNTHETIC':'OBSERVED_USER_ASSERTED_UNVERIFIED',
   life_plan_provenance:'SYNTHETIC_ASSUMPTIONS',future_probability_claim:false,
   notice: market_mode==='SYNTHETIC_DEMO'?'Synthetic paths and cashflows; demo frequency is not historical or predictive.':'Only self-declared observed paths; requires separate source, FX, CPI and rights QA. Overlapping windows are not future probabilities.',
   horizon_months,first_market_month:monthly_market_returns[0].month,
   last_market_month:monthly_market_returns.at(-1).month,market_months:monthly_market_returns.length,
   gap_boundaries:market.gap_boundaries,theoretical_windows_if_no_gaps:theoretical,
   complete_windows:windows.length,excluded_windows_due_to_missing_months:theoretical-windows.length,
   funded_windows:funded,shortfall_windows:windows.length-funded,
   historical_funded_fraction:market_mode==='OBSERVED_RESEARCH'&&windows.length?funded/windows.length:null,
   demo_funded_fraction:market_mode==='SYNTHETIC_DEMO'&&windows.length?funded/windows.length:null,
   event_semantics:'OFFSET_ZERO_IS_MONTH_1_OF_EACH_MARKET_WINDOW',windows};
}
module.exports={buildRelativeMonthlyCashflows,validateMarketSeries,runRollingPortfolioLifecycle};
