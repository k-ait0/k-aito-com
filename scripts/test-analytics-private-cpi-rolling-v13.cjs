'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {sha}=require('../lib/analytics/encrypted-artifact-audit.cjs');
const {buildPrivateCpiRollingReport,extractVerifiedHeadlineCpi,validateResearchPlan}=require('../lib/analytics/private-cpi-rolling-research.cjs');
const {parseArgs}=require('./run-analytics-private-cpi-rolling-v13.cjs');
const HEAD=['month','series_id','value','unit','currency','series_kind','origin','source_id','seasonal_adjustment','raw_response_sha256','footnote_codes'];
const HEADINGS={title:Buffer.from('l96BRZVplto=','base64'),code:Buffer.from('l96BRZVpltqVhI2GKEdyb3VwL0l0ZW0gY29kZSk=','base64'),total:Buffer.from('kY2Nhw==','base64'),ex:Buffer.from('jp2JxoLMi0GRronGksCC8I+cgq2RjY2H','base64')};
const months=['2020-01','2020-02','2020-03','2020-04'];
function eStatRaw(rows){
 const parts=[Buffer.concat([HEADINGS.title,Buffer.from(','),HEADINGS.total,Buffer.from(','),HEADINGS.ex]),Buffer.from('x,x,x'),Buffer.concat([HEADINGS.code,Buffer.from(',0001,0163')]),Buffer.from('x,x,x'),Buffer.from('x,x,x'),Buffer.from('x,x,x')];
 for(const row of rows)parts.push(Buffer.from(row));return Buffer.concat(parts.flatMap(p=>[p,Buffer.from('\r\n')]));
}
function canonical(rows){return Buffer.from(HEAD.join(',')+'\n'+rows.map(x=>HEAD.map(k=>x[k]??'').join(',')).join('\n')+'\n');}
function fixture(){
 const files={shiller:Buffer.from('month,sp500_price_index,annualized_dividend_index_points,us_cpi_index\n2020-01,100,0,100\n2020-02,110,0,110\n2020-03,110,0,110\n'),
 fed:Buffer.from('<h1>Historical Rates for the Japanese Yen</h1><table><tr>01-JAN-20 100.0000</tr><tr>28-FEB-20 120.0000</tr><tr>31-MAR-20 120.0000</tr><tr>29-APR-20 121.0000</tr><tr>30-APR-20 ND</tr></table>'),
 cpi_headline:eStatRaw(['202001,100,90','202002,110,100','202003,110,105','202004,111,107']),
 cpi_ex_rent:eStatRaw(['202001,100,90','202002,110,100','202003,110,105','202004,111,107'])};
 const hashes=Object.fromEntries(Object.entries(files).map(([key,bytes])=>[key,sha(bytes)]));
 const fx=['2020-01','2020-02','2020-03'].map((m,i)=>({month:m,series_id:'FED_H10_USDJPY_MONTH_END',value:[100,120,120][i],unit:'JPY_PER_USD',currency:'JPY',series_kind:'FX_RATE',origin:'OBSERVED',source_id:'FED_BOARD',seasonal_adjustment:'NOT_APPLICABLE',raw_response_sha256:hashes.fed}));
 const cpi=[];
 for(const [sid,rawhash,values] of [['JP_CPI_EX_RENT_2025_LINKED',hashes.cpi_ex_rent,[90,100,105,107]],['JP_CPI_HEADLINE_2025_LINKED',hashes.cpi_headline,[100,110,110,111]]])for(let i=0;i<4;i++)cpi.push({month:months[i],series_id:sid,value:values[i],unit:'INDEX_2025_100',currency:'NOT_APPLICABLE',series_kind:'CPI_LEVEL',origin:'OBSERVED',source_id:'ESTAT',seasonal_adjustment:'NSA',raw_response_sha256:rawhash});
 files.fx_canonical=canonical(fx);files.cpi_canonical=canonical(cpi);
 const registry={version:'0.2.0',sources:{SHILLER_LEGACY:{},FED_BOARD:{},ESTAT:{}},assets:[{asset_id:'US_EQUITY',provider_id:'SPDJI',research_fallback:'SHILLER_LEGACY',series_kind:'INDEX_TOTAL_RETURN'}],auxiliary:[
 {aux_id:'FX',provider_id:'FED_BOARD',series_kind:'FX_RATE',full_pinned_history_20261111:{raw_sha256:hashes.fed,normalized_csv_sha256:sha(files.fx_canonical),monthly_first:'2020-01',monthly_last_complete:'2020-03',monthly_observed_complete:3,provisional_month:'2020-04'}},
 {aux_id:'CPI_JP',provider_id:'ESTAT',series_kind:'CPI_LEVEL',actual_coverage:{cpi_headline:{raw_sha256:hashes.cpi_headline,first_month:'2020-01',last_month:'2020-04',months:4},cpi_ex_imputed_rent:{raw_sha256:hashes.cpi_ex_rent,months:4},metadata:{common_csv_sha256:sha(files.cpi_canonical)}}}],acquisition:{private_research_normalization_v04:{source_sha256:hashes.shiller},verified_existing_research:{period:'2020-01/2020-03',rows:3}}};
 const receipt=(source_id,raw_sha256,source_url)=>({source_id,raw_sha256,source_url,publisher:'QA SYNTHETIC',retrieved_at:'2026-11-11T00:00:00Z',data_qa_passed:true,private_research_authorized:true});
 const manifest={usd:{...receipt('SHILLER_LEGACY',hashes.shiller,'https://github.com/datasets/s-and-p-500/blob/main/data/data.csv'),return_kind:'RESEARCH_APPROX_RETURN',currency:'USD',method:'SHILLER_PRICE_PLUS_DIVIDEND_APPROX'},fx:{...receipt('FED_BOARD',hashes.fed,'https://www.federalreserve.gov/releases/h10/hist/dat00_ja.htm'),source_channel:'H10_ACTIVE_JAPAN_HISTORY',quote:'JPY_PER_USD',aggregation:'LAST_AVAILABLE_OBSERVED_IN_MONTH'},cpi:{...receipt('ESTAT',hashes.cpi_headline,'https://www.e-stat.go.jp/stat-search/files'),country:'JP',basket:'HEADLINE_NSA',index_unit:'POSITIVE_INDEX_LEVEL'}};
 return {files,manifest,source_registry:registry};
}

