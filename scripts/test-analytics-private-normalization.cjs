'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {buildPrivateV10Report,verifyRawNormalizationParity,parseFedHistoricalRaw,parseEstatRaw,csvRecords}=require('../lib/analytics/private-normalization-parity.cjs');
const {sha}=require('../lib/analytics/encrypted-artifact-audit.cjs');
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
test('independent Fed daily-to-final-month and e-Stat raw-to-canonical parity',()=>{
 const o=verifyRawNormalizationParity(fixture().files);assert.equal(o.raw_to_canonical_normalization_independently_recomputed,true);
 assert.equal(o.fx_daily_rows,5);assert.equal(o.fx_daily_ND,1);assert.equal(o.fx_final_months,3);assert.equal(o.fx_provisional_excluded,'2020-04');
 assert.equal(o.jp_headline_months,4);assert.equal(o.official_jp_cpi_independent_overlap_verified,4);
});
test('v0.10 complete private report integrates original byte SHA + source parity',()=>{
 const f=fixture(),r=buildPrivateV10Report(f);
 assert.equal(r.schema,'ANALYTICS_PRIVATE_HANDOFF_V0_10');assert.equal(r.input_proof.all_six_pinned_byte_hashes_matched,true);
 assert.equal(r.raw_to_canonical_normalization_independently_recomputed,true);
 assert.equal(r.markets.complete_jpy_nominal_months,2);assert.equal(r.markets.coverage.find(x=>x.horizon_months===360).complete_windows,0);
 assert.equal(r.publication_approved,false);assert.equal(r.source_rights_approved,false);
 assert.equal(r.model_tests.length,0);
});
test('raw and normalized mismatch detected even after standalone SHA parity is mocked',()=>{
 const f=fixture();f.files.fed=Buffer.from(f.files.fed.toString().replace('120.0000','119.0000'));
 assert.throws(()=>verifyRawNormalizationParity(f.files),/Fed H10 raw-to-canonical value mismatch/);
});
test('corrupted CPI headline value detected',()=>{
 const f=fixture();f.files.cpi_headline=Buffer.from(f.files.cpi_headline.toString('binary').replace('202003,110,105','202003,112,105'),'binary');
 assert.throws(()=>verifyRawNormalizationParity(f.files),/e-Stat headline raw-to-canonical value mismatch/);
});
test('two independent CPI ex-rent originals must agree',()=>{
 const f=fixture();f.files.cpi_headline=Buffer.from(f.files.cpi_headline.toString('binary').replace('202003,110,105','202003,110,106'),'binary');
 assert.throws(()=>verifyRawNormalizationParity(f.files),/Independent official e-Stat ex-rent originals disagree/);
});
test('no silent acceptance of malicious or missing Fed title',()=>{
 const f=fixture();f.files.fed=Buffer.from('<h1>NOT FED</h1>');assert.throws(()=>verifyRawNormalizationParity(f.files),/Wrong Fed H10 title/);
});
test('Fed date must be unique',()=>{
 const f=fixture();f.files.fed=Buffer.from(f.files.fed.toString().replace('</table>','<tr>28-FEB-20 120.0000</tr></table>'));
 assert.throws(()=>parseFedHistoricalRaw(f.files.fed),/Duplicate daily Fed/);
});
test('Fed ND rows never substitute zero returns',()=>{
 const r=parseFedHistoricalRaw(fixture().files.fed);assert.equal(r.finalMonths.get('2020-03'),'120.0000');assert.equal(r.finalMonths.has('2020-04'),false);
});
test('e-Stat raw cannot be read as UTF-8 with replacement markers',()=>{
 const f=fixture();f.files.cpi_headline=Buffer.from([0xff,0xff]);assert.throws(()=>verifyRawNormalizationParity(f.files),/Invalid CP932|Unexpected e-Stat/);
});
test('e-Stat raw category code must be unique',()=>{
 const f=fixture();const h=f.files.cpi_headline.toString('binary').replace('0001,0163','0001,0001');f.files.cpi_headline=Buffer.from(h,'binary');
 assert.throws(()=>verifyRawNormalizationParity(f.files),/Missing\/duplicate e-Stat classification/);
});
test('e-Stat source calendar cannot skip months',()=>{
 const f=fixture();const h=f.files.cpi_ex_rent.toString('binary').replace('202002,110,100','202005,110,100');f.files.cpi_ex_rent=Buffer.from(h,'binary');
 assert.throws(()=>verifyRawNormalizationParity(f.files),/Missing or repeated e-Stat raw month/);
});
test('CP932 decoder reconstructs category labels with no replacement',()=>{
 const f=fixture();const x=parseEstatRaw(f.files.cpi_headline,{category:'0001',label:'総合',seriesId:'JP_CPI_HEADLINE_2025_LINKED'});
 assert.equal(x.values.get('2020-03'),'110');assert.equal(x.exRentCrosscheck.get('2020-03'),'105');
});
test('CSV parsing supports quoted commas and multi-line cells',()=>{
 assert.deepEqual(csvRecords('a,b\n"x,y","z\nq"\n'),[['a','b'],['x,y','z\nq']]);
});
test('CSV parser fails closed on malformed quoted cells',()=>{
 assert.throws(()=>csvRecords('"broken\n'),/Unterminated/);assert.throws(()=>csvRecords('"x"x,y\n'),/Unexpected text/);
});
test('invalid original decimal cannot be treated as a CPI observation',()=>{
 const f=fixture();const h=f.files.cpi_headline.toString('binary').replace('202002,110,100','202002,-110,100');f.files.cpi_headline=Buffer.from(h,'binary');
 assert.throws(()=>verifyRawNormalizationParity(f.files),/Invalid raw official positive decimal/);
});
test('all status flags remain research-only despite complete synthetic parity',()=>{
 const r=buildPrivateV10Report(fixture());for(const k of ['publication_approved','source_rights_approved','source_origin_independently_verified'])assert.equal(r[k],false);
});
