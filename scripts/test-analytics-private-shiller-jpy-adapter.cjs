'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {preparePrivateShillerJpyResearch}=require('../lib/analytics/private-shiller-jpy-adapter.cjs');
const {runRollingPortfolioLifecycle}=require('../lib/analytics/rolling-portfolio-lifecycle.cjs');
const {monthSerial,formatMonth}=require('../lib/analytics/cashflow-core.cjs');
const registry={version:'0.2.0',sources:{SHILLER_LEGACY:{},FED_BOARD:{},ESTAT:{}},assets:[
 {asset_id:'US_EQUITY',provider_id:'SPDJI',research_fallback:'SHILLER_LEGACY',series_kind:'INDEX_TOTAL_RETURN'}
],auxiliary:[{aux_id:'FX',provider_id:'FED_BOARD',series_kind:'FX_RATE',full_pinned_history_20261111:{raw_sha256:'b'.repeat(64),monthly_first:'2000-01',monthly_last_complete:'2026-10',provisional_month:'2026-11'}},
 {aux_id:'CPI_JP',provider_id:'ESTAT',series_kind:'CPI_LEVEL',actual_coverage:{cpi_headline:{raw_sha256:'c'.repeat(64),first_month:'1970-01',last_month:'2026-09'}}}],
 acquisition:{private_research_normalization_v04:{source_sha256:'a'.repeat(64)},verified_existing_research:{period:'1980-01/2023-06'}}};