const plan={portfolio:{initial_holdings_yen:{US_EQUITY:10000},target_weights:{US_EQUITY:1},rebalance:{mode:'NONE'}},cashflow_plan:{monthly_withdrawal_yen:1000},horizons_months:[120,240,360]};
const run=(changes={})=>buildPrivateCpiRollingReport({...fixture(),plan,...changes});
test('v0.13 private report requires six pinned bytes and independent raw normalization',()=>{
 const x=run();assert.equal(x.source_receipts_byte_pinned,true);assert.equal(x.raw_to_canonical_normalization_independently_recomputed,true);
 assert.equal(x.data_coverage.available_market_months,2);assert.equal(x.data_coverage.verified_jp_cpi_months,4);
 assert.deepEqual(x.model_tests.map(t=>t.complete_windows),[0,0,0]);
});
test('CPI linked private output has no private raw source values or monthly market rows',()=>{const x=JSON.stringify(run());assert.ok(!x.includes('asset_returns'));assert.ok(!x.includes('source_RAW'));assert.ok(!x.includes('PRIVATE_TEST'));});
test('private report does not imply probabilities, licenses, or verified data publisher origin',()=>{const x=run();assert.equal(x.publication_approved,false);assert.equal(x.source_rights_approved,false);assert.equal(x.source_origin_independently_verified,false);assert.match(x.warning,/not independent/);});
test('CPI canonical reader extracts only Japanese headline series and preserves exact indexed strings',()=>{const x=fixture();const values=extractVerifiedHeadlineCpi(x.files.cpi_canonical);assert.equal(values.length,4);assert.equal(values[0].value,'100');assert.equal(values[3].value,'111');assert.equal(values[0].source_id,'ESTAT');});
test('changing CPI canonical byte invalidates pinned byte report',()=>{const x=fixture();x.files.cpi_canonical=Buffer.from('bad');assert.throws(()=>run(x),/SHA256 mismatch/);});
test('changing Fed daily original invalidates source pin before CPI simulation',()=>{const x=fixture();x.files.fed=Buffer.from('bad');assert.throws(()=>run(x),/SHA256 mismatch/);});
test('changing Japanese CPI raw source invalidates source pin',()=>{const x=fixture();x.files.cpi_headline=Buffer.from('bad');assert.throws(()=>run(x),/SHA256 mismatch/);});
test('source registry provider drift prevented',()=>{const x=fixture();x.source_registry.auxiliary[1].provider_id='BLS';assert.throws(()=>run(x),/source lock|source registry|source lock has changed/);});
test('non-Shiller second asset is not implicitly supplied as observed',()=>{const p=structuredClone(plan);p.portfolio.initial_holdings_yen.BOND=100;p.portfolio.target_weights={US_EQUITY:.5,BOND:.5};assert.throws(()=>run({plan:p}),/one-asset/);});
test('historical CPI plan forbids fixed annual inflation to prevent double inflation',()=>{const p=structuredClone(plan);p.cashflow_plan.annual_expense_inflation=0;assert.throws(()=>run({plan:p}),/Unsupported cashflow plan/);});
test('invalid horizons and repeated horizon fail closed',()=>{for(const hs of [[1],[120,120],[119],[],[120,240,360,480]]){const p=structuredClone(plan);p.horizons_months=hs;assert.throws(()=>run({plan:p}),/horizons_months/);}});
test('provenance receipts do not authorize publication',()=>{const x=run();assert.equal(x.model_tests[0].historical_funded_fraction,null);assert.equal(x.model_tests[0].min_ending_assets_yen,null);});
test('no mutated private source buffers or plan',()=>{const f=fixture(),p=structuredClone(plan);const before=Object.values(f.files).map(b=>sha(b));run({...f,plan:p});assert.deepEqual(before,Object.values(f.files).map(b=>sha(b)));assert.deepEqual(p,plan);});
test('CLI enforces required arguments and disallows duplicates',()=>{assert.throws(()=>parseArgs([]),/required/);assert.throws(()=>parseArgs(['--plan','x','--plan','y']),/repeated/);assert.throws(()=>parseArgs(['--private-key','secret']),/Unknown/);});
test('CLI forbids private input inside code repository before reading files',()=>{const script=path.resolve(__dirname,'run-analytics-private-cpi-rolling-v13.cjs');const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'analytics-v13-'));try{const r=spawnSync(process.execPath,[script,'--handoff-dir',path.resolve(__dirname,'..'),'--registry',path.join(tmp,'r'),'--plan',path.join(tmp,'p'),'--out-dir',tmp],{encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/overlaps source repository/);}finally{fs.rmSync(tmp,{recursive:true,force:true});}});
