'use strict';
/** Pinned and reviewed national headline CPI release excerpts, 2026-07..09.
 * NOT a complete official vintage dataset; PDF bytes unavailable, 1 decimal precision.
 * Never accept this miniature evidence record as an observed monthly investment series.
 */
const {dateNumber}=require('./cpi-published-vintages.cjs');
const {monthSerial}=require('./cashflow-core.cjs');
const has=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const HEADER=Object.freeze({
 schema:'ANALYTICS_JP_CPI_RELEASE_SEQUENCE_V028',
 record_status:'OFFICIAL_METADATA_AND_VALUE_REVIEWED_SOURCE_BYTES_UNAVAILABLE',
 purpose:'RESEARCH_ONLY_ASOF_DEMONSTRATION_NOT_FULL_VINTAGE_HISTORY',
 indicator:'JP_NATIONAL_HEADLINE_CPI_NON_SEASONALLY_ADJUSTED',base_year:2025,
 unit:'INDEX_2025_100',allow_backtest_as_verified_vintage:false,
 raw_pdf_bytes_authenticated:false,all_historical_monthly_releases_obtained:false,
 official_monthly_change_reconstructed_from_unrounded_values:false,
 data_source:'STATISTICS_BUREAU_JAPAN_ESTAT'
});
const HEAD_KEYS=new Set([...Object.keys(HEADER),'records']);
const RECORD_KEYS=new Set(['observation_month','headline_index','published_on','published_at_jst',
 'stat_infid','publication_metadata_url','headline_value_source_url','release_pdf_sha256']);