const receipt=(source_id)=>({source_id,raw_sha256:({SHILLER_LEGACY:'a',FED_BOARD:'b',ESTAT:'c'}[source_id]||'a').repeat(64),source_url:({SHILLER_LEGACY:'https://github.com/datasets/s-and-p-500/blob/main/data/data.csv',FED_BOARD:'https://www.federalreserve.gov/releases/h10/hist/dat00_ja.htm',ESTAT:'https://www.e-stat.go.jp/stat-search/files'}[source_id]||'https://example.invalid'),publisher:'PRIVATE_TEST_ONLY',retrieved_at:'2026-11-11T01:00:00Z',data_qa_passed:true,private_research_authorized:true});
const manifest={
 usd:{...receipt('SHILLER_LEGACY'),return_kind:'RESEARCH_APPROX_RETURN',currency:'USD',method:'SHILLER_PRICE_PLUS_DIVIDEND_APPROX'},
 fx:{...receipt('FED_BOARD'),source_channel:'H10_ACTIVE_JAPAN_HISTORY',quote:'JPY_PER_USD',aggregation:'LAST_AVAILABLE_OBSERVED_IN_MONTH'},
 cpi:{...receipt('ESTAT'),country:'JP',basket:'HEADLINE_NSA',index_unit:'POSITIVE_INDEX_LEVEL'}
};
function inputs(){return {source_registry:registry,manifest,
 usd_monthly_returns:[{month:'2020-02',approx_total_return_usd:0.1},{month:'2020-03',approx_total_return_usd:0}],
 fx_monthly_levels:[{month:'2020-01',value:100,month_status:'COMPLETE_OBSERVED'},{month:'2020-02',value:120,month_status:'COMPLETE_OBSERVED'},{month:'2020-03',value:120,month_status:'COMPLETE_OBSERVED'}],
 jp_cpi_monthly_levels:[{month:'2020-01',value:100},{month:'2020-02',value:110},{month:'2020-03',value:110}]
};}
const run=(replace={})=>preparePrivateShillerJpyResearch({...inputs(),...replace});
const clone=x=>JSON.parse(JSON.stringify(x));
test('currency conversion exact math: 10% USD + 20% FX = 32% JPY',()=>{
 const x=run();assert.ok(Math.abs(x.market_rows[0].asset_returns.US_EQUITY-0.32)<1e-12);
 assert.ok(Math.abs(x.research_only_real_rows[0].approx_real_return_jpy-0.20)<1e-12);
 assert.equal(x.market_mode,'OBSERVED_RESEARCH');
});
test('JPY nominal, never CPI-deflated, is portfolio market input',()=>{
 const x=run();assert.ok(Math.abs(x.market_rows[0].asset_returns.US_EQUITY-0.32)<1e-12);
 assert.equal(x.real_returns_not_passed_as_nominal_market,true);
});
test('second month zero rate, matching flat FX/CPI',()=>{
 const x=run();assert.equal(x.market_rows[1].asset_returns.US_EQUITY,0);assert.equal(x.research_only_real_rows[1].approx_real_return_jpy,0);
});
test('all approval flags remain false and original bytes not certified',()=>{
 const x=run();for(const field of ['publication_approved','source_rights_approved','site_use_approved','upstream_claims_verified_here','raw_sha256_verified_against_bytes'])assert.equal(x[field],false);
});
test('usable 2-month market path feeds existing rolling Core',()=>{
 const x=run();const y=runRollingPortfolioLifecycle({market_mode:x.market_mode,monthly_market_returns:x.market_rows,horizon_months:1,
 portfolio:{initial_holdings_yen:{US_EQUITY:1000},target_weights:{US_EQUITY:1}},cashflow_plan:{monthly_withdrawal_yen:100}});
 assert.equal(y.complete_windows,2);assert.equal(y.publication_approved,false);
 assert.equal(y.windows[0].ending_assets_yen,1188);
});
test('missing previous FX is excluded, not set to zero',()=>{
 const x=inputs();x.fx_monthly_levels.shift();const r=run(x);
 assert.deepEqual(r.market_rows.map(z=>z.month),['2020-03']);assert.equal(r.excluded_months.missing_fx_level,1);
});
test('missing prior CPI is excluded without interpolation',()=>{
 const x=inputs();x.jp_cpi_monthly_levels.shift();const r=run(x);
 assert.deepEqual(r.market_rows.map(z=>z.month),['2020-03']);assert.equal(r.excluded_months.missing_jp_cpi_level,1);
});
test('provisional FX never flows into research market path',()=>{
 const x=inputs();x.fx_monthly_levels[2].month_status='LATEST_MONTH_PROVISIONAL';const r=run(x);
 assert.deepEqual(r.market_rows.map(z=>z.month),['2020-02']);assert.equal(r.excluded_months.provisional_fx,1);
});
test('unrecognized latest month status fails',()=>{
 const x=inputs();x.fx_monthly_levels[2].month_status='ASSUMED';assert.throws(()=>run(x),/month status/);
});
test('gap detected and not silently filled',()=>{
 const x=inputs();x.usd_monthly_returns.push({month:'2020-05',approx_total_return_usd:0});
 x.fx_monthly_levels.push({month:'2020-04',value:120,month_status:'COMPLETE_OBSERVED'}, {month:'2020-05',value:120,month_status:'COMPLETE_OBSERVED'});
 x.jp_cpi_monthly_levels.push({month:'2020-04',value:110},{month:'2020-05',value:110});
 const r=run(x);assert.equal(r.gap_boundaries,1);
 const y=runRollingPortfolioLifecycle({market_mode:r.market_mode,monthly_market_returns:r.market_rows,horizon_months:2,
 portfolio:{initial_holdings_yen:{US_EQUITY:1000},target_weights:{US_EQUITY:1}},cashflow_plan:{monthly_withdrawal_yen:0}});
 assert.equal(y.complete_windows,1);assert.equal(y.excluded_windows_due_to_missing_months,2);
});
test('unapproved Fed DDP channel is blocked (ADR draft)',()=>{
 const x=clone(manifest);x.fx.source_channel='H10_DDP_1971';assert.throws(()=>run({manifest:x}),/DRAFT source channel/);
});
test('inverted FX quote explicitly rejected',()=>{
 const x=clone(manifest);x.fx.quote='USD_PER_JPY';assert.throws(()=>run({manifest:x}),/wrong quote/);
});
test('FX monthly average not silently substituted for last observation',()=>{
 const x=clone(manifest);x.fx.aggregation='MONTHLY_AVERAGE';assert.throws(()=>run({manifest:x}),/wrong quote/);
});
test('US CPI rejected for Japan CPI',()=>{
 const x=clone(manifest);x.cpi.country='US';assert.throws(()=>run({manifest:x}),/Japanese headline/);
});
test('ex-rent Japanese CPI is distinct basket',()=>{
 const x=clone(manifest);x.cpi.basket='EX_IMPUTED_RENT';assert.throws(()=>run({manifest:x}),/Japanese headline/);
});
test('Shiller approximate return cannot be relabeled official TR',()=>{
 const x=clone(manifest);x.usd.return_kind='INDEX_TOTAL_RETURN';assert.throws(()=>run({manifest:x}),/approximate USD Shiller/);
});
test('USD currency label is mandatory',()=>{
 const x=clone(manifest);x.usd.currency='JPY';assert.throws(()=>run({manifest:x}),/approximate USD Shiller/);
});
test('wrong CPI/FX provider IDs rejected',()=>{
 const x=clone(manifest);x.cpi.source_id='BLS';assert.throws(()=>run({manifest:x}),/Wrong source ID/);
 const y=clone(manifest);y.fx.source_id='BOJ';assert.throws(()=>run({manifest:y}),/Wrong source ID/);
});
test('source registry lock cannot be silently changed',()=>{
 const x=clone(registry);x.assets[0].research_fallback=null;assert.throws(()=>run({source_registry:x}),/source lock has changed/);
});
test('source registry FX/CPI locks also enforced',()=>{
 const x=clone(registry);x.auxiliary[1].provider_id='BLS';assert.throws(()=>run({source_registry:x}),/CPI_JP source lock/);
});
test('data QA and private rights must be declared',()=>{
 const x=clone(manifest);x.fx.private_research_authorized=false;assert.throws(()=>run({manifest:x}),/not explicitly authorized/);
});
test('bad SHA self-attestation rejected',()=>{
 const x=clone(manifest);x.usd.raw_sha256='no';assert.throws(()=>run({manifest:x}),/Invalid SHA256/);
});
test('no accepting HTTP source URL',()=>{
 const x=clone(manifest);x.usd.source_url='http://example.invalid';assert.throws(()=>run({manifest:x}),/HTTPS/);
});
test('nonpositive FX and CPI rejected',()=>{
 const x=inputs();x.fx_monthly_levels[1].value=0;assert.throws(()=>run(x),/Invalid positive FX/);
 const y=inputs();y.jp_cpi_monthly_levels[1].value=-1;assert.throws(()=>run(y),/Invalid positive CPI/);
});
test('nonfinite and <-100% returns rejected',()=>{
 for(const bad of [NaN,Infinity,-1.1]){const x=inputs();x.usd_monthly_returns[0].approx_total_return_usd=bad;assert.throws(()=>run(x),/Invalid approximate USD return/);}
});
test('duplicate and unsorted USD/FX/CPI months rejected',()=>{
 for(const key of ['usd_monthly_returns','fx_monthly_levels','jp_cpi_monthly_levels']){
  const x=inputs();x[key][1].month=x[key][0].month;assert.throws(()=>run(x),/Duplicate or unsorted/);
 }
});
test('missing overlap gives explicit failure',()=>{
 const x=inputs();x.fx_monthly_levels=[{month:'2010-01',value:100,month_status:'COMPLETE_OBSERVED'}];assert.throws(()=>run(x),/No complete observed/);
});
test('source inputs are never mutated',()=>{
 const x=inputs(),before=JSON.stringify(x);run(x);assert.equal(JSON.stringify(x),before);
});
test('canonical FX 2000+ plus Shiller 2023 endpoint gives 281 return months and NO 360-month windows',()=>{
 const months=Array.from({length:282},(_,i)=>formatMonth(monthSerial('2000-01')+i));
 const x=inputs();x.usd_monthly_returns=months.slice(1).map(month=>({month,approx_total_return_usd:0}));
 x.fx_monthly_levels=months.map(month=>({month,value:100,month_status:'COMPLETE_OBSERVED'}));
 x.jp_cpi_monthly_levels=months.map(month=>({month,value:100}));
 const r=run(x);assert.equal(r.common_return_months,281);
 const rolling=runRollingPortfolioLifecycle({market_mode:r.market_mode,monthly_market_returns:r.market_rows,horizon_months:360,
 portfolio:{initial_holdings_yen:{US_EQUITY:1000000},target_weights:{US_EQUITY:1}},cashflow_plan:{monthly_withdrawal_yen:1000}});
 assert.equal(rolling.complete_windows,0);assert.equal(rolling.historical_funded_fraction,null);
});

