'use strict';
/**
 * v0.25: conservative, date-only CPI vintage selection for private research.
 * A claimed publication date or SHA is NOT independent archival authentication.
 * Requiring a complete level history in each vintage prevents mixing revisions
 * and CPI rebasing across different releases in the same expense ratio.
 */
const {monthSerial,formatMonth}=require('./cashflow-core.cjs');
const MAX_VINTAGES=1200,MAX_LEVELS=1200;
const SNAPSHOT_KEYS=new Set(['vintage_id','published_on','origin','source_id','series_id','series_kind','unit','seasonal_adjustment','source_snapshot_sha256','levels']);
const LEVEL_KEYS=new Set(['month','value']);
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const object=(x,name)=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid '+name);return x;};
const keys=(x,allowed,name)=>{object(x,name);for(const k of Object.keys(x))if(!allowed.has(k))throw Error('Unsupported '+name+' field: '+k);};
function dateNumber(s){
 if(typeof s!=='string'||!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(s))throw Error('Invalid published_on or settlement date');
 const [y,m,d]=s.split('-').map(Number);
 if(y<1900||y>2200||new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)!==s)throw Error('Invalid calendar date');
 return y*10000+m*100+d;
}
function settlementDate(month,timing){
 const serial=monthSerial(month),y=Math.floor(serial/12),m=serial%12+1;
 if(y<1900||y>2200)throw Error('Market month outside supported settlement calendar');
 const day=timing==='MONTH_START'?1:timing==='MONTH_END'?new Date(Date.UTC(y,m,0)).getUTCDate():null;
 if(day===null)throw Error('Unsupported cashflow_timing');
 return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function validateCpiVintageSnapshots(raw,marketMode){
 if(!['SYNTHETIC_DEMO','OBSERVED_RESEARCH'].includes(marketMode))throw Error('Invalid market_mode');
 if(!Array.isArray(raw)||!raw.length||raw.length>MAX_VINTAGES)throw Error('CPI vintage snapshots must contain 1..1200 releases');
 const origin=marketMode==='OBSERVED_RESEARCH'?'OBSERVED':'SYNTHETIC';
 const source=origin==='OBSERVED'?'ESTAT':'SYNTHETIC_FIXTURE';
 const ids=new Set(),snapshots=[];let prevDate=0;
 for(const [i,v] of raw.entries()){
  keys(v,SNAPSHOT_KEYS,'vintage '+i);
  if(typeof v.vintage_id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(v.vintage_id)||ids.has(v.vintage_id))throw Error('Invalid or duplicate vintage_id');
  ids.add(v.vintage_id);
  const date=dateNumber(v.published_on);
  if(date<=prevDate)throw Error('CPI vintages not strictly ordered by unique publication date (unknown intraday order)');
  prevDate=date;
  if(v.origin!==origin||v.source_id!==source||v.series_id!=='JP_CPI_HEADLINE_2025_LINKED'||v.series_kind!=='CPI_LEVEL'||v.unit!=='INDEX_2025_100'||v.seasonal_adjustment!=='NSA')
   throw Error('CPI vintage provenance, basket, unit or base mismatch');
  if(origin==='OBSERVED'){
   if(typeof v.source_snapshot_sha256!=='string'||! /^[a-f0-9]{64}$/.test(v.source_snapshot_sha256))throw Error('Observed vintage needs pinned archive SHA-256 (claim not authenticated here)');
  }else if(own(v,'source_snapshot_sha256')&&!/^[a-f0-9]{64}$/.test(v.source_snapshot_sha256))throw Error('Invalid snapshot SHA-256');
  if(!Array.isArray(v.levels)||v.levels.length<1||v.levels.length>MAX_LEVELS)throw Error('Invalid CPI vintage levels');
  const byMonth=new Map();let prevSerial=null,lastSerial=null;
  for(const [j,row] of v.levels.entries()){
   keys(row,LEVEL_KEYS,'vintage CPI row '+i+':'+j);
   const n=monthSerial(row.month);
   if(prevSerial!==null&&n!==prevSerial+1)throw Error('CPI vintage must have contiguous ascending levels');
   prevSerial=n;lastSerial=n;
   const value=row.value;
   if(typeof value!=='number'&&!(typeof value==='string'&&/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)))throw Error('Invalid vintage CPI value');
   const num=Number(value);
   if(!Number.isFinite(num)||num<=0||num>1_000_000_000)throw Error('Unsafe vintage CPI index');
   byMonth.set(row.month,num);
  }
  if(lastSerial>=monthSerial(v.published_on.slice(0,7)))throw Error('CPI observation cannot be published in or before its own calendar month under strict release policy');
  snapshots.push({vintage_id:v.vintage_id,published_on:v.published_on,published_day:date,byMonth,last_observation_month:formatMonth(lastSerial),source_snapshot_sha256:v.source_snapshot_sha256||null});
 }
 return {snapshots,source_provenance:origin==='OBSERVED'?'USER_ASSERTED_ARCHIVE_SHA_UNVERIFIED':'SYNTHETIC_FIXTURE',source_snapshot_sha_verified_here:false};
}
function latestReleasedBefore(snapshots,settlement){
 const day=dateNumber(settlement);let lo=0,hi=snapshots.length;
 while(lo<hi){const m=(lo+hi)>>1;if(snapshots[m].published_day<day)lo=m+1;else hi=m;}
 return lo?snapshots[lo-1]:null; // publication on settlement day is always unavailable
}
function getLatestEligibleLevel(snapshot,settlementMonth,timing){
 const end=timing==='MONTH_START'?monthSerial(settlementMonth)-1:monthSerial(settlementMonth);
 const eligible=Math.min(end,monthSerial(snapshot.last_observation_month));
 if(eligible<0)return null;
 const month=formatMonth(eligible);
 const value=snapshot.byMonth.get(month);
 return value===undefined?null:{month,value};
}
module.exports={dateNumber,settlementDate,validateCpiVintageSnapshots,latestReleasedBefore,getLatestEligibleLevel};
