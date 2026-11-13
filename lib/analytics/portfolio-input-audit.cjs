'use strict';
/**
 * v0.15 external-input concordance audit. Compare a portfolio ledger against its
 * ORIGINAL independent inputs, not just mutually consistent fields in that ledger.
 * No market data acquisition, validation of issuer truth, rights clearance, or I/O.
 */
const {validateInput}=require('./portfolio-core.cjs');
const {auditPortfolioLedger}=require('./portfolio-ledger-audit.cjs');
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const fail=(label)=>{throw Error('INPUT_AUDIT_MISMATCH: '+label);};
const eq=(a,b,label)=>{if(!Object.is(a,b))fail(label);};
const safe=(value,label)=>{
  if(!Number.isSafeInteger(value)||value<0||value>1_000_000_000_000)fail('unsafe integer '+label);
  return value;
};
/** Independently implement largest-remainder with deterministic alphabetical tie ordering. */
function allocate(total,shares,ids){
  safe(total,'allocation total');
  if(!Array.isArray(shares)||shares.length!==ids.length)fail('allocation size');
  const scaled=shares.map(s=>total*s);
  if(scaled.some(v=>!Number.isFinite(v)||v<0))fail('allocation shares');
  const integer=scaled.map(v=>Math.floor(v));
  const left=total-integer.reduce((x,y)=>x+y,0);
  if(!Number.isSafeInteger(left)||left<0||left>integer.length)fail('allocation residual');
  const fractions=scaled.map((v,i)=>({i,extra:v-integer[i],name:ids[i]}));
  fractions.sort((a,b)=>b.extra-a.extra||a.name.localeCompare(b.name,'en'));
  for(let i=0;i<left;i++)integer[fractions[i].i]++;
  return integer;
}
function auditPortfolioAgainstInputs(input,simulation){
  const original=validateInput(input); // Schema validation is shared; value reconciliation below is separate.
  const internal=auditPortfolioLedger(simulation);
  const ids=original.ids;
  if(!Array.isArray(simulation.assets)||simulation.assets.length!==ids.length||
      simulation.assets.some((asset,i)=>asset!==ids[i]))fail('asset identity/order');
  eq(simulation.market_mode,original.marketMode,'market mode');
  eq(simulation.rebalance_mode,original.rebalance.mode,'rebalance mode');
  eq(simulation.cashflow_mode,original.cashflows?'MONTHLY_SCHEDULE':'FIXED_MONTHLY','cashflow mode');
  eq(simulation.cashflow_timing,original.cashflowTiming,'cashflow timing');
  eq(simulation.publication_approved,false,'publication gate');
  eq(simulation.provenance_verified,false,'source origin not independently verified');
  eq(simulation.rows.length,original.returns.length,'market observation count');
  const weights=original.weights;
  let last=original.holdings.slice(),turnover=0,rebalanceCount=0,requestedTotal=0;
  for(let i=0;i<original.returns.length;i++){
    const market=original.returns[i],row=simulation.rows[i],label=market.month;
    eq(row.month,label,'market calendar '+i);
    for(let j=0;j<ids.length;j++)eq(row.holdings[ids[j]].opening_yen,last[j],'initial/rolling holdings '+label+' '+ids[j]);
    const contribution=original.cashflows?original.cashflows[i].contribution_yen:original.contribution;
    const requested=original.cashflows?original.cashflows[i].withdrawal_yen:original.withdrawal;
    eq(row.contribution_yen,contribution,'external contribution '+label);
    eq(row.requested_withdrawal_yen,requested,'external requested withdrawal '+label);
    requestedTotal+=requested;
    if(!Number.isSafeInteger(requestedTotal))fail('lifetime requested overflow');
    const allocated=allocate(contribution,weights,ids);
    const startPhase=original.cashflowTiming==='MONTH_START';
    const afterMarketBeforeCash=last.map((x,j)=>Math.round(x*(1+market.rates[j])));
    const available=startPhase?last.map((x,j)=>safe(x+allocated[j],'available '+label+' '+ids[j])):
      afterMarketBeforeCash.map((x,j)=>safe(x+allocated[j],'available end '+label+' '+ids[j]));
    const amount=available.reduce((a,b)=>a+b,0);
    safe(amount,'total available '+label);
    const pay=Math.min(amount,requested);
    eq(row.paid_withdrawal_yen,pay,'external paid withdrawal '+label);
    const withdrawn=amount===0?ids.map(()=>0):allocate(pay,available.map(x=>x/amount),ids);
    const preValues=available.map((x,j)=>x-withdrawn[j]);
    const after=startPhase?preValues.map((x,j)=>Math.round(x*(1+market.rates[j]))):preValues;
    after.forEach((v,j)=>safe(v,'postmarket or postcash '+label+' '+ids[j]));
    const afterTotal=after.reduce((a,b)=>a+b,0);
    safe(afterTotal,'postmarket and cash total '+label);
    const postWeights=afterTotal?after.map(x=>x/afterTotal):weights;
    const policy=original.rebalance;
    const expectedRebalance=policy.mode==='PERIODIC'?((i+1)%policy.interval_months===0):
       policy.mode==='THRESHOLD'&&afterTotal>0&&postWeights.some((w,j)=>Math.abs(w-weights[j])>policy.threshold);
    eq(row.rebalance_executed,expectedRebalance,'external rebalance trigger '+label);
    const closing=expectedRebalance?allocate(afterTotal,weights,ids):after;
    const expectedTurnover=expectedRebalance?closing.reduce((a,x,j)=>a+Math.max(0,x-after[j]),0):0;
    eq(row.rebalance_turnover_yen,expectedTurnover,'external rebalance turnover '+label);
    // Reconcile original per-asset source inputs before aggregate values for actionable QA.
    for(let j=0;j<ids.length;j++){
      const id=ids[j],asset=row.holdings[id];
      eq(asset.opening_yen,last[j],'initial/rolling holdings '+label+' '+id);
      eq(asset.contribution_yen,allocated[j],'target contribution allocation '+label+' '+id);
      eq(asset.withdrawal_yen,withdrawn[j],'proportional withdrawal allocation '+label+' '+id);
      eq(asset.market_return,market.rates[j],'source market return '+label+' '+id);
      eq(asset.before_rebalance_yen,after[j],'post return rounding '+label+' '+id);
      eq(asset.closing_yen,closing[j],'target rebalance allocation '+label+' '+id);
    }
    eq(row.pre_rebalance_yen,afterTotal,'external gross market/cash close '+label);
    eq(row.invested_before_return_yen,startPhase?preValues.reduce((a,b)=>a+b,0):last.reduce((a,b)=>a+b,0),'external pre-return base '+label);
    eq(row.investment_gain_yen,(startPhase?afterTotal:afterMarketBeforeCash.reduce((a,b)=>a+b,0))-row.invested_before_return_yen,'external market gain '+label);
    eq(row.closing_yen,afterTotal,'external closing gross '+label);
    last=closing;
    turnover+=expectedTurnover;
    if(!Number.isSafeInteger(turnover))fail('lifetime turnover overflow');
    if(expectedRebalance)rebalanceCount++;
  }
  for(let j=0;j<ids.length;j++)eq(simulation.ending_holdings_yen[ids[j]],last[j],'final asset '+ids[j]);
  return {schema:'ANALYTICS_PORTFOLIO_EXTERNAL_INPUT_CONCORDANCE_V0_15',
    status:'INPUT_CONCORDANCE_AND_INTERNAL_LEDGER_PASSED',checked_months:original.returns.length,
    checked_asset_months:original.returns.length*ids.length,rebalance_count:rebalanceCount,
    independently_reconciled_turnover_yen:turnover,total_requested_withdrawals_yen:requestedTotal,
    ending_assets_yen:internal.ending_assets_yen,publication_approved:false,
    original_market_source_authenticated:false,source_rights_approved:false,
    methodology:'Independent input-to-ledger deterministic re-simulation. Input values themselves require external provenance and raw-byte QA.',
    caveat:'Nominal JPY gross returns only; no taxes, fees, FX or real-world investment product certifications.'};
}
module.exports={auditPortfolioAgainstInputs};
