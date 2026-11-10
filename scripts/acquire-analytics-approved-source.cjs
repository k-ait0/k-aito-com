#!/usr/bin/env node
'use strict';
// Curated, single-shot data acquisition. No fallbacks, retries, or publishing.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),https=require('node:https');
const SOURCES={
 FED_H10_USDJPY:{url:'https://www.federalreserve.gov/releases/h10/hist/dat00_ja.htm',type:'html',host:'www.federalreserve.gov'},
 WORLD_BANK_PINK_MONTHLY:{url:'https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx',type:'xlsx',host:'thedocs.worldbank.org'}
};
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
function parseFedH10(html){
 const clean=html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
   .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')
   .replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
 const months={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
 const data=new Map();
 for(const m of clean.matchAll(/\b(\d{1,2})-([A-Z]{3})-(\d{2})\s+(ND|\d+\.\d{4})(?=\b|\s|$)/g)){
   const month=months[m[2]],day=Number(m[1]),year=2000+Number(m[3]);
   if(!month||year<2000||year>2099)throw Error('Unexpected date');
   const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
   if(new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid calendar date '+date);
   if(data.has(date))throw Error('Duplicate '+date);
   const missing=m[4]==='ND';
   if(!missing&&(!(Number(m[4])>0)||Number(m[4])>1000))throw Error('Invalid USDJPY '+date);
   data.set(date,{date,usd_jpy:missing?'':m[4],observation_status:missing?'ND':'OK'});
 }
 return [...data.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function safePrivateDir(){
 const dir=process.env.ANALYTICS_PRIVATE_DATA_DIR || path.resolve(process.cwd(),'../analytics-private-data');
 const here=path.resolve(process.cwd());
 if(path.resolve(dir)===here||path.resolve(dir).startsWith(here+path.sep))throw Error('Use a private output directory OUTSIDE the repository');
 fs.mkdirSync(dir,{recursive:true,mode:0o700});return dir;
}
function fetchPinned(src){return new Promise((resolve,reject)=>{
 const u=new URL(src.url);if(u.protocol!=='https:'||u.hostname!==src.host)throw Error('Source changed from pin');
 https.get(u,{headers:{'User-Agent':'Kaito-Analytics-Research-Collector/0.2 (single official request)'}},res=>{
  if(res.statusCode!==200){res.resume();return reject(Error('HTTP '+res.statusCode+' (no fallback)'));}
  const chunks=[];let total=0;res.on('data',b=>{total+=b.length;if(total>45_000_000){res.destroy(Error('Oversized body'));return;}chunks.push(b);});
  res.on('end',()=>resolve(Buffer.concat(chunks)));
  res.on('error',reject);
 }).on('error',reject).setTimeout(20000,function(){this.destroy(Error('Timeout (no retry)'));});
 });}
async function main(){
 const arg=process.argv[2];
 if(arg==='--selftest'){
  const test='<table><tr><td>29-SEP-26</td><td>158.8800</td></tr><tr><td>30-SEP-26</td><td>ND</td></tr><tr><td>1-OCT-26</td><td>157.6300</td></tr></table>';
  const got=parseFedH10(test);
  if(got.length!==3||got[1].observation_status!=='ND'||got[0].usd_jpy!=='158.8800'||got[2].date!=='2026-10-01')throw Error('Parser failed');
  if(!Buffer.from('504b0304','hex').subarray(0,4).equals(Buffer.from('PK\x03\x04','binary')))throw Error('XLSX signature test failed');
  console.log('PASS 2/2: HTML date/status/precision; XLSX signature');return;
 }
 if(!SOURCES[arg])throw Error('Usage: node scripts/acquire-analytics-approved-source.cjs FED_H10_USDJPY|WORLD_BANK_PINK_MONTHLY|--selftest');
 const source=SOURCES[arg],body=await fetchPinned(source),out=safePrivateDir();
 const metadata={source_id:arg,source_url:source.url,retrieved_at:new Date().toISOString(),raw_sha256:sha256(body),bytes:body.length,publication_permission:'NOT_APPROVED',redirect_fallback_used:false};
 if(source.type==='html'){
  const data=parseFedH10(body.toString('utf8'));
  if(data.length<5000||data[0].date!=='2000-01-03')throw Error('Historical coverage incomplete; no CSV written');
  metadata.rows=data.length;metadata.last_date=data.at(-1).date;metadata.ND_count=data.filter(x=>x.observation_status==='ND').length;
  const csv=['date,usd_jpy,observation_status',...data.map(x=>[x.date,x.usd_jpy,x.observation_status].join(','))].join('\n')+'\n';
  fs.writeFileSync(path.join(out,'fed_h10_usdjpy.csv'),csv,{mode:0o600});metadata.normalized_sha256=sha256(Buffer.from(csv));
 }else{
  if(body.length<5000||!body.subarray(0,4).equals(Buffer.from([0x50,0x4b,0x03,0x04])))throw Error('Downloaded data is not an XLSX; no output written');
  fs.writeFileSync(path.join(out,'world_bank_pink_monthly_RAW_UNREVIEWED.xlsx'),body,{mode:0o600});
  metadata.warning='Workbook Description tab, underlying rights, time series, and third-party exceptions NOT REVIEWED. NEVER publish directly.';
 }
 fs.writeFileSync(path.join(out,arg+'_provenance.json'),JSON.stringify(metadata,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({result:'ACQUIRED_PRIVATE_ONLY',...metadata}));
}
main().catch(e=>{console.error('FAILED:',e.message);process.exitCode=1;});
