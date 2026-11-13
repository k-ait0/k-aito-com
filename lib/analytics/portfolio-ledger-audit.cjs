'use strict';
/** v0.14 independent accounting audit over a complete monthly portfolio ledger.
 * Read-only validator. Does NOT attest raw data, publishers, CPI, rights or licenses.
 */
const {monthSerial}=require('./cashflow-core.cjs');
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function obj(v,name){if(v===null||typeof v!=='object'||Array.isArray(v))throw Error('Audit invalid object '+name);return v;}
function integer(v,name,{negative=false}={}){
 if(!Number.isSafeInteger(v)||(!negative&&v<0)||Math.abs(v)>1_000_000_000_000)throw Error('Audit unsafe amount '+name);
 return v;
}
function equal(actual,expected,name){if(!Object.is(actual,expected))throw Error('Audit mismatch '+name+': '+actual+' vs '+expected);}
function sum(arr,name){const s=arr.reduce((a,b)=>a+b,0);return integer(s,name);}
function sumAcrossMonths(a,b,name){const total=a+b;if(!Number.isSafeInteger(total)||total<0)throw Error('Audit accumulated lifetime amount overflow '+name);return total;}
function auditPortfolioLedger(simulation){
 obj(simulation,'simulation');
 if(!Array.isArray(simulation.rows)||!simulation.rows.length||simulation.rows.length>1200)throw Error('Audit requires 1..1200 ledger rows');
 if(!Array.isArray(simulation.assets)||!simulation.assets.length||simulation.assets.length>12)throw Error('Audit invalid asset universe');
 if(new Set(simulation.assets).size!==simulation.assets.length)throw Error('Audit duplicate asset ID');
 const phase=simulation.cashflow_timing??'MONTH_START';
 if(!['MONTH_START','MONTH_END'].includes(phase))throw Error('Audit invalid cashflow timing');
 const startPhase=phase==='MONTH_START';
 const assets=[...simulation.assets].sort();
 equal(simulation.horizon_months,simulation.rows.length,'horizon');
 let prior=null,shortfallMonths=0,firstShortfall=null,totalUnfunded=0,totalTurnover=0,
   totalRequested=0,totalPaid=0,totalContribution=0,totalGain=0;
 for(const [idx,row] of simulation.rows.entries()){
   obj(row,'row '+idx);
   const at=monthSerial(row.month);
   if(prior!==null&&at!==prior.monthSerial+1)throw Error('Audit nonconsecutive month at '+row.month);
   const opening=integer(row.opening_yen,'opening '+row.month),contribution=integer(row.contribution_yen,'contribution '+row.month);
   const requested=integer(row.requested_withdrawal_yen,'requested '+row.month),paid=integer(row.paid_withdrawal_yen,'paid '+row.month);
   const unfunded=integer(row.unfunded_yen,'unfunded '+row.month),before=integer(row.invested_before_return_yen,'invested '+row.month);
   const gain=integer(row.investment_gain_yen,'gain '+row.month,{negative:true});
   const pre=integer(row.pre_rebalance_yen,'pre rebalance '+row.month),closing=integer(row.closing_yen,'closing '+row.month);
   const turnover=integer(row.rebalance_turnover_yen,'turnover '+row.month);
   if(prior!==null)equal(opening,prior.closing,'opening rollover '+row.month);
   if(paid>requested||paid>(startPhase?opening+contribution:before+gain+contribution))throw Error('Audit withdrawal exceeds availability '+row.month);
   equal(unfunded,requested-paid,'unfunded '+row.month);
   equal(before,startPhase?opening+contribution-paid:opening,'cashflow timing / investment base '+row.month);
   equal(pre,startPhase?before+gain:before+gain+contribution-paid,'investment and cashflow conservation '+row.month);
   equal(closing,pre,'rebalancing does not change gross wealth '+row.month);
   const holdings=obj(row.holdings,'holdings '+row.month);
   if(Object.keys(holdings).length!==assets.length||assets.some(id=>!own(holdings,id)))throw Error('Audit holdings asset coverage '+row.month);
   let openings=[],contributions=[],withdrawals=[],befores=[],closings=[],purchases=[];
   for(const id of assets){
     const x=obj(holdings[id],id+' '+row.month);
     const start=integer(x.opening_yen,id+' open'),paidIn=integer(x.contribution_yen,id+' contribution');
     const sold=integer(x.withdrawal_yen,id+' withdrawal'),beforeRb=integer(x.before_rebalance_yen,id+' market close');
     const end=integer(x.closing_yen,id+' closing'),rate=x.market_return;
     if(typeof rate!=='number'||!Number.isFinite(rate)||rate< -1||rate>10)throw Error('Audit invalid asset return '+id);
     if(prior!==null)equal(start,prior.holdings[id].closing_yen,'per-asset opening rollover '+id);
     if((startPhase?start+paidIn:Math.round(start*(1+rate))+paidIn)<sold)throw Error('Audit negative position after withdrawal '+id);
     const returnMoney=startPhase?Math.round((start+paidIn-sold)*(1+rate)):
       Math.round(start*(1+rate))+paidIn-sold;
     equal(beforeRb,returnMoney,'per-asset rounded market return '+id+' '+row.month);
     openings.push(start);contributions.push(paidIn);withdrawals.push(sold);befores.push(beforeRb);closings.push(end);
     purchases.push(Math.max(0,end-beforeRb));
   }
   equal(sum(openings,'all openings'),opening,'opening asset sum '+row.month);
   equal(sum(contributions,'all contributions'),contribution,'contribution asset sum '+row.month);
   equal(sum(withdrawals,'all withdrawals'),paid,'withdrawal asset sum '+row.month);
   equal(sum(befores,'all before-rebalance'),pre,'pre-rebalance asset sum '+row.month);
   equal(sum(closings,'all closings'),closing,'closing asset sum '+row.month);
   if(typeof row.rebalance_executed!=='boolean')throw Error('Audit missing boolean rebalance state');
   if(!row.rebalance_executed){equal(turnover,0,'no rebalance turnover');for(let i=0;i<assets.length;i++)equal(closings[i],befores[i],'no rebalance asset change');}
   else equal(turnover,sum(purchases,'one-way turnover'),'rebalance turnover '+row.month);
   totalUnfunded=sum([totalUnfunded,unfunded],'total unfunded');
   totalTurnover=sumAcrossMonths(totalTurnover,turnover,'total turnover');
   totalPaid=sumAcrossMonths(totalPaid,paid,'total paid');totalRequested=sumAcrossMonths(totalRequested,requested,'total requested');
   totalContribution=sumAcrossMonths(totalContribution,contribution,'total contributions');
   // Market gains may be negative: keep safe signed totals as well.
   totalGain+=gain;if(!Number.isSafeInteger(totalGain))throw Error('Audit market gain accumulated overflow');
   if(unfunded){shortfallMonths++;if(firstShortfall===null)firstShortfall=row.month;}
   prior={monthSerial:at,closing,holdings};
 }
 equal(simulation.ending_assets_yen,prior.closing,'ending total');
 const ending=obj(simulation.ending_holdings_yen,'ending holdings');
 if(Object.keys(ending).length!==assets.length||assets.some(id=>!own(ending,id)))throw Error('Audit ending assets coverage');
 for(const id of assets)equal(ending[id],prior.holdings[id].closing_yen,'final position '+id);
 equal(simulation.shortfall_months,shortfallMonths,'shortfall month count');
 equal(simulation.total_unfunded_yen,totalUnfunded,'total shortfall');
 equal(simulation.first_shortfall_month,firstShortfall,'first shortfall month');
 equal(simulation.status,shortfallMonths?'SHORTFALL':'FUNDED','funded status');
 return {schema:'ANALYTICS_PORTFOLIO_LEDGER_ACCOUNTING_AUDIT_V0_14',status:'INTERNAL_LEDGER_ARITHMETIC_PASSED',
   checked_months:simulation.rows.length,assets:assets.length,first_month:simulation.rows[0].month,
   last_month:simulation.rows.at(-1).month,ending_assets_yen:prior.closing,total_requested_withdrawals_yen:totalRequested,
   total_paid_withdrawals_yen:totalPaid,total_unfunded_yen:totalUnfunded,total_contributions_yen:totalContribution,
   total_gross_market_gain_yen:totalGain,total_one_way_rebalance_turnover_yen:totalTurnover,
   cashflow_timing:phase,source_origin_verified:false,publication_approved:false,
   note:'Checks internal arithmetic and rounding only. Does not certify market inputs, timing, CPI index revisions, taxes/fees, publisher rights or historical probability.'};
}
module.exports={auditPortfolioLedger};
