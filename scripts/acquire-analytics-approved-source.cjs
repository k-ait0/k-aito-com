#!/usr/bin/env node
'use strict';
// Curated, single-shot data acquisition. No fallbacks, retries, or publishing.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),https=require('node:https'),os=require('node:os');
const {parseFedH10,normalizeFedMonthly,parseBlsCpi,verifyXlsxSignature}=require('./analytics-data-parsers.cjs');
const REPO=path.resolve(__dirname,'..');
const SOURCES={
 FED_H10_USDJPY:{url:'https://www.federalreserve.gov/releases/h10/hist/dat00_ja.htm',type:'html',host:'www.federalreserve.gov'},
 BLS_CPI_US:{url:'https://api.bls.gov/publicAPI/v1/timeseries/data/',type:'bls',host:'api.bls.gov'},
 WORLD_BANK_PINK_MONTHLY:{url:'https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx',type:'xlsx',host:'thedocs.worldbank.org'}
};
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
function safePrivateDir(){
 const dir=path.resolve(process.env.ANALYTICS_PRIVATE_DATA_DIR||path.join(os.homedir(),'kaito-analytics-private'));
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const a=fs.realpathSync(dir),r=fs.realpathSync(REPO);
 if(a===r||a.startsWith(r+path.sep)||r.startsWith(a+path.sep))throw Error('Private data directory overlaps Git checkout');
 return a;
}
function verifySourceLock(provider){
 const r=JSON.parse(fs.readFileSync(path.join(REPO,'research/analytics/source_registry.v0.2.json'),'utf8'));
 if(!r.sources?.[provider]||r.policy?.no_auto_fallback!==true||r.policy?.public_display_default!==false)throw Error('Frozen provider not authorized');
 if(!(r.assets||[]).concat(r.auxiliary||[]).some(x=>x.provider_id===provider&&x.source_lock?.startsWith('LOCKED_')))throw Error('Provider lock not found');
}
function fetchBls(src,payload){return new Promise((resolve,reject)=>{
 const u=new URL(src.url);
 if(u.hostname!=='api.bls.gov'||u.protocol!=='https:')return reject(Error('Provider drift'));
 const req=https.request(u,{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},res=>{
  if(res.statusCode!==200){res.resume();return reject(Error('BLS HTTP '+res.statusCode))}
  const chunks=[];let n=0;
  res.on('data',b=>{n+=b.length;if(n>2000000){req.destroy(Error('BLS oversized'));return}chunks.push(b)});
  res.on('end',()=>resolve(Buffer.concat(chunks)));res.on('error',reject);
 });
 req.on('error',reject);req.setTimeout(20000,()=>req.destroy(Error('BLS timeout')));req.end(payload);
});}
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
 const [id,fromArg,toArg]=process.argv.slice(2);
 if(id==='--selftest'){require('./test-analytics-historical-parsers.cjs').runSelfTests();return}
 const src=SOURCES[id];
 if(!src)throw Error('Unknown source. FED_H10_USDJPY | BLS_CPI_US YYYY YYYY | WORLD_BANK_PINK_MONTHLY');
 const provider={FED_H10_USDJPY:'FED_BOARD',BLS_CPI_US:'BLS',WORLD_BANK_PINK_MONTHLY:'WORLD_BANK_PINK'}[id];
 verifySourceLock(provider);
 let payload=null,range={};
 if(id==='BLS_CPI_US'){
  if(!/^\d{4}$/.test(fromArg||'')||!/^\d{4}$/.test(toArg||''))throw Error('BLS requires startYear endYear');
  const a=Number(fromArg),b=Number(toArg);
  if(a<1940||b<a||b-a>=10||b>new Date().getUTCFullYear())throw Error('BLS v1 request must cover 1..10 years');
  payload=JSON.stringify({seriesid:['CUUR0000SA0'],startyear:String(a),endyear:String(b)});
  range={start_year:a,end_year:b,series_id:'CUUR0000SA0'};
 }else if(fromArg||toArg)throw Error('Unexpected arguments');
 const raw=id==='BLS_CPI_US'?await fetchBls(src,payload):await fetchPinned(src);
 const files={},details={};
 if(id==='FED_H10_USDJPY'){
  const days=parseFedH10(raw.toString('utf8'));
  if(days.length<5000||days[0].date!=='2000-01-03')throw Error('Incomplete Fed history');
  const age=(Date.now()-Date.parse(days.at(-1).date+'T00:00:00Z'))/86400000;
  if(age<0||age>60)throw Error('Stale or future Fed dataset');
  const months=normalizeFedMonthly(days);
  files['source_RAW.html']=raw;
  files['usdjpy_daily.csv']=Buffer.from(['date,usd_jpy,status',...days.map(x=>[x.date,x.value,x.status].join(','))].join('\n')+'\n');
  files['usdjpy_monthly.csv']=Buffer.from(['month,observation_date,usd_jpy',...months.map(x=>[x.month,x.date,x.value].join(','))].join('\n')+'\n');
  Object.assign(details,{observations:days.length,ND:days.filter(x=>x.status==='ND').length,monthly_observations:months.length,month_rule:'last valid observation',last_date:days.at(-1).date});
 }else if(id==='BLS_CPI_US'){
  const months=parseBlsCpi(JSON.parse(raw.toString('utf8')),range.start_year,range.end_year);
  files['source_RAW.json']=raw;
  files['us_cpi_monthly.csv']=Buffer.from(['month,cpi_u_nsa',...months.map(x=>[x.month,x.value].join(','))].join('\n')+'\n');
  Object.assign(details,{observations:months.length,first_month:months[0].month,last_month:months.at(-1).month});
 }else{
  verifyXlsxSignature(raw);
  files['source_RAW_UNREVIEWED.xlsx']=raw;
  Object.assign(details,{format:'RAW_ONLY',qa:'NOT_PARSED',license:'REVIEW_SOURCE_WORKBOOK_DESCRIPTION'});
 }
 const metadata={source_id:id,publisher:provider,source_url:src.url,retrieved_at:new Date().toISOString(),raw_sha256:sha256(raw),raw_size:raw.length,request:range,...details,private_only:true,publication_approved:false,redistribution_approved:false,redirects_followed:false};
 const dir=safePrivateDir(),name=id+'__'+new Date().toISOString().replace(/[-:.]/g,'')+'__'+sha256(raw).slice(0,12);
 const output=path.join(dir,name),tmp=output+'.tmp';
 if(fs.existsSync(tmp)||fs.existsSync(output))throw Error('Snapshot already exists');
 fs.mkdirSync(tmp,{mode:0o700});
 try{
  for(const [filename,value] of Object.entries(files))fs.writeFileSync(path.join(tmp,filename),value,{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(tmp,'provenance.json'),JSON.stringify(metadata,null,2)+'\n',{flag:'wx',mode:0o600});
  fs.renameSync(tmp,output);
 }catch(e){fs.rmSync(tmp,{recursive:true,force:true});throw e}
 console.log(JSON.stringify({status:'PRIVATE_ONLY',path:output,observations:details.observations||null,sha256:metadata.raw_sha256}));
}
main().catch(e=>{console.error('FAILED:',e.message);process.exitCode=1});
