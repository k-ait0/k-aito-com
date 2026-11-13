'use strict';
/** Reviewed official CPI press-overview samples. NOT certified historical archive bytes. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {dateNumber}=require('./cpi-published-vintages.cjs');
const {monthSerial}=require('./cashflow-core.cjs');
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function fields(o,ks,name){if(!o||typeof o!=='object'||Array.isArray(o))throw Error('Invalid '+name);for(const k of Object.keys(o))if(!ks.includes(k))throw Error('Unexpected '+name+' field '+k);for(const k of ks)if(!has(o,k))throw Error('Missing '+name+' field '+k);}
const DOC=['schema','scope','extraction_method','data_source','publication_rights_approved','snapshot_bytes_authenticated','complete_historical_vintage_series','records'];
const ROW=['publication_id','series_id','base_year','observation_month','published_on','value','unit','geography','indicator','evidence_source_url','publication_metadata_url','raw_sha256','verification_status'];
const VERIFIED=Object.freeze({
 JP_CPI_2015_BASE_2016_07_NATIONAL:Object.freeze({series_id:'JP_CPI_HEADLINE_2015_BASE',base_year:2015,observation_month:'2016-07',published_on:'2016-08-26',value:99.6,unit:'INDEX_2015_100',evidence_source_url:'https://www.e-stat.go.jp/stat-search/file-download?fileKind=2&statInfId=000031441892'}),
 JP_CPI_2020_BASE_2021_07_NATIONAL:Object.freeze({series_id:'JP_CPI_HEADLINE_2020_BASE',base_year:2020,observation_month:'2021-07',published_on:'2021-08-20',value:99.7,unit:'INDEX_2020_100',evidence_source_url:'https://www.e-stat.go.jp/stat-search/file-download?fileKind=2&statInfId=000032111520'}),
 JP_CPI_2025_BASE_2026_07_NATIONAL:Object.freeze({series_id:'JP_CPI_HEADLINE_2025_LINKED',base_year:2025,observation_month:'2026-07',published_on:'2026-08-21',value:102.0,unit:'INDEX_2025_100',evidence_source_url:'https://www.stat.go.jp/data/cpi/sokuhou/tsuki/index-z.html?mod=article_inline'})
});
function sourceUrl(s){
 if(typeof s!=='string'||s.length>750||/[\\\r\n\t]/.test(s))throw Error('Invalid official URL');
 let u;try{u=new URL(s)}catch{throw Error('Invalid official URL')}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!['www.e-stat.go.jp','www.stat.go.jp'].includes(u.hostname))throw Error('Not an allowed official Japanese source');
 return s;
}
function validateEvidence(doc){
 fields(doc,DOC,'catalogue');
 if(doc.schema!=='ANALYTICS_CPI_OFFICIAL_MONTHLY_EVIDENCE_V027'||doc.scope!=='RESEARCH_ONLY_OFFICIAL_PUBLICATION_TEXT_NOT_ARCHIVED_RAW'||doc.extraction_method!=='MANUAL_FIRST_PARTY_WEB_AND_PDF_TEXT_REVIEW'||doc.data_source!=='STATISTICS_BUREAU_JAPAN_ESTAT'||doc.publication_rights_approved!==false||doc.snapshot_bytes_authenticated!==false||doc.complete_historical_vintage_series!==false)throw Error('Misleading official evidence status');
 if(!Array.isArray(doc.records)||doc.records.length!==3)throw Error('Only the three reviewed official CPI overview observations are allowed');
 const seen=new Set();
 for(const r of doc.records){
  fields(r,ROW,'official observation');const t=VERIFIED[r.publication_id];
  if(!t||seen.has(r.publication_id))throw Error('Unknown or repeated reviewed official CPI sample');seen.add(r.publication_id);
  for(const [k,v] of Object.entries(t))if(r[k]!==v)throw Error('Reviewed publication content mismatch '+r.publication_id+':'+k);
  if(r.geography!=='JP_NATIONAL'||r.indicator!=='CPI_HEADLINE_NSA'||r.raw_sha256!==null||r.verification_status!=='OFFICIAL_RELEASE_CONTENT_REVIEWED_RAW_BYTES_UNAVAILABLE')throw Error('Claim of archived or different CPI series is forbidden');
  sourceUrl(r.evidence_source_url);sourceUrl(r.publication_metadata_url);
  dateNumber(r.published_on);
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.observation_month)||monthSerial(r.observation_month)>=monthSerial(r.published_on.slice(0,7)))throw Error('CPI observation must predate release month');
 }
 return doc.records.slice().sort((a,b)=>a.published_on.localeCompare(b.published_on));
}
function asOfEvidence(doc,day){
 const entries=validateEvidence(doc);const asof=dateNumber(day);
 const eligible=entries.filter(r=>dateNumber(r.published_on)<asof);
 return {status:'OFFICIAL_OVERVIEW_EVIDENCE_ONLY',asof_date:day,rule:'PUBLICATION_DAY_EXCLUDED_TIME_NOT_ASSUMED',total_reviewed_samples:entries.length,eligible_count:eligible.length,
  eligible:eligible.map(r=>({id:r.publication_id,month:r.observation_month,release:r.published_on,basis:r.base_year,headline_index:r.value})),
  authenticated_raw:false,full_vintage_coverage:false,eligible_for_backtest:false,rights_approved:false};
}
function verifyPrivateArchives(items,repoRoot){
 if(!Array.isArray(items)||items.length<1||items.length>3)throw Error('Private archive manifest must list 1..3 entries');
 const root=fs.realpathSync(repoRoot),seen=new Set(),results=[];
 for(const x of items){if(!x||!VERIFIED[x.publication_id]||seen.has(x.publication_id))throw Error('Unreviewed or duplicate PDF source');seen.add(x.publication_id);}
 seen.clear();
 for(const x of items){
  fields(x,['publication_id','archive_path','expected_sha256'],'private archive entry');
  if(!VERIFIED[x.publication_id]||seen.has(x.publication_id))throw Error('Unreviewed or duplicate PDF source');seen.add(x.publication_id);
  if(typeof x.archive_path!=='string'||!path.isAbsolute(x.archive_path)||typeof x.expected_sha256!=='string'||!/^[a-f0-9]{64}$/.test(x.expected_sha256))throw Error('Invalid PDF path or digest');
  const file=fs.realpathSync(x.archive_path),stat=fs.lstatSync(x.archive_path);
  if(stat.isSymbolicLink()||!stat.isFile()||stat.size<50||stat.size>25e6||file===root||file.startsWith(root+path.sep))throw Error('PDF must be an ordinary outside-repository file under 25MB');
  const buf=fs.readFileSync(file);
  if(buf.subarray(0,5).toString('ascii')!=='%PDF-'||buf.subarray(-2048).indexOf(Buffer.from('%%EOF'))===-1)throw Error('Invalid PDF magic/trailer');
  const sha=crypto.createHash('sha256').update(buf).digest('hex');
  if(sha!==x.expected_sha256)throw Error('User-pinned PDF digest mismatch');
  results.push({publication_id:x.publication_id,sha256:sha,bytes:stat.size});
 }
 return {status:'USER_PINNED_PDF_BYTES_MATCH',verified_count:results.length,details:results,official_source_origin_authenticated:false,monthly_index_values_verified_against_pdf:false,backtest_approved:false};
}
module.exports={VERIFIED,validateEvidence,asOfEvidence,verifyPrivateArchives,sourceUrl};
