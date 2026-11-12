'use strict';
/** Completely synthetic 123-month RAW source-level fixture; no genuine observations. */
const crypto=require('node:crypto');
const {formatMonth,monthSerial}=require('../../lib/analytics/cashflow-core.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const HEAD=['month','series_id','value','unit','currency','series_kind','origin','source_id','seasonal_adjustment','raw_response_sha256','footnote_codes'];
const H={title:Buffer.from('l96BRZVplto=','base64'),code:Buffer.from('l96BRZVpltqVhI2GKEdyb3VwL0l0ZW0gY29kZSk=','base64'),total:Buffer.from('kY2Nhw==','base64'),ex:Buffer.from('jp2JxoLMi0GRronGksCC8I+cgq2RjY2H','base64')};
const abbrev=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const records=Array.from({length:123},(_,i)=>formatMonth(monthSerial('2010-01')+i));
function eStatRaw(){
 const rows=[Buffer.concat([H.title,Buffer.from(','),H.total,Buffer.from(','),H.ex]),Buffer.from('x,x,x'),Buffer.concat([H.code,Buffer.from(',0001,0163')]),Buffer.from('x,x,x'),Buffer.from('x,x,x'),Buffer.from('x,x,x')];
 for(const [i,month] of records.entries()){
  const yymm=month.replace('-','');
  rows.push(Buffer.from(yymm+','+(100+i)+','+(120+i)));
 }
 return Buffer.concat(rows.flatMap(row=>[row,Buffer.from('\r\n')]));
}
function canonical(rows){return Buffer.from(HEAD.join(',')+'\n'+rows.map(row=>HEAD.map(k=>row[k]??'').join(',')).join('\n')+'\n');}
function fixture(){
 const shillerRows=records.map(month=>month+',100,0,100');
 const rawShiller=Buffer.from('month,sp500_price_index,annualized_dividend_index_points,us_cpi_index\n'+shillerRows.join('\n')+'\n');
 const fedDates=records.map((month)=>{
  const [y,m]=month.split('-').map(Number);
  return '15-'+abbrev[m-1]+'-'+String(y%100).padStart(2,'0')+' 100.0000';
 });
 const rawFed=Buffer.from('<html><title>Historical Rates for the Japanese Yen</title>\n'+fedDates.join('\n')+'</html>');
 const rawCpiHeadline=eStatRaw(),rawCpiExRent=eStatRaw();
 const hash={shiller:sha(rawShiller),fed:sha(rawFed),cpi_headline:sha(rawCpiHeadline),cpi_ex_rent:sha(rawCpiExRent)};
 const fx=records.slice(0,-1).map(month=>({month,series_id:'FED_H10_USDJPY_MONTH_END',value:'100.0000',unit:'JPY_PER_USD',currency:'JPY',series_kind:'FX_RATE',origin:'OBSERVED',source_id:'FED_BOARD',seasonal_adjustment:'NOT_APPLICABLE',raw_response_sha256:hash.fed}));
 const cpi=[];
 for(const [sid,raw,shift] of [['JP_CPI_EX_RENT_2025_LINKED',hash.cpi_ex_rent,120],['JP_CPI_HEADLINE_2025_LINKED',hash.cpi_headline,100]]){
  for(let i=0;i<records.length;i++)cpi.push({month:records[i],series_id:sid,value:String(shift+i),unit:'INDEX_2025_100',currency:'NOT_APPLICABLE',series_kind:'CPI_LEVEL',origin:'OBSERVED',source_id:'ESTAT',seasonal_adjustment:'NSA',raw_response_sha256:raw});
 }
 const files={shiller:rawShiller,fed:rawFed,cpi_headline:rawCpiHeadline,cpi_ex_rent:rawCpiExRent,fx_canonical:canonical(fx),cpi_canonical:canonical(cpi)};
 const source_registry={version:'0.2.0',sources:{SHILLER_LEGACY:{},FED_BOARD:{},ESTAT:{}},assets:[{asset_id:'US_EQUITY',provider_id:'SPDJI',research_fallback:'SHILLER_LEGACY',series_kind:'INDEX_TOTAL_RETURN'}],auxiliary:[
  {aux_id:'FX',provider_id:'FED_BOARD',series_kind:'FX_RATE',full_pinned_history_20261111:{raw_sha256:hash.fed,normalized_csv_sha256:sha(files.fx_canonical),monthly_first:records[0],monthly_last_complete:records.at(-2),monthly_observed_complete:fx.length,provisional_month:records.at(-1)}},
  {aux_id:'CPI_JP',provider_id:'ESTAT',series_kind:'CPI_LEVEL',actual_coverage:{cpi_headline:{raw_sha256:hash.cpi_headline,first_month:records[0],last_month:records.at(-1),months:records.length},cpi_ex_imputed_rent:{raw_sha256:hash.cpi_ex_rent,months:records.length},metadata:{common_csv_sha256:sha(files.cpi_canonical)}}}],
  acquisition:{private_research_normalization_v04:{source_sha256:hash.shiller},verified_existing_research:{period:records[0]+'/'+records.at(-1),rows:records.length}}};
 const receipt=(source_id,raw_sha256,url)=>({source_id,raw_sha256,source_url:url,publisher:'SYNTHETIC_TEST_ONLY',retrieved_at:'2026-11-12T00:00:00Z',data_qa_passed:true,private_research_authorized:true});
 const manifest={usd:{...receipt('SHILLER_LEGACY',hash.shiller,'https://github.com/datasets/s-and-p-500/blob/main/data/data.csv'),return_kind:'RESEARCH_APPROX_RETURN',currency:'USD',method:'SHILLER_PRICE_PLUS_DIVIDEND_APPROX'},
  fx:{...receipt('FED_BOARD',hash.fed,'https://www.federalreserve.gov/releases/h10/hist/dat00_ja.htm'),source_channel:'H10_ACTIVE_JAPAN_HISTORY',quote:'JPY_PER_USD',aggregation:'LAST_AVAILABLE_OBSERVED_IN_MONTH'},
  cpi:{...receipt('ESTAT',hash.cpi_headline,'https://www.e-stat.go.jp/stat-search/files'),country:'JP',basket:'HEADLINE_NSA',index_unit:'POSITIVE_INDEX_LEVEL'}};
 const plan={portfolio:{initial_holdings_yen:{US_EQUITY:200_000},target_weights:{US_EQUITY:1},rebalance:{mode:'NONE'}},cashflow_plan:{monthly_withdrawal_yen:1000},horizons_months:[120,240]};
 return {source_registry,manifest,files,plan,fixture_description:'SYNTHETIC_123_MONTH_RESEARCH_ONLY'};
}
module.exports={fixture};
