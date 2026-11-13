'use strict';
/** v0.29 reviewed official publication events; NO original PDFs or vintage levels authenticated. */
const {dateNumber}=require('./cpi-published-vintages.cjs');
const {validateSequence}=require('./cpi-official-consecutive-v028.cjs');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const ROOT_FIELDS=new Set(['schema','review_cutoff_jst','release_event_status','original_pdf_bytes_authenticated','complete_vintage_history','rebase_reference_levels_acquired','publication_approved','events']);
const EVENT_FIELDS=new Set(['event_id','event_type','published_at_jst','observation_month','base_year','headline_index_rounded_1dp','source_url','pdf_status']);
const SOURCE_CALENDAR='https://www.e-stat.go.jp/release-calendar/statistics/00200573';
const SOURCE_RETRO='https://www.stat.go.jp/data/cpi/2025/sokyu.html';
const EXACT=Object.freeze([
 Object.freeze({event_id:'CPI_REBASE_2025_20260807',event_type:'REBASE_RETROSPECTIVE',published_at_jst:'2026-08-07T16:00:00+09:00',observation_month:null,base_year:2025,headline_index_rounded_1dp:null,source_url:SOURCE_RETRO,pdf_status:'SOURCE_BYTES_NOT_ACQUIRED'}),
 Object.freeze({event_id:'CPI_NATIONAL_202607',event_type:'MONTHLY_HEADLINE',published_at_jst:'2026-08-21T08:30:00+09:00',observation_month:'2026-07',base_year:2025,headline_index_rounded_1dp:102,source_url:'https://www.e-stat.go.jp/stat-search/files?layout=dataset&stat_infid=000040491312',pdf_status:'SOURCE_BYTES_NOT_ACQUIRED'}),
 Object.freeze({event_id:'CPI_NATIONAL_202608',event_type:'MONTHLY_HEADLINE',published_at_jst:'2026-09-18T08:30:00+09:00',observation_month:'2026-08',base_year:2025,headline_index_rounded_1dp:102.2,source_url:'https://www.e-stat.go.jp/stat-search/files?layout=dataset&stat_infid=000040501408',pdf_status:'SOURCE_BYTES_NOT_ACQUIRED'}),
 Object.freeze({event_id:'CPI_NATIONAL_202609',event_type:'MONTHLY_HEADLINE',published_at_jst:'2026-10-23T08:30:00+09:00',observation_month:'2026-09',base_year:2025,headline_index_rounded_1dp:102.2,source_url:'https://www.e-stat.go.jp/stat-search/files?layout=dataset&stat_infid=000040513537',pdf_status:'SOURCE_BYTES_NOT_ACQUIRED'})
]);
const ROOT={schema:'ANALYTICS_CPI_OFFICIAL_INTRADAY_CALENDAR_V029',review_cutoff_jst:'2026-11-13T23:59:59+09:00',release_event_status:'FIRST_PARTY_PUBLICATION_METADATA_REVIEWED_PDF_UNAUTHENTICATED',original_pdf_bytes_authenticated:false,complete_vintage_history:false,rebase_reference_levels_acquired:false,publication_approved:false};
function keys(x,expected,label){if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid '+label);const ks=Object.keys(x);if(ks.length!==expected.size||ks.some(k=>!expected.has(k)))throw Error('Unexpected '+label+' fields');for(const k of expected)if(!own(x,k))throw Error('Missing '+label+' '+k);}
function instant(s){
 if(typeof s!=='string'||!/^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)\+09:00$/.test(s))throw Error('JST timestamp must be YYYY-MM-DDTHH:mm:ss+09:00');
 dateNumber(s.slice(0,10));const n=Date.parse(s);if(!Number.isSafeInteger(n)||new Date(n+9*3600000).toISOString().slice(0,19)!==s.slice(0,19))throw Error('Invalid JST timestamp');return n;
}
function validateCalendar(data,v28){
 keys(data,ROOT_FIELDS,'publication calendar');for(const [k,v] of Object.entries(ROOT))if(data[k]!==v)throw Error('Incorrect calendar provenance status: '+k);
 const confirmed=validateSequence(v28);if(!Array.isArray(data.events)||data.events.length!==EXACT.length)throw Error('Wrong number of reviewed publication events');
 let last=0;for(let i=0;i<EXACT.length;i++){
  const event=data.events[i],expected=EXACT[i];keys(event,EVENT_FIELDS,'event '+i);
  for(const [k,v] of Object.entries(expected))if(event[k]!==v)throw Error('Altered reviewed publication event '+i+':'+k);
  const t=instant(event.published_at_jst);if(t<=last)throw Error('Out-of-order publication instant');last=t;
  if(i>0){const row=confirmed[i-1];if(event.observation_month!==row.observation_month||event.headline_index_rounded_1dp!==row.headline_index||event.published_at_jst!==row.published_at_jst)throw Error('Mismatch with v0.28 independently reviewed CPI evidence');}
 }
 return data.events;
}
function releasedAt(data,v28,asofJst){
 const events=validateCalendar(data,v28),cutoff=instant(data.review_cutoff_jst),now=instant(asofJst);
 if(now>cutoff)throw Error('As-of instant after reviewed evidence cutoff');
 // Conservative even with exact scheduled release time: require STRICTLY LATER than publication second.
 const prior=events.filter(e=>instant(e.published_at_jst)<now);
 const latest=prior.filter(e=>e.event_type==='MONTHLY_HEADLINE').at(-1)||null;
 return {status:latest?'REVIEWED_HEADLINE_LEVEL_AVAILABLE':'NO_REVIEWED_HEADLINE_AVAILABLE',asof_jst:asofJst,rule:'STRICTLY_AFTER_OFFICIALLY_RECORDED_PUBLICATION_SECOND',
  rebase_2025_metadata_available:prior.some(e=>e.event_type==='REBASE_RETROSPECTIVE'),
  rebase_reference_levels_available:false,visible_reviewed_release_count:prior.length,
  latest_observation_month:latest?.observation_month??null,latest_headline_index_rounded_1dp:latest?.headline_index_rounded_1dp??null,
  latest_release_instant:latest?.published_at_jst??null,original_pdf_bytes_authenticated:false,
  ready_for_historical_asof_backtest:false,official_month_on_month_from_unrounded_index:false};
}
/** An untrusted local PDF digest is NOT a verified official PDF digest. Never commit PDF bytes. */
function fingerprintLocalPdf(p){
 if(!path.isAbsolute(p))throw Error('PDF path must be absolute');
 const st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink()||st.size<256||st.size>12*1024*1024)throw Error('Unsafe or unexpected PDF file');
 const b=fs.readFileSync(p);if(b.subarray(0,5).toString('ascii')!=='%PDF-'||!b.subarray(Math.max(0,b.length-2048)).includes(Buffer.from('%%EOF')))throw Error('No PDF document header/trailer');
 return {status:'LOCAL_CANDIDATE_BYTES_FINGERPRINTED_NOT_OFFICIAL_ORIGIN_AUTHENTICATED',byte_count:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),file_is_officially_authenticated:false,private_source_path_not_reported:true};
}
module.exports={EXACT,ROOT,instant,validateCalendar,releasedAt,fingerprintLocalPdf};
