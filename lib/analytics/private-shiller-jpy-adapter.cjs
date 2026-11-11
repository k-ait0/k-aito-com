'use strict';
/**
 * Research-only currency/price-level adapter for Shiller legacy approximate USD returns.
 * This module is NOT an acquisition routine or a license approval mechanism.
 * USD nominal return -> nominal JPY return, with separately reported JP-CPI-deflated return.
 * FX/CPI require levels for t AND t-1; there is no interpolation or forward-filling.
 */
const {monthSerial,formatMonth}=require('./cashflow-core.cjs');
const {preparePrivateMonthlyMarket}=require('./private-historical-adapter.cjs');
const MAX_ROWS=1200;
const HAS=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const obj=(x,label)=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid '+label);return x;};
const only=(x,keys,label)=>{obj(x,label);for(const k of Object.keys(x))if(!keys.includes(k))throw Error('Unsupported '+label+' field: '+k);};
const nonEmpty=(x,label)=>{if(typeof x!=='string'||!x.trim())throw Error('Missing '+label);return x;};
const sha=(x,label)=>{if(typeof x!=='string'||!/^[a-f0-9]{64}$/i.test(x))throw Error('Invalid SHA256 '+label);return x.toLowerCase();};
function checkReceipt(receipt,expectedSource){
 only(receipt,['source_id','raw_sha256','source_url','publisher','retrieved_at','data_qa_passed','private_research_authorized'],expectedSource+' receipt');
 if(receipt.source_id!==expectedSource)throw Error('Wrong source ID: expected '+expectedSource);
 for(const field of ['source_url','publisher','retrieved_at'])nonEmpty(receipt[field],field);
 if(!/^https:\/\//.test(receipt.source_url))throw Error('source_url must be HTTPS');
 sha(receipt.raw_sha256,expectedSource);
 if(receipt.data_qa_passed!==true||receipt.private_research_authorized!==true)throw Error('Private research and QA not explicitly authorized: '+expectedSource);
 return receipt;
}
function sortedRows(rows,allowed,label){
 if(!Array.isArray(rows)||rows.length<1||rows.length>MAX_ROWS)throw Error('Invalid '+label+' rows (1..1200)');
 const byMonth=new Map();let prev=null;
 for(const [i,r] of rows.entries()){
  only(r,allowed,label+' row '+i);
  const at=monthSerial(r.month);
  if(prev!==null&&at<=prev)throw Error('Duplicate or unsorted '+label+' months');
  prev=at;byMonth.set(r.month,r);
 }
 return byMonth;
}
function monthReturn(n,label){if(typeof n!=='number'||!Number.isFinite(n)||n< -1||n>10)throw Error('Invalid '+label);return n;}
function positive(n,label){if(typeof n!=='number'||!Number.isFinite(n)||n<=0)throw Error('Invalid positive '+label);return n;}
function assertRegistry(registry){
 obj(registry,'canonical source registry');
 if(!Array.isArray(registry.assets)||!Array.isArray(registry.auxiliary)||!registry.sources)throw Error('Canonical registry assets/auxiliary/sources required');
 const eq=registry.assets.find(x=>x.asset_id==='US_EQUITY');
 const fx=registry.auxiliary.find(x=>x.aux_id==='FX');
 const jp=registry.auxiliary.find(x=>x.aux_id==='CPI_JP');
 if(!eq||eq.provider_id!=='SPDJI'||eq.research_fallback!=='SHILLER_LEGACY'||eq.series_kind!=='INDEX_TOTAL_RETURN')throw Error('US_EQUITY source lock has changed');
 if(!fx||fx.provider_id!=='FED_BOARD'||fx.series_kind!=='FX_RATE')throw Error('FX source lock has changed');
 if(!jp||jp.provider_id!=='ESTAT'||jp.series_kind!=='CPI_LEVEL')throw Error('CPI_JP source lock has changed');
 if(!registry.sources.SHILLER_LEGACY||!registry.sources.FED_BOARD||!registry.sources.ESTAT)throw Error('Missing canonical source definitions');
 const shiller=registry.acquisition?.private_research_normalization_v04?.source_sha256;
 const pinnedFx=fx.full_pinned_history_20261111;
 const pinnedCpi=jp.actual_coverage?.cpi_headline;
 const researchPeriod=registry.acquisition?.verified_existing_research?.period;
 const period=typeof researchPeriod==='string' && /^(\d{4}-(?:0[1-9]|1[0-2]))\/(\d{4}-(?:0[1-9]|1[0-2]))$/.exec(researchPeriod);
 if(!shiller||!period||!pinnedFx?.raw_sha256||!pinnedCpi?.raw_sha256||!pinnedFx.monthly_first||!pinnedFx.monthly_last_complete||!pinnedCpi.first_month||!pinnedCpi.last_month)
  throw Error('Canonical provenance pins absent; fail closed');
 return {shiller:sha(shiller,'canonical Shiller'),fx:sha(pinnedFx.raw_sha256,'canonical FX'),
  cpi:sha(pinnedCpi.raw_sha256,'canonical CPI'),
  fxFirst:pinnedFx.monthly_first,fxLast:pinnedFx.monthly_last_complete,
  cpiFirst:pinnedCpi.first_month,cpiLast:pinnedCpi.last_month,
  shillerFirst:formatMonth(monthSerial(period[1])+1),shillerLast:period[2],fxProvisional:pinnedFx.provisional_month};
}
/**
 * manifest: {usd:{receipt fields,return_kind,currency,method},fx:{receipt fields,source_channel,quote,aggregation},
 *            cpi:{receipt fields,country,basket,index_unit}}.
 * FX source_channel must be the locked original 2000+ H.10 Japan history, never unapproved DDP.
 */
function preparePrivateShillerJpyResearch({usd_monthly_returns,fx_monthly_levels,jp_cpi_monthly_levels,manifest,source_registry}={}){
 const pins=assertRegistry(source_registry);obj(manifest,'manifest');
 if(Object.keys(manifest).sort().join('|')!=='cpi|fx|usd')throw Error('Manifest must declare usd, fx and cpi exactly');
 const u=obj(manifest.usd,'USD manifest'),f=obj(manifest.fx,'FX manifest'),c=obj(manifest.cpi,'CPI manifest');
 only(u,['source_id','raw_sha256','source_url','publisher','retrieved_at','data_qa_passed','private_research_authorized','return_kind','currency','method'],'USD manifest');
 only(f,['source_id','raw_sha256','source_url','publisher','retrieved_at','data_qa_passed','private_research_authorized','source_channel','quote','aggregation'],'FX manifest');
 only(c,['source_id','raw_sha256','source_url','publisher','retrieved_at','data_qa_passed','private_research_authorized','country','basket','index_unit'],'CPI manifest');
 const baseKeys=['source_id','raw_sha256','source_url','publisher','retrieved_at','data_qa_passed','private_research_authorized'];
 for(const [a,id] of [[u,'SHILLER_LEGACY'],[f,'FED_BOARD'],[c,'ESTAT']])checkReceipt(Object.fromEntries(baseKeys.map(k=>[k,a[k]])),id);
 if(sha(u.raw_sha256,'Shiller')!==pins.shiller||sha(f.raw_sha256,'FX')!==pins.fx||sha(c.raw_sha256,'CPI')!==pins.cpi)
  throw Error('Source SHA256 does not match canonical acquisition pins');
 if(f.source_url!=='https://www.federalreserve.gov/releases/h10/hist/dat00_ja.htm')throw Error('FX URL is not the pinned active H10 source');
 const cpiHost=new URL(c.source_url).hostname;
 if(!['www.e-stat.go.jp','api.e-stat.go.jp'].includes(cpiHost))throw Error('CPI URL must be e-Stat source');
 if(u.currency!=='USD'||u.return_kind!=='RESEARCH_APPROX_RETURN'||u.method!=='SHILLER_PRICE_PLUS_DIVIDEND_APPROX')throw Error('Only explicitly approximate USD Shiller return is accepted');
 if(f.source_channel!=='H10_ACTIVE_JAPAN_HISTORY'||f.quote!=='JPY_PER_USD'||f.aggregation!=='LAST_AVAILABLE_OBSERVED_IN_MONTH')throw Error('FX wrong quote/aggregation or DRAFT source channel');
 if(c.country!=='JP'||c.basket!=='HEADLINE_NSA'||c.index_unit!=='POSITIVE_INDEX_LEVEL')throw Error('Japanese headline unadjusted CPI only; US CPI/ex-rent not interchangeable');
 const usd=sortedRows(usd_monthly_returns,['month','approx_total_return_usd'],'USD'),fx=sortedRows(fx_monthly_levels,['month','value','month_status'],'FX'),cpi=sortedRows(jp_cpi_monthly_levels,['month','value'],'JP CPI');
 const range=(month,first,last,label)=>{if(monthSerial(month)<monthSerial(first)||monthSerial(month)>monthSerial(last))throw Error('Month outside canonical observed coverage for '+label+': '+month);};
 for(const month of usd.keys())range(month,pins.shillerFirst,pins.shillerLast,'Shiller');
 for(const [month,row] of fx)if(!(row.month_status==='LATEST_MONTH_PROVISIONAL'&&month===pins.fxProvisional))range(month,pins.fxFirst,pins.fxLast,'active FX H10');
 for(const month of cpi.keys())range(month,pins.cpiFirst,pins.cpiLast,'JP headline CPI');
 for(const [month,r] of usd)monthReturn(r.approx_total_return_usd,'approximate USD return '+month);
 let provisional=0;
 for(const [month,r] of fx){
  if(!['COMPLETE_OBSERVED','LATEST_MONTH_PROVISIONAL'].includes(r.month_status))throw Error('Invalid FX month status '+month);
  positive(r.value,'FX level '+month);
  if(r.month_status==='LATEST_MONTH_PROVISIONAL')provisional++;
 }
 for(const [month,r] of cpi)positive(r.value,'CPI level '+month);
 const nominal=[],real=[];const excluded={missing_fx_level:0,missing_jp_cpi_level:0,provisional_fx:0};
 for(const [month,r] of usd){
  const prev=formatMonth(monthSerial(month)-1);
  const nowFx=fx.get(month),pastFx=fx.get(prev);
  if(!nowFx||!pastFx){excluded.missing_fx_level++;continue;}
  if(nowFx.month_status!=='COMPLETE_OBSERVED'||pastFx.month_status!=='COMPLETE_OBSERVED'){excluded.provisional_fx++;continue;}
  const nowCpi=cpi.get(month),pastCpi=cpi.get(prev);
  if(!nowCpi||!pastCpi){excluded.missing_jp_cpi_level++;continue;}
  const rj=(1+r.approx_total_return_usd)*(nowFx.value/pastFx.value)-1;
  const rr=(1+rj)/(nowCpi.value/pastCpi.value)-1;
  if(!Number.isFinite(rj)||rj< -1||rj>10||!Number.isFinite(rr)||rr< -1||rr>10)throw Error('Converted return outside supported bounds '+month);
  nominal.push({month,origin:'OBSERVED',monthly_return:rj});
  real.push({month,approx_real_return_jpy:rr});
 }
 if(!nominal.length)throw Error('No complete observed USD / FX / Japan CPI alignment');
 // The existing canonical adapter enforces US_EQUITY source-lock, explicit Shiller fallback and JPY nominal units.
 const privateMarket=preparePrivateMonthlyMarket({source_registry,series:[{
  asset_id:'US_EQUITY',metadata:{source_id:'SHILLER_LEGACY',source_mode:'EXPLICIT_RESEARCH_FALLBACK',
   return_kind:'RESEARCH_APPROX_RETURN',currency:'JPY',return_unit:'DECIMAL_MONTHLY',
   raw_sha256:sha(u.raw_sha256,'Shiller raw'),source_url:u.source_url,publisher:u.publisher,
   retrieved_at:u.retrieved_at,data_qa_passed:true,private_research_authorized:true,observed:true},monthly_returns:nominal
 }]});
 let gap_boundaries=0;for(let i=1;i<nominal.length;i++)if(monthSerial(nominal[i].month)!==monthSerial(nominal[i-1].month)+1)gap_boundaries++;
 return {...privateMarket,source_channel_status:'ORIGINAL_LOCKED_H10_ONLY',
  conversion_mode:'USD_APPROX_TO_JPY_NOMINAL_WITH_SEPARATE_JP_CPI_DEFLATION',
  input_usd_return_months:usd.size,valid_jpy_return_months:nominal.length,excluded_months:excluded,
  provisional_fx_input_months:provisional,gap_boundaries,
  cpi_basket:'JP_HEADLINE_NSA',jpy_return_method:'(1+USD_r)*(FX_t/FX_t_minus_1)-1',
  real_return_method:'(1+JPY_nominal_r)/(JP_CPI_t/JP_CPI_t_minus_1)-1',
  research_only_real_rows:real,
  real_returns_not_passed_as_nominal_market:true,publication_approved:false,source_rights_approved:false,
  upstream_claims_verified_here:false,canonical_sha256_receipts_match_registry:true,raw_sha256_verified_against_bytes:false,
  note:'Private research only: receipt fields are self-asserted; raw files/sha, source permissions, FX channel, Shiller method are not independently authenticated. Data acquisition and release gates remain separate.'};
}
module.exports={preparePrivateShillerJpyResearch};
