'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {preparePrivateMonthlyMarket}=require('../lib/analytics/private-historical-adapter.cjs');
const {runRollingPortfolioLifecycle}=require('../lib/analytics/rolling-portfolio-lifecycle.cjs');
const registry={version:'0.2.0',assets:[
 {asset_id:'US_EQUITY',provider_id:'SPDJI',series_kind:'INDEX_TOTAL_RETURN',research_fallback:'SHILLER_LEGACY'},
 {asset_id:'JP_EQUITY',provider_id:'JPX',series_kind:'INDEX_TOTAL_RETURN',research_fallback:null},
 {asset_id:'GOLD',provider_id:'WORLD_BANK_PINK',series_kind:'COMMODITY_SPOT',research_fallback:null},
 {asset_id:'CASH_SHORT',provider_id:'BOJ',series_kind:'RATE_MODEL_NOT_TR',research_fallback:null}]};
const metadata=(source_id='SPDJI',return_kind='INDEX_TOTAL_RETURN')=>({source_id,source_mode:'LOCKED_SOURCE',return_kind,currency:'JPY',return_unit:'DECIMAL_MONTHLY',raw_sha256:'a'.repeat(64),source_url:'https://example.invalid/source',publisher:'TEST_DATA_ONLY',retrieved_at:'2026-11-11T00:00:00Z',data_qa_passed:true,private_research_authorized:true,observed:true});
const series=(asset_id='US_EQUITY',return_kind='INDEX_TOTAL_RETURN',provider='SPDJI',months=['2020-01','2020-02','2020-03'])=>({asset_id,metadata:metadata(provider,return_kind),monthly_returns:months.map(month=>({month,origin:'OBSERVED',monthly_return:0}))});
const run=(seriesInput,reg=registry)=>preparePrivateMonthlyMarket({series:seriesInput,source_registry:reg});
test('single official-research source becomes private observed rows, not publishable',()=>{const x=run([series()]);assert.equal(x.market_mode,'OBSERVED_RESEARCH');assert.equal(x.common_return_months,3);assert.equal(x.market_rows[0].asset_returns.US_EQUITY,0);assert.equal(x.source_rights_approved,false);assert.equal(x.upstream_claims_verified_here,false)});
test('multiasset intersection uses only months present across all assets',()=>{const x=run([series(),series('JP_EQUITY','INDEX_TOTAL_RETURN','JPX',['2020-02','2020-03','2020-04'])]);assert.deepEqual(x.market_rows.map(r=>r.month),['2020-02','2020-03'])});
test('noncontiguous months remain holes for rolling window exclusion',()=>{const x=run([series('US_EQUITY','INDEX_TOTAL_RETURN','SPDJI',['2020-01','2020-02','2020-04','2020-05'])]);const y=runRollingPortfolioLifecycle({market_mode:x.market_mode,monthly_market_returns:x.market_rows,horizon_months:2,portfolio:{initial_holdings_yen:{US_EQUITY:1000},target_weights:{US_EQUITY:1}},cashflow_plan:{monthly_withdrawal_yen:100}});assert.equal(y.complete_windows,2);assert.equal(y.excluded_windows_due_to_missing_months,2)});
test('USD returns passed as JPY are rejected by metadata',()=>{const s=series();s.metadata.currency='USD';assert.throws(()=>run([s]),/converted to JPY/)});
test('commodity spot is never investable TR',()=>{const s=series('GOLD','COMMODITY_SPOT','WORLD_BANK_PINK');assert.throws(()=>run([s]),/not total return/)});
test('falsely declaring GOLD spot an index TR is rejected using canonical kind',()=>{const s=series('GOLD','INDEX_TOTAL_RETURN','WORLD_BANK_PINK');assert.throws(()=>run([s]),/does not match canonical/)});
test('yield-based cash proxy cannot be declared a total return',()=>{const s=series('CASH_SHORT','INDEX_TOTAL_RETURN','BOJ');assert.throws(()=>run([s]),/does not match canonical/)});
test('source lock mismatched provider fails closed',()=>assert.throws(()=>run([series('JP_EQUITY','INDEX_TOTAL_RETURN','SPDJI')]),/Source lock mismatch/));
test('research fallback must be explicitly marked and has approximate type',()=>{const s=series();s.metadata={...metadata('SHILLER_LEGACY','RESEARCH_APPROX_RETURN'),source_mode:'EXPLICIT_RESEARCH_FALLBACK'};const x=run([s]);assert.equal(x.series_metadata[0].source_mode,'EXPLICIT_RESEARCH_FALLBACK')});
test('implicit Shiller fallback not allowed',()=>assert.throws(()=>run([series('US_EQUITY','RESEARCH_APPROX_RETURN','SHILLER_LEGACY')]),/Source lock mismatch/));
test('research fallback cannot relabel approximate series as official TR',()=>{const s=series();s.metadata={...metadata('SHILLER_LEGACY','INDEX_TOTAL_RETURN'),source_mode:'EXPLICIT_RESEARCH_FALLBACK'};assert.throws(()=>run([s]),/requires explicit approximate/)});
test('fallback not approved for unrelated class',()=>{const s=series('JP_EQUITY','RESEARCH_APPROX_RETURN','SHILLER_LEGACY');s.metadata.source_mode='EXPLICIT_RESEARCH_FALLBACK';assert.throws(()=>run([s]),/Unapproved explicit research fallback/)});
test('source ID not present in registry is rejected',()=>assert.throws(()=>run([series('CUSTOM')]),/Asset not present/));
test('duplicate input asset ID rejected',()=>assert.throws(()=>run([series(),series()]),/Duplicate asset_id/));
test('empty month overlap fails, not a fake zero return series',()=>assert.throws(()=>run([series(),series('JP_EQUITY','INDEX_TOTAL_RETURN','JPX',['2023-01'])]),/No overlapping/));
test('unapproved research use or QA fails closed',()=>{for(const field of ['data_qa_passed','private_research_authorized']){const s=series();s.metadata[field]=false;assert.throws(()=>run([s]),/declarations must be explicit/)}});
test('bad SHA, return unit and missing origin rejected',()=>{let s=series();s.metadata.raw_sha256='bad';assert.throws(()=>run([s]),/SHA256/);s=series();s.metadata.return_unit='PERCENT';assert.throws(()=>run([s]),/DECIMAL/);s=series();s.monthly_returns[0].origin='SYNTHETIC';assert.throws(()=>run([s]),/Non-observed/)});
test('out of order, duplicate, NaN or missing returns rejected',()=>{let s=series();s.monthly_returns.reverse();assert.throws(()=>run([s]),/Unsorted/);s=series();s.monthly_returns[1].month='2020-01';assert.throws(()=>run([s]),/Unsorted/);s=series();s.monthly_returns[0].monthly_return=NaN;assert.throws(()=>run([s]),/Invalid monthly/)});
test('proxy and estimated rows rejected',()=>{for(const k of ['estimated','proxy']){const s=series();s.monthly_returns[0][k]=true;assert.throws(()=>run([s]),/Non-observed/)}});
test('the adapter does not alter the source registry',()=>{const before=JSON.stringify(registry);run([series()]);assert.equal(JSON.stringify(registry),before)});
