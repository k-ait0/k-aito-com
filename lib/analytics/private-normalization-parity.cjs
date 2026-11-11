'use strict';
/** Independent source->canonical monthly reconstruction for private acceptance only.
 * This code deliberately does not import the acquisition-side Fed/e-Stat parsers.
 * It must run after registry-pinned byte checks; it neither downloads nor publishes.
 */
const {monthSerial}=require('./cashflow-core.cjs');
const {canonicalRows}=require('./private-canonical-csv.cjs');
const {buildPrivateReport}=require('./private-jpy-e2e.cjs');
const MONTHS=Object.freeze({JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12});
function csvRecords(s){
 if(typeof s!=='string'||s.includes('\u0000'))throw Error('Raw CSV text invalid');
 const out=[],cur=[];let field='',quoted=false,finishedQuote=false;
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(quoted){if(c==='"'){if(s[i+1]==='"'){field+='"';i++;}else{quoted=false;finishedQuote=true;}}else{field+=c;}}
  else if(c===','){cur.push(field);field='';finishedQuote=false;}
  else if(c==='\n'){cur.push(field);out.push([...cur]);cur.length=0;field='';finishedQuote=false;}
  else if(c==='\r'){if(s[i+1]!=='\n')throw Error('Invalid bare CR in raw CSV');}
  else if(c==='"'){if(field||finishedQuote)throw Error('Invalid quoting in raw CSV');quoted=true;}
  else{if(finishedQuote)throw Error('Unexpected text after closing quote');field+=c;}
 }
 if(quoted)throw Error('Unterminated quote in raw CSV');
 if(cur.length||field) {cur.push(field);out.push([...cur]);}
 return out;
}
function normalizedDecimal(s){if(typeof s!=='string'||!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(s)||!(Number(s)>0)||!Number.isFinite(Number(s)))throw Error('Invalid raw official positive decimal');return s;}
function parseEstatRaw(raw,{category,label,seriesId}){
 if(!Buffer.isBuffer(raw)||raw.length>16*1024*1024)throw Error('Invalid e-Stat raw bytes');
 let text;try{text=new TextDecoder('shift_jis',{fatal:true}).decode(raw);}catch(e){throw Error('Invalid CP932 original');}
 const rows=csvRecords(text),first=rows[0],codes=rows[2];
 if(rows.length<8||first?.[0]!=='類・品目'||codes?.[0]!=='類・品目符号(Group/Item code)')throw Error('Unexpected e-Stat source heading');
 if(first.length!==codes.length||codes.filter(c=>c===category).length!==1)throw Error('Missing/duplicate e-Stat classification');
 const ix=codes.indexOf(category);if(first[ix]!==label)throw Error('e-Stat category title mismatch');
 const values=new Map(),overlap=new Map();let lastSerial=null,started=false,exIx=-1;
 if(category==='0001'){
  if(codes.filter(c=>c==='0163').length!==1)throw Error('Independent headline original missing ex-rent crosscheck');
  exIx=codes.indexOf('0163');
 }
 for(const row of rows.slice(6)){
  if(row.length!==first.length)throw Error('Bad e-Stat CSV width');
  const yyyymm=row[0];
  if(!/^(?:19|20)\d{4}$/.test(yyyymm)||Number(yyyymm.slice(4))<1||Number(yyyymm.slice(4))>12)throw Error('Bad e-Stat YYYYMM');
  const month=yyyymm.slice(0,4)+'-'+yyyymm.slice(4),at=monthSerial(month);
  if(lastSerial!==null&&at!==lastSerial+1)throw Error('Missing or repeated e-Stat raw month');
  lastSerial=at;
  if(exIx>=0&&row[exIx]!=='')overlap.set(month,normalizedDecimal(row[exIx]));
  const value=row[ix];
  if(value===''){if(started)throw Error('Undocumented e-Stat internal missing value');continue;}
  started=true;values.set(month,normalizedDecimal(value));
 }
 if(values.size<1)throw Error('No e-Stat observed values');
 return {series_id:seriesId,values,exRentCrosscheck:overlap};
}
function parseFedHistoricalRaw(raw){
 if(!Buffer.isBuffer(raw)||raw.length>16*1024*1024)throw Error('Invalid official H10 HTML bytes');
 const html=raw.toString('utf8');
 if(!/Historical Rates for the Japanese Yen/i.test(html))throw Error('Wrong Fed H10 title');
 const content=html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
 const days=new Map();
 for(const hit of content.matchAll(/\b(\d{1,2})-([A-Z]{3})-(\d{2})\s+(ND|\d+\.\d{4})\b/g)){
  const mm=MONTHS[hit[2]],dd=Number(hit[1]);if(!mm)throw Error('Unknown Fed calendar month');
  const day=String(2000+Number(hit[3]))+'-'+String(mm).padStart(2,'0')+'-'+String(dd).padStart(2,'0');
  const time=new Date(day+'T00:00:00Z');if(!Number.isFinite(time.getTime())||time.toISOString().slice(0,10)!==day)throw Error('Invalid Fed calendar day');
  if(days.has(day))throw Error('Duplicate daily Fed observation');
  if(hit[4]!=='ND'&&(!(Number(hit[4])>0)||Number(hit[4])>1000))throw Error('Out of range Fed FX');
  days.set(day,hit[4]);
 }
 if(!days.size)throw Error('No Fed daily data');
 const sorted=[...days].sort(([a],[b])=>a.localeCompare(b)),months=new Map();
 for(const [day,value] of sorted)if(value!=='ND')months.set(day.slice(0,7),{day,value});
 const monthKeys=[...months.keys()];
 if(monthKeys.length<2)throw Error('Fed history missing complete months');
 for(let i=1;i<monthKeys.length;i++)if(monthSerial(monthKeys[i])!==monthSerial(monthKeys[i-1])+1)throw Error('Missing Fed month in raw source');
 return {raw_daily_rows:days.size,raw_daily_missing_nd:[...days.values()].filter(v=>v==='ND').length,
  last_month_provisional:monthKeys.at(-1),finalMonths:new Map(monthKeys.slice(0,-1).map(m=>[m,months.get(m).value])),
  final_months:monthKeys.length-1};
}
function compareCanonicalMap(actual,expected,label){
 if(actual.length!==expected.size)throw Error(label+' source-to-canonical count differs');
 const map=new Map(actual.map(x=>[x.month,x.value]));
 if(map.size!==actual.length)throw Error(label+' duplicate canonical months');
 for(const [month,value] of expected){
  if(!map.has(month))throw Error(label+' missing canonical month '+month);
  if(Number(map.get(month))!==Number(value))throw Error(label+' raw-to-canonical value mismatch at '+month);
 }
}
function verifyRawNormalizationParity(files){
 if(!files||typeof files!=='object')throw Error('Private raw files required');
 const fed=parseFedHistoricalRaw(files.fed);
 const cpiHead=parseEstatRaw(files.cpi_headline,{category:'0001',label:'総合',seriesId:'JP_CPI_HEADLINE_2025_LINKED'});
 const cpiEx=parseEstatRaw(files.cpi_ex_rent,{category:'0163',label:'持家の帰属家賃を除く総合',seriesId:'JP_CPI_EX_RENT_2025_LINKED'});
 const fx=canonicalRows(files.fx_canonical,{label:'Fed H10',allowedSeries:new Set(['FED_H10_USDJPY_MONTH_END'])});
 const jp=canonicalRows(files.cpi_canonical,{label:'JP CPI',allowedSeries:new Set(['JP_CPI_HEADLINE_2025_LINKED','JP_CPI_EX_RENT_2025_LINKED'])});
 compareCanonicalMap(fx,fed.finalMonths,'Fed H10');
 compareCanonicalMap(jp.filter(x=>x.series_id==='JP_CPI_HEADLINE_2025_LINKED'),cpiHead.values,'e-Stat headline');
 compareCanonicalMap(jp.filter(x=>x.series_id==='JP_CPI_EX_RENT_2025_LINKED'),cpiEx.values,'e-Stat ex-rent');
 let overlap=0;
 for(const [month,value] of cpiHead.exRentCrosscheck){
  if(!cpiEx.values.has(month))continue;
  overlap++;if(Number(value)!==Number(cpiEx.values.get(month)))throw Error('Independent official e-Stat ex-rent originals disagree: '+month);
 }
 if(overlap<1)throw Error('No independent e-Stat overlap');
 return {raw_to_canonical_normalization_independently_recomputed:true,source_bytes_checked_against_registry_here:false,
  fx_daily_rows:fed.raw_daily_rows,fx_daily_ND:fed.raw_daily_missing_nd,fx_final_months:fed.final_months,fx_provisional_excluded:fed.last_month_provisional,
  jp_headline_months:cpiHead.values.size,jp_ex_rent_months:cpiEx.values.size,official_jp_cpi_independent_overlap_verified:overlap,
  note:'Independent monthly values matched within supplied raw; byte pins/rights checked separately.'};
}
function buildPrivateV10Report({source_registry,manifest,files,plan=null,registry_file_sha256=null}){
 // First fail-closed based on acquisition registry and actual supplied byte fingerprints.
 const result=buildPrivateReport({source_registry,manifest,files,plan,registry_file_sha256});
 // Then independently reproduce canonical values from official raw source structure.
 const parity=verifyRawNormalizationParity(files);
 if(parity.fx_final_months!==result.input_proof.fed_monthly_levels||parity.jp_headline_months!==result.input_proof.jp_headline_cpi_levels||parity.jp_ex_rent_months!==result.input_proof.jp_ex_rent_cpi_levels)
   throw Error('Independent raw normalization coverage does not match pinned byte QA');
 return {...result,schema:'ANALYTICS_PRIVATE_HANDOFF_V0_10',status:'PRIVATE_BYTES_AND_INDEPENDENT_NORMALIZATION_QA_RESEARCH_ONLY',
   raw_to_canonical_normalization_independently_recomputed:true,
   source_raw_value_matches_canonical:true,normalization_parity:parity,publication_approved:false,source_rights_approved:false};
}
module.exports={csvRecords,parseEstatRaw,parseFedHistoricalRaw,compareCanonicalMap,verifyRawNormalizationParity,buildPrivateV10Report};
