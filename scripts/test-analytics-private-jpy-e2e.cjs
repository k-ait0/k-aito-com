'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {FILES,sha256,reconcilePrivateSources,buildPrivateReport,countCompleteWindows}=require('../lib/analytics/private-jpy-e2e.cjs');
const {monthSerial,formatMonth}=require('../lib/analytics/cashflow-core.cjs');
const COLUMNS=['month','series_id','value','unit','currency','series_kind','origin','source_id','seasonal_adjustment','raw_response_sha256','footnote_codes'];
function csv(data){return COLUMNS.join(',')+'\n'+data.map(r=>COLUMNS.map(k=>r[k]??'').join(',')).join('\n')+'\n'}
function fixture(){
 const files={shiller:Buffer.from('month,sp500_price_index,annualized_dividend_index_points,us_cpi_index\n2020-01,100,0,100\n2020-02,110,0,110\n2020-03,110,0,110\n'),fed:Buffer.from('PRIVATE_TEST_FED_RAW'),cpi_headline:Buffer.from('PRIVATE_TEST_ESTAT_RAW_HEADLINE'),cpi_ex_rent:Buffer.from('PRIVATE_TEST_ESTAT_RAW_EX_RENT')};
 const hashes=Object.fromEntries(Object.entries(files).map(([k,b])=>[k,sha256(b)]));
 const fx=['2020-01','2020-02','2020-03'].map((month,i)=>({month,series_id:'FED_H10_USDJPY_MONTH_END',value:[100,120,120][i],unit:'JPY_PER_USD',currency:'JPY',series_kind:'FX_RATE',origin:'OBSERVED',source_id:'FED_BOARD',seasonal_adjustment:'NOT_APPLICABLE',raw_response_sha256:hashes.fed}));
 const cpi=[];
 for(const [sid,hash] of [['JP_CPI_EX_RENT_2025_LINKED',hashes.cpi_ex_rent],['JP_CPI_HEADLINE_2025_LINKED',hashes.cpi_headline]])for(const [i,month] of ['2020-01','2020-02','2020-03'].entries()){
 cpi.push({month,series_id:sid,value:[100,110,110][i],unit:'INDEX_2025_100',currency:'NOT_APPLICABLE',series_kind:'CPI_LEVEL',origin:'OBSERVED',source_id:'ESTAT',seasonal_adjustment:'NSA',raw_response_sha256:hash});}
 files.fx_canonical=Buffer.from(csv(fx));files.cpi_canonical=Buffer.from(csv(cpi));
 const registry={version:'0.2.0',sources:{SHILLER_LEGACY:{},FED_BOARD:{},ESTAT:{}},assets:[{asset_id:'US_EQUITY',provider_id:'SPDJI',research_fallback:'SHILLER_LEGACY',series_kind:'INDEX_TOTAL_RETURN'}],auxiliary:[
 {aux_id:'FX',provider_id:'FED_BOARD',series_kind:'FX_RATE',full_pinned_history_20261111:{raw_sha256:hashes.fed,normalized_csv_sha256:sha256(files.fx_canonical),monthly_first:'2020-01',monthly_last_complete:'2020-03',monthly_observed_complete:3,provisional_month:'2020-04'}},
 {aux_id:'CPI_JP',provider_id:'ESTAT',series_kind:'CPI_LEVEL',actual_coverage:{cpi_headline:{raw_sha256:hashes.cpi_headline,first_month:'2020-01',last_month:'2020-03',months:3},cpi_ex_imputed_rent:{raw_sha256:hashes.cpi_ex_rent,months:3},metadata:{common_csv_sha256:sha256(files.cpi_canonical)}}}],acquisition:{private_research_normalization_v04:{source_sha256:hashes.shiller},verified_existing_research:{period:'2020-01/2020-03',rows:3}}};
 const receipt=(id,hash,url)=>({source_id:id,raw_sha256:hash,source_url:url,publisher:'TEST ONLY',retrieved_at:'2026-11-11T00:00:00Z',data_qa_passed:true,private_research_authorized:true});
 const manifest={usd:{...receipt('SHILLER_LEGACY',hashes.shiller,'https://github.com/datasets/s-and-p-500/blob/main/data/data.csv'),currency:'USD',return_kind:'RESEARCH_APPROX_RETURN',method:'SHILLER_PRICE_PLUS_DIVIDEND_APPROX'},
 fx:{...receipt('FED_BOARD',hashes.fed,'https://www.federalreserve.gov/releases/h10/hist/dat00_ja.htm'),source_channel:'H10_ACTIVE_JAPAN_HISTORY',quote:'JPY_PER_USD',aggregation:'LAST_AVAILABLE_OBSERVED_IN_MONTH'},
 cpi:{...receipt('ESTAT',hashes.cpi_headline,'https://www.e-stat.go.jp/stat-search/files'),country:'JP',basket:'HEADLINE_NSA',index_unit:'POSITIVE_INDEX_LEVEL'}};
 return {files,source_registry:registry,manifest};
}
const modify=x=>structuredClone(x);
test('accept exactly six pinned private source bytes, return verified flags',()=>{const v=reconcilePrivateSources(fixture());assert.equal(v.proof.all_six_pinned_byte_hashes_matched,true);assert.equal(v.proof.shiller_recalculated_from_raw,true);assert.equal(v.proof.raw_to_canonical_normalization_independently_recomputed,false);});
test('calculate Shiller raw and convert +10% USD, +20% FX => 32% nominal JPY',()=>{const v=reconcilePrivateSources(fixture());assert.ok(Math.abs(v.market.market_rows[0].asset_returns.US_EQUITY-.32)<1e-12);assert.ok(Math.abs(v.market.research_only_real_rows[0].approx_real_return_jpy-.2)<1e-12)});
test('derived report contains aggregate counts but NO raw market observations',()=>{const r=buildPrivateReport(fixture());const s=JSON.stringify(r);assert.equal(r.markets.complete_jpy_nominal_months,2);assert.ok(!s.includes('asset_returns'));assert.ok(!s.includes('PRIVATE_TEST_FED_RAW'));assert.equal(r.publication_approved,false);assert.equal(r.source_origin_independently_verified,false)});
test('theoretical rolling starts counted only on complete blocks',()=>{const m=['2020-01','2020-02','2020-04','2020-05','2020-06'].map(month=>({month}));assert.equal(countCompleteWindows(m,2),3);assert.equal(countCompleteWindows(m,3),1);assert.equal(countCompleteWindows(m,4),0)});
test('raw Shiller cannot be altered after registry pin',()=>{const x=fixture();x.files.shiller=Buffer.from('changed');assert.throws(()=>reconcilePrivateSources(x),/SHA256 mismatch/)});
test('raw Fed cannot be replaced by another source',()=>{const x=fixture();x.files.fed=Buffer.from('different');assert.throws(()=>reconcilePrivateSources(x),/SHA256 mismatch/)});
test('raw e-Stat headline CPI cannot be replaced',()=>{const x=fixture();x.files.cpi_headline=Buffer.from('different');assert.throws(()=>reconcilePrivateSources(x),/SHA256 mismatch/)});
test('raw e-Stat ex-rent file required even when calculation uses headline',()=>{const x=fixture();delete x.files.cpi_ex_rent;assert.throws(()=>reconcilePrivateSources(x),/Missing private source/)});
test('tampered normalized FX rejected by registry SHA pin',()=>{const x=fixture();x.files.fx_canonical=Buffer.concat([x.files.fx_canonical,Buffer.from('changed')]);assert.throws(()=>reconcilePrivateSources(x),/SHA256 mismatch/)});
test('tampered normalized CPI rejected by registry SHA pin',()=>{const x=fixture();x.files.cpi_canonical=Buffer.from('fake');assert.throws(()=>reconcilePrivateSources(x),/SHA256 mismatch/)});
test('FX wrong quote unit blocked even if maliciously repinned',()=>{const x=fixture();x.files.fx_canonical=Buffer.from(x.files.fx_canonical.toString().replace('JPY_PER_USD','USD_PER_JPY'));x.source_registry.auxiliary[0].full_pinned_history_20261111.normalized_csv_sha256=sha256(x.files.fx_canonical);assert.throws(()=>reconcilePrivateSources(x),/metadata mismatch/)});
test('CPI wrong basket or seasonal adjustment blocked even when repinned',()=>{const x=fixture();x.files.cpi_canonical=Buffer.from(x.files.cpi_canonical.toString().replace(/NSA/g,'SA'));x.source_registry.auxiliary[1].actual_coverage.metadata.common_csv_sha256=sha256(x.files.cpi_canonical);assert.throws(()=>reconcilePrivateSources(x),/metadata mismatch/)});
test('FX missing month fails, even if normalized hash is repinned',()=>{const x=fixture();const rows=x.files.fx_canonical.toString().split('\n');x.files.fx_canonical=Buffer.from([rows[0],rows[1],rows[3],''].join('\n'));x.source_registry.auxiliary[0].full_pinned_history_20261111.normalized_csv_sha256=sha256(x.files.fx_canonical);assert.throws(()=>reconcilePrivateSources(x),/gap|count mismatch/)});
test('CPI duplicated month fails even when normalized hash repinned',()=>{const x=fixture();const rows=x.files.cpi_canonical.toString().split('\n');rows.splice(2,0,rows[1]);x.files.cpi_canonical=Buffer.from(rows.join('\n'));x.source_registry.auxiliary[1].actual_coverage.metadata.common_csv_sha256=sha256(x.files.cpi_canonical);assert.throws(()=>reconcilePrivateSources(x),/duplicate or unsorted/)});
test('Shiller formula not changed by forged date or dividend input',()=>{const x=fixture();x.files.shiller=Buffer.from(x.files.shiller.toString().replace('2020-02,110,0,110','2020-02,110,1,110'));x.source_registry.acquisition.private_research_normalization_v04.source_sha256=sha256(x.files.shiller);x.manifest.usd.raw_sha256=sha256(x.files.shiller);const v=reconcilePrivateSources(x);assert.ok(v.market.market_rows[0].asset_returns.US_EQUITY>.32)});
test('Shiller missing month is rejected even if raw SHA repinned',()=>{const x=fixture();x.files.shiller=Buffer.from(x.files.shiller.toString().replace('2020-02','2020-04'));x.source_registry.acquisition.private_research_normalization_v04.source_sha256=sha256(x.files.shiller);x.manifest.usd.raw_sha256=sha256(x.files.shiller);assert.throws(()=>reconcilePrivateSources(x),/missing or duplicate month/)});
test('receipt provenance still validated after bytes match',()=>{const x=fixture();x.manifest.fx.source_channel='FED_DDP_DRAFT';assert.throws(()=>reconcilePrivateSources(x),/DRAFT source channel/)});
test('raw fingerprint receipts must match actual verified source',()=>{const x=fixture();x.manifest.usd.raw_sha256='0'.repeat(64);assert.throws(()=>reconcilePrivateSources(x),/Manifest receipt disagrees/)});
test('nonapproved site flags always remain false for even valid raw bytes',()=>{const r=buildPrivateReport(fixture());assert.equal(r.source_rights_approved,false);assert.equal(r.publication_approved,false);assert.equal(r.fx_source_change_adr_approved,false)});
test('report with a 10y horizon on short history returns insufficiency, not zero probability',()=>{const x=fixture();const p={portfolio:{initial_holdings_yen:{US_EQUITY:1000},target_weights:{US_EQUITY:1}},cashflow_plan:{monthly_withdrawal_yen:10},horizons_months:[120]};const r=buildPrivateReport({...x,plan:p});assert.equal(r.model_tests[0].complete_windows,0);assert.equal(r.model_tests[0].historical_funded_fraction,null)});
test('unavailable second asset cannot masquerade as observed data',()=>{const x=fixture(),plan={portfolio:{initial_holdings_yen:{US_EQUITY:100,BOND:100},target_weights:{US_EQUITY:.5,BOND:.5}},cashflow_plan:{monthly_withdrawal_yen:0},horizons_months:[120]};assert.throws(()=>buildPrivateReport({...x,plan}),/one-asset Shiller/)});
test('cashflow plan disallows unapproved tax guesses',()=>{const x=fixture(),plan={portfolio:{initial_holdings_yen:{US_EQUITY:100},target_weights:{US_EQUITY:1}},cashflow_plan:{monthly_withdrawal_yen:0,tax_rate:0.1},horizons_months:[120]};assert.throws(()=>buildPrivateReport({...x,plan}),/Unsupported cashflow_plan/)});
test('relative event offsets are passed through rolling Core unchanged',()=>{const x=fixture(),plan={portfolio:{initial_holdings_yen:{US_EQUITY:1000},target_weights:{US_EQUITY:1}},cashflow_plan:{monthly_withdrawal_yen:100,relative_one_time_events:[{id:'repair',offset_months:1,kind:'EXPENSE',amount_yen:200}]},horizons_months:[120]};const r=buildPrivateReport({...x,plan});assert.equal(r.model_tests[0].complete_windows,0)});
test('CLI writes immutable private-only aggregate report, no raw rows',()=>{
 const x=fixture(),root=fs.mkdtempSync(path.join(os.tmpdir(),'analytics-qa-')),input=path.join(root,'inputs'),out=path.join(root,'results');fs.mkdirSync(input);fs.mkdirSync(out);
 try{
  for(const [k,f] of Object.entries(FILES))fs.writeFileSync(path.join(input,f),x.files[k]);
  fs.writeFileSync(path.join(input,'manifest.json'),JSON.stringify(x.manifest));
  const registry=path.join(root,'registry.json');fs.writeFileSync(registry,JSON.stringify(x.source_registry));
  const cli=path.resolve(__dirname,'run-analytics-private-jpy-e2e.cjs');
  const args=['--private-dir',input,'--registry',registry,'--out-dir',out];
  const run=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const fsResult=fs.readdirSync(out);assert.equal(fsResult.length,1);
  const report=path.join(out,fsResult[0]);const body=fs.readFileSync(report,'utf8');
  assert.equal(fs.statSync(report).mode&0o777,0o600);assert.ok(!body.includes('PRIVATE_TEST_FED_RAW'));
  const rerun=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.notEqual(rerun.status,0);assert.match(rerun.stderr,/EEXIST/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('CLI rejects private directory pointing inside the code checkout',()=>{
 const cli=path.resolve(__dirname,'run-analytics-private-jpy-e2e.cjs');
 const r=spawnSync(process.execPath,[cli,'--private-dir',path.resolve(__dirname,'..'),'--registry','/tmp/none','--out-dir','/tmp'],{encoding:'utf8'});
 assert.notEqual(r.status,0);assert.match(r.stderr,/overlap Git checkout/);
});