test('pinned raw checksums cannot differ from the canonical registry',()=>{
 const x=clone(manifest);x.fx.raw_sha256='f'.repeat(64);
 assert.throws(()=>run({manifest:x}),/SHA256 does not match/);
});
test('canonical registry missing raw fingerprint is not accepted',()=>{
 const x=clone(registry);delete x.auxiliary[0].full_pinned_history_20261111.raw_sha256;
 assert.throws(()=>run({source_registry:x}),/provenance pins absent/);
});
test('Fed noncanonical URL not treated as original source',()=>{
 const x=clone(manifest);x.fx.source_url='https://www.federalreserve.gov/datadownload/Output.aspx?rel=H10';
 assert.throws(()=>run({manifest:x}),/pinned active H10 source/);
});
test('e-Stat provenance cannot be replaced by unapproved website',()=>{
 const x=clone(manifest);x.cpi.source_url='https://example.invalid/not-e-stat';
 assert.throws(()=>run({manifest:x}),/e-Stat source/);
});
test('Shiller source cannot extend beyond verified June 2023 raw snapshot',()=>{
 const x=inputs();x.usd_monthly_returns=[{month:'2023-07',approx_total_return_usd:0}];
 assert.throws(()=>run(x),/outside canonical observed coverage for Shiller/);
});
test('unapproved 1971 FX extension cannot be asserted as original H10 active coverage',()=>{
 const x=inputs();x.fx_monthly_levels[0].month='1971-01';
 assert.throws(()=>run(x),/outside canonical observed coverage for active FX H10|Duplicate or unsorted/);
});

test('explicit latest provisional FX beyond last complete is omitted, not coerced to complete',()=>{
 const x=inputs();x.fx_monthly_levels.push({month:'2026-11',value:150,month_status:'LATEST_MONTH_PROVISIONAL'});
 const r=run(x);assert.equal(r.provisional_fx_input_months,1);assert.equal(r.common_return_months,2);
});
test('Shiller available period is derived from acquisition registry metadata',()=>{
 const x=clone(registry);x.acquisition.verified_existing_research.period='2021-01/2021-12';
 const y=inputs();y.usd_monthly_returns=[{month:'2021-01',approx_total_return_usd:0}];
 assert.throws(()=>run({...y,source_registry:x}),/outside canonical observed coverage for Shiller/);
});
