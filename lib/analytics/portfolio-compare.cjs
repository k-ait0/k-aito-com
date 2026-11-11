'use strict';
/** Controlled strategy comparison: all cases share EXACTLY one input market path. Research only. */
const {simulatePortfolio}=require('./portfolio-core.cjs');
const ALLOWED=new Set(['id','label','initial_holdings_yen','target_weights','monthly_contribution_yen','monthly_withdrawal_yen','rebalance']);
function safeDelta(a,b,label){const n=a-b;if(!Number.isSafeInteger(n))throw Error('Unsafe delta '+label);return n;}
function comparePortfolioStrategies({scenarios,baseline_id,monthly_returns,market_mode='SYNTHETIC_DEMO'}={}){
 if(!Array.isArray(scenarios)||scenarios.length<2||scenarios.length>8)throw Error('scenarios must have 2..8 cases');
 const seen=new Set();let universe=null;
 const cases=scenarios.map((s,i)=>{
   if(!s||typeof s!=='object'||Array.isArray(s))throw Error('Invalid scenario '+i);
   if(typeof s.id!=='string'||!(/^[A-Za-z][A-Za-z0-9_-]{0,39}$/).test(s.id)||['constructor','prototype','__proto__'].includes(s.id))throw Error('Invalid scenario id');
   if(seen.has(s.id))throw Error('Duplicate scenario id');seen.add(s.id);
   if(s.label!==undefined&&(typeof s.label!=='string'||s.label.length>80))throw Error('Invalid label');
   for(const k of Object.keys(s))if(!ALLOWED.has(k))throw Error('Unsupported portfolio scenario input: '+k);
   const {id,label,...inputs}=s;
   const declared=inputs.initial_holdings_yen&&typeof inputs.initial_holdings_yen==='object'&&!Array.isArray(inputs.initial_holdings_yen)?Object.keys(inputs.initial_holdings_yen).sort().join('|'):null;
   if(universe!==null&&declared!==universe)throw Error('Different asset universes cannot be compared directly');
   const result=simulatePortfolio({...inputs,monthly_returns,market_mode});
   const sorted=result.assets.join('|');
   if(universe===null)universe=sorted;else if(universe!==sorted)throw Error('Different asset universes cannot be compared directly');
   return {id,label:label??id,result};
 });
 const baseline=baseline_id===undefined?cases[0]:cases.find(x=>x.id===baseline_id);
 if(!baseline)throw Error('Unknown baseline_id');
 const paid=r=>r.rows.reduce((n,x)=>n+x.paid_withdrawal_yen,0);
 const turn=r=>r.rows.reduce((n,x)=>n+x.rebalance_turnover_yen,0);
 const base=baseline.result;
 const sums=cases.map(c=>({id:c.id,label:c.label,status:c.result.status,
   ending_assets_yen:c.result.ending_assets_yen,total_unfunded_yen:c.result.total_unfunded_yen,
   total_paid_withdrawal_yen:paid(c.result),total_rebalance_turnover_yen:turn(c.result),
   first_shortfall_month:c.result.first_shortfall_month}));
 const baseSum=sums.find(x=>x.id===baseline.id);
 const summary=sums.map(x=>({...x,delta_vs_baseline:{
   ending_assets_yen:safeDelta(x.ending_assets_yen,baseSum.ending_assets_yen,x.id+' final'),
   total_unfunded_yen:safeDelta(x.total_unfunded_yen,baseSum.total_unfunded_yen,x.id+' unmet'),
   total_rebalance_turnover_yen:safeDelta(x.total_rebalance_turnover_yen,baseSum.total_rebalance_turnover_yen,x.id+' turnover')
 }}));
 const timeline=base.rows.map((row,i)=>({month:row.month,scenarios:cases.map(c=>({id:c.id,
   closing_yen:c.result.rows[i].closing_yen,
   total_unfunded_yen:c.result.rows[i].unfunded_yen,
   rebalanced:c.result.rows[i].rebalance_executed,
   delta_closing_vs_baseline_yen:safeDelta(c.result.rows[i].closing_yen,row.closing_yen,c.id+' '+row.month)
 }))}));
 return {status:'RESEARCH_ONLY_HOLD',publication_approved:false,provenance_verified:false,market_mode,
   comparison_mode:'CONTROLLED_SINGLE_SHARED_MARKET_PATH',attribution:'CASHFLOWS_ALLOCATION_AND_REBALANCING_JOINTLY',
   notice:'Not an investment recommendation or forecast. Fees, taxes, FX, and real-world data rights are NOT included.',
   baseline_id:baseline.id,asset_ids:base.assets,horizon_months:base.horizon_months,summary,timeline};
}
module.exports={comparePortfolioStrategies};