const EXACT=Object.freeze([
 Object.freeze({observation_month:'2026-07',headline_index:102.0,published_on:'2026-08-21',stat_infid:'000040491312',
  headline_value_source_url:'https://www.stat.go.jp/data/cpi/sokuhou/tsuki/index-z.html?mod=article_inline'}),
 Object.freeze({observation_month:'2026-08',headline_index:102.2,published_on:'2026-09-18',stat_infid:'000040501408',
  headline_value_source_url:'https://dashboard.e-stat.go.jp/'}),
 Object.freeze({observation_month:'2026-09',headline_index:102.2,published_on:'2026-10-23',stat_infid:'000040513537',
  headline_value_source_url:'https://www.stat.go.jp/data/cpi/sokuhou/tsuki/index-z.htm'})
]);
const fixedUrl=id=>'https://www.e-stat.go.jp/stat-search/files?layout=dataset&stat_infid='+id;
function shape(x,keys,label){
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length!==keys.size)throw Error('Invalid '+label+' shape');
 for(const k of keys)if(!has(x,k))throw Error('Missing '+label+' '+k);
 for(const k of Object.keys(x))if(!keys.has(k))throw Error('Unexpected '+label+' '+k);
}
function validateSequence(doc){
 shape(doc,HEAD_KEYS,'release evidence document');
 for(const [k,v] of Object.entries(HEADER))if(doc[k]!==v)throw Error('Misleading release evidence status '+k);
 if(!Array.isArray(doc.records)||doc.records.length!==EXACT.length)throw Error('Exactly three reviewed consecutive releases required');
 for(let i=0;i<EXACT.length;i++){
  const r=doc.records[i],expected=EXACT[i];shape(r,RECORD_KEYS,'release '+i);
  for(const [k,v] of Object.entries(expected))if(r[k]!==v)throw Error('Pinned reviewed official release mismatch '+i+':'+k);
  if(r.published_at_jst!==r.published_on+'T08:30:00+09:00')throw Error('Official publication timestamp mismatch');
  if(r.publication_metadata_url!==fixedUrl(r.stat_infid))throw Error('Pinned official dataset URL mismatch');
  if(r.release_pdf_sha256!==null)throw Error('Unverified release PDF digest claim');
  dateNumber(r.published_on);
  if(i){if(monthSerial(r.observation_month)!==monthSerial(doc.records[i-1].observation_month)+1)throw Error('Nonconsecutive CPI month');
   if(dateNumber(r.published_on)<=dateNumber(doc.records[i-1].published_on))throw Error('Nonascending CPI release date');}
 }
 return doc.records;
}
function releasedAsOf(doc,asof){
 const rows=validateSequence(doc),day=dateNumber(asof);
 if(day>20261113)throw Error('As-of date after reviewed release evidence cutoff 2026-11-13');
 // No time-of-day assumption: a publication dated TODAY is not yet usable.
 const released=rows.filter(r=>dateNumber(r.published_on)<day);
 const latest=released.at(-1)||null;
 return {status:latest?'OFFICIAL_REVIEWED_SINGLE_MONTH_VALUE':'NO_PUBLISHED_REVIEWED_OBSERVATION',
   asof_date:asof,decision_rule:'STRICTLY_BEFORE_SETTLEMENT_CALENDAR_DATE',
   published_observations:released.length,latest_observation_month:latest?.observation_month||null,
   latest_published_on:latest?.published_on||null,latest_headline_index:latest?.headline_index??null,
   basis_year:2025,verified_official_release_metadata:true,verified_reviewed_index_value:true,
   authentic_pdf_bytes:false,complete_vintage_data:false,monthly_return_index_approved:false,
   full_historical_asof_backtest_approved:false};
}
function previewExpense(doc,dates,baseLivingYen){
 validateSequence(doc);
 if(!Array.isArray(dates)||dates.length<1||dates.length>12)throw Error('Provide 1..12 sample settlement dates');
 if(!Number.isSafeInteger(baseLivingYen)||baseLivingYen<0||baseLivingYen>1_000_000_000)throw Error('Invalid hypothetical living expense');
 const snapshots=[];let prev=0,baseline=null;
 for(const day of dates){
  const serial=dateNumber(day);if(serial<=prev)throw Error('Settlement days must ascend without duplicates');prev=serial;
  const s=releasedAsOf(doc,day);
  if(!s.latest_observation_month)throw Error('CPI unavailable on '+day+'; no unobserved carry-forward');
  // Preview is intentionally limited to the reviewed published period, not an open-ended forward fill.
  if(serial>20261113)throw Error('No reviewed releases beyond research cutoff 2026-11-13');
  if(baseline===null)baseline=s.latest_headline_index;
  const yen=Math.round(baseLivingYen*s.latest_headline_index/baseline);
  if(!Number.isSafeInteger(yen))throw Error('Unsafe CPI expense preview');
  snapshots.push({date:day,reference_month:s.latest_observation_month,
   reference_release_date:s.latest_published_on,illustrative_living_expense_yen:yen});
 }
 return {status:'ROUNDED_OFFICIAL_INDEX_EVIDENCE_EXAMPLE_ONLY',base_living_yen:baseLivingYen,
  baseline_rounded_index:baseline,samples:snapshots,
  approximate_change_only:true,rounding_can_differ_from_published_official_mom_change:true,
  investment_market_returns_used:false,full_historical_vintage_backtest_approved:false,
  complete_missing_month_handling:false};
}
function comparePublishedLevels(doc){
 const rows=validateSequence(doc),steps=[];
 for(let i=1;i<rows.length;i++)steps.push({from_month:rows[i-1].observation_month,to_month:rows[i].observation_month,
  from_index_rounded_1dp:rows[i-1].headline_index,to_index_rounded_1dp:rows[i].headline_index,
  rounded_index_ratio_pct:+((rows[i].headline_index/rows[i-1].headline_index-1)*100).toFixed(6),
  official_month_on_month_rate:false});
 return {status:'APPROX_FROM_REVIEWED_ONE_DECIMAL_LEVELS',steps,not_official_monthly_change:true,
  historical_vintage_chain_verified:false};
}
module.exports={HEADER,EXACT,validateSequence,releasedAsOf,previewExpense,comparePublishedLevels};
