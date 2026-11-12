'use strict';
/** v0.17 regression suite: provenance MUST NOT be laundered by the series alignment adapter. */
const test=require('node:test');
const assert=require('node:assert/strict');
const {preparePrivateMonthlyMarket}=require('../lib/analytics/private-historical-adapter.cjs');
const {runRollingPortfolioLifecycle}=require('../lib/analytics/rolling-portfolio-lifecycle.cjs');
const {compareRollingPortfolioPlans}=require('../lib/analytics/rolling-portfolio-compare.cjs');
const registry=()=>({version:'0.2.0',assets:[
 {asset_id:'US_EQUITY',provider_id:'SPDJI',series_kind:'INDEX_TOTAL_RETURN',research_fallback:'SHILLER_LEGACY'},
 {asset_id:'JP_EQUITY',provider_id:'JPX',series_kind:'INDEX_TOTAL_RETURN',research_fallback:null}
]});
function series(asset_id='US_EQUITY'){
 const provider=asset_id==='US_EQUITY'?'SHILLER_LEGACY':'JPX';
 return {asset_id,metadata:{source_id:provider,source_mode:asset_id==='US_EQUITY'?'EXPLICIT_RESEARCH_FALLBACK':'LOCKED_SOURCE',
   return_kind:asset_id==='US_EQUITY'?'RESEARCH_APPROX_RETURN':'INDEX_TOTAL_RETURN',currency:'JPY',return_unit:'DECIMAL_MONTHLY',
   source_url:'https://example.org/research',publisher:'SYNTHETIC_TEST_ONLY',retrieved_at:'2026-11-11T00:00:00Z',
   raw_sha256:'f'.repeat(64),data_qa_passed:true,private_research_authorized:true,observed:true},
 monthly_returns:['2020-01','2020-02','2020-03'].map(month=>({month,monthly_return:0.01,origin:'OBSERVED'}))};
}
const run=(s,reg=registry())=>preparePrivateMonthlyMarket({series:s,source_registry:reg});
const copy=x=>structuredClone(x);
test('the minimal valid single-asset fixture still passes, not independently authenticated',()=>{
 const r=run([series()]);assert.equal(r.provenance_schema_enforced,true);
 assert.deepEqual(r.market_rows.map(x=>x.month),['2020-01','2020-02','2020-03']);
 assert.equal(r.upstream_claims_verified_here,false);assert.equal(r.source_rights_approved,false);
});
test('explicit boolean false flags at metadata AND row level are permitted',()=>{
 const s=series();Object.assign(s.metadata,{proxy:false,estimated:false});
 for(const row of s.monthly_returns)Object.assign(row,{proxy:false,estimated:false});
 assert.equal(run([s]).common_return_months,3);
});
test('metadata proxy taint values cannot be discarded at alignment boundary',()=>{
 for(const bad of ['yes','false',1,0,null,undefined,true,{},[]]){
  const s=series();s.metadata.proxy=bad;
  assert.throws(()=>run([s]),/Non-observed proxy or estimated metadata/);
 }
});
test('metadata estimated taint values cannot be discarded',()=>{
 for(const bad of ['yes','false',1,0,null,undefined,true]){
  const s=series();s.metadata.estimated=bad;
  assert.throws(()=>run([s]),/Non-observed proxy or estimated metadata/);
 }
});
test('row-level proxy taint cannot be promoted to clean OBSERVED output',()=>{
 for(const bad of ['yes','false',1,0,null,undefined,true,{},[]]){
  const s=series();s.monthly_returns[1].proxy=bad;
  assert.throws(()=>run([s]),/Non-observed proxy or estimated metadata/);
 }
});
test('row-level estimated taint cannot be promoted to clean OBSERVED output',()=>{
 for(const bad of ['yes','false',1,0,null,undefined,true]){
  const s=series();s.monthly_returns[1].estimated=bad;
  assert.throws(()=>run([s]),/Non-observed proxy or estimated metadata/);
 }
});
test('unknown series-level observation flags are rejected rather than silently stripped',()=>{
 const s=series();s.assumed=true;
 assert.throws(()=>run([s]),/Unsupported series field/);
});
test('unknown metadata flags are rejected rather than silently stripped',()=>{
 const s=series();s.metadata.is_estimated=true;
 assert.throws(()=>run([s]),/Unsupported metadata field/);
});
test('unknown observation flags are rejected rather than silently stripped',()=>{
 const s=series();s.monthly_returns[0].interpolated=true;
 assert.throws(()=>run([s]),/Unsupported monthly return field/);
});
test('duplicate asset IDs in canonical source registry are rejected instead of last-one-wins',()=>{
 const reg=registry();reg.assets.push(copy(reg.assets[0]));
 assert.throws(()=>run([series()],reg),/Duplicate canonical asset ID/);
});
test('malformed asset registry row is rejected',()=>{
 const reg=registry();reg.assets[1]=null;
 assert.throws(()=>run([series()],reg),/Expected object canonical asset/);
});
test('multiasset intersection rejects row taint even if month is absent in second asset',()=>{
 const s1=series(),s2=series('JP_EQUITY');
 s1.monthly_returns[0].proxy='yes';s2.monthly_returns.shift();
 assert.throws(()=>run([s1,s2]),/Non-observed proxy or estimated metadata/);
});
test('multiasset intersection with clean flags and a gap remains research-only',()=>{
 const s1=series(),s2=series('JP_EQUITY');s1.monthly_returns[1].proxy=false;
 s2.monthly_returns.splice(1,1);const r=run([s1,s2]);
 assert.deepEqual(r.market_rows.map(x=>x.month),['2020-01','2020-03']);
 assert.equal(r.market_rows.every(x=>x.origin==='OBSERVED'),true);
 assert.equal(r.common_return_months,2);
});
test('clean series can still feed rolling portfolio research with no publication approval',()=>{
 const r=run([series()]);const out=runRollingPortfolioLifecycle({market_mode:r.market_mode,
  monthly_market_returns:r.market_rows,horizon_months:2,
  portfolio:{initial_holdings_yen:{US_EQUITY:1000},target_weights:{US_EQUITY:1}},
  cashflow_plan:{monthly_withdrawal_yen:100}});
 assert.equal(out.complete_windows,2);assert.equal(out.publication_approved,false);
});
test('clean multiasset series remains suitable for controlled portfolio comparison',()=>{
 const r=run([series(),series('JP_EQUITY')]);
 const initial_holdings_yen={US_EQUITY:1000,JP_EQUITY:1000};
 const plans=[0,1].map((n)=>({id:'case'+n,portfolio:{initial_holdings_yen,
  target_weights:n?{US_EQUITY:0.3,JP_EQUITY:0.7}:{US_EQUITY:0.5,JP_EQUITY:0.5}},
  cashflow_plan:{monthly_withdrawal_yen:100}}));
 const result=compareRollingPortfolioPlans({monthly_market_returns:r.market_rows,horizon_months:2,market_mode:r.market_mode,plans});
 assert.equal(result.complete_windows,2);assert.equal(result.publication_approved,false);
});
test('source registry is not mutated during provenance validation failure',()=>{
 const reg=registry(),prior=JSON.stringify(reg);const s=series();s.monthly_returns[0].estimated=1;
 assert.throws(()=>run([s],reg),/Non-observed proxy or estimated metadata/);
 assert.equal(JSON.stringify(reg),prior);
});
test('source series not mutated when clean data is accepted',()=>{
 const s=series();const prior=JSON.stringify(s);run([s]);assert.equal(JSON.stringify(s),prior);
});
