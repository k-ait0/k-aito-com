'use strict';
/** Historical monthly Japan CPI snapshots: a strict basis-aware, date-only contract.
 * Official first-publication dates for rebased RETROSPECTIVE series are independently
 * documented, but later release dates and values supplied by callers ARE NOT.
 * This module never downloads or authenticates the user-supplied source documents.
 */
const {monthSerial,formatMonth}=require('./cashflow-core.cjs');
const {dateNumber,settlementDate,latestReleasedBefore,getLatestEligibleLevel}=require('./cpi-published-vintages.cjs');
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const RELEASE_BASES=Object.freeze({
  JP_CPI_HEADLINE_2015_BASE:Object.freeze({base_year:2015,unit:'INDEX_2015_100',first_release_latest_month:'2016-06',earliest_published_on:'2016-08-12',source_url:'https://www.stat.go.jp/data/cpi/2015/pdf/2015_sche.pdf'}),
  JP_CPI_HEADLINE_2020_BASE:Object.freeze({base_year:2020,unit:'INDEX_2020_100',first_release_latest_month:'2021-06',earliest_published_on:'2021-08-06',source_url:'https://www.stat.go.jp/data/cpi/2020/pdf/def2020-2015.pdf'}),
  JP_CPI_HEADLINE_2025_LINKED:Object.freeze({base_year:2025,unit:'INDEX_2025_100',first_release_latest_month:'2026-06',earliest_published_on:'2026-08-07',source_url:'https://www.stat.go.jp/data/cpi/2025/sokyu.html'})
});
const KEYS=new Set(['vintage_id','published_on','origin','source_id','series_id','series_kind','unit','seasonal_adjustment','source_snapshot_sha256','levels']);
const LEVEL_KEYS=new Set(['month','value']);
function object(x,name){if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid '+name);return x;}
function strictKeys(x,allowed,name){object(x,name);for(const key of Object.keys(x))if(!allowed.has(key))throw Error('Unsupported '+name+' field: '+key);}
function validateHistoricalCpiVintages(raw,market_mode){
 if(!['SYNTHETIC_DEMO','OBSERVED_RESEARCH'].includes(market_mode))throw Error('Invalid market_mode');
 if(!Array.isArray(raw)||raw.length<1||raw.length>1200)throw Error('CPI historical vintages must contain 1..1200 releases');
 const expectedOrigin=market_mode==='OBSERVED_RESEARCH'?'OBSERVED':'SYNTHETIC';
 const expectedSource=expectedOrigin==='OBSERVED'?'ESTAT':'SYNTHETIC_FIXTURE';
 const seen=new Set(),snapshots=[];let previousDate=0,previousBasis=0;
 for(const [i,v] of raw.entries()){
  strictKeys(v,KEYS,`CPI vintage ${i}`);
  if(typeof v.vintage_id!=='string'||! /^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(v.vintage_id)||seen.has(v.vintage_id))throw Error('Invalid or duplicate CPI vintage ID');
  seen.add(v.vintage_id);
  const published_day=dateNumber(v.published_on);
  if(published_day<=previousDate)throw Error('CPI releases must be strictly ordered by publication date; same-day order unavailable');
  previousDate=published_day;
  const spec=own(RELEASE_BASES,v.series_id)?RELEASE_BASES[v.series_id]:null;
  if(!spec||v.origin!==expectedOrigin||v.source_id!==expectedSource||v.series_kind!=='CPI_LEVEL'||v.unit!==spec.unit||v.seasonal_adjustment!=='NSA')throw Error('CPI basket, provenance, or index base mismatch');
  if(spec.base_year<previousBasis)throw Error('CPI basis must not regress across selected release vintages');
  previousBasis=spec.base_year;
  if(expectedOrigin==='OBSERVED'&&published_day<dateNumber(spec.earliest_published_on))throw Error('Impossible historical release: official rebased CPI not yet published on claimed date');
  if(expectedOrigin==='OBSERVED'&&(!/^[a-f0-9]{64}$/.test(v.source_snapshot_sha256||'')))throw Error('Observed vintage must declare an archive SHA-256 (not authenticated here)');
  if(expectedOrigin==='SYNTHETIC'&&own(v,'source_snapshot_sha256')&&!/^[a-f0-9]{64}$/.test(v.source_snapshot_sha256))throw Error('Invalid declared archive SHA');
  if(!Array.isArray(v.levels)||v.levels.length<1||v.levels.length>1200)throw Error('CPI vintage levels must contain 1..1200 consecutive observations');
  const byMonth=new Map();let previousMonth=null;
  for(const [j,r] of v.levels.entries()){
   strictKeys(r,LEVEL_KEYS,`CPI level ${i}:${j}`);
   const month=monthSerial(r.month);
   if(previousMonth!==null&&month!==previousMonth+1)throw Error('CPI level months must be consecutive and ordered');
   previousMonth=month;
   if(typeof r.value!=='number'&&!(typeof r.value==='string'&&/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(r.value)))throw Error('Invalid CPI level string');
   const value=Number(r.value);
   if(!(value>0&&value<=1e9&&Number.isFinite(value)))throw Error('Unsafe CPI index level');
   byMonth.set(r.month,value);
  }
  if(previousMonth>=monthSerial(v.published_on.slice(0,7)))throw Error('CPI observation month cannot be in/after publication month');
  if(expectedOrigin==='OBSERVED'&&published_day===dateNumber(spec.earliest_published_on)&&previousMonth>monthSerial(spec.first_release_latest_month))throw Error('Official base introduction cannot contain an observation first published in a later monthly release');
  snapshots.push({vintage_id:v.vintage_id,published_on:v.published_on,published_day,
   basis_year:spec.base_year,series_id:v.series_id,unit:spec.unit,source_snapshot_sha256:v.source_snapshot_sha256||null,
   last_observation_month:formatMonth(previousMonth),byMonth});
 }
 return {snapshots,policy:'OFFICIAL_REBASE_EARLIEST_PUBLICATION_DATE_AND_STRICT_DATE_ONLY',
  first_release_dates_independently_confirmed:true,individual_release_dates_independently_verified:false,
  archive_bytes_authenticated_here:false,
  declared_origin:expectedOrigin};
}
module.exports={RELEASE_BASES,validateHistoricalCpiVintages,dateNumber,settlementDate,latestReleasedBefore,getLatestEligibleLevel};
