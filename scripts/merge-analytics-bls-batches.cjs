#!/usr/bin/env node
'use strict';
// Private-only merge and QA for seven frozen BLS API v1 batches. No source substitution.
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const {parseBlsCpi}=require('./analytics-data-parsers.cjs');
const sha256=buf=>crypto.createHash('sha256').update(buf).digest('hex');
const ranges=[[1966,1975],[1976,1985],[1986,1995],[1996,2005],[2006,2015],[2016,2025],[2026,2026]];
function serial(month){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Bad month: '+month);
 return Number(month.slice(0,4))*12+Number(month.slice(5))-1;}
function verifyAndMerge(dir,now='2026-11-11'){
 const dirs=fs.readdirSync(dir,{withFileTypes:true}).filter(x=>x.isDirectory()&&x.name.startsWith('BLS_CPI_US__')).map(x=>path.join(dir,x.name));
 const selected=[],seenBatches=new Set(),all=new Map();
 for(const d of dirs){
  const meta=JSON.parse(fs.readFileSync(path.join(d,'provenance.json'),'utf8'));
  if(meta.source_id!=='BLS_CPI_US'||meta.publisher!=='BLS'||meta.private_only!==true||meta.publication_approved!==false)throw Error('Wrong provider or rights metadata');
  if(meta.source_url!=='https://api.bls.gov/publicAPI/v1/timeseries/data/')throw Error('BLS endpoint drift');
  const key=meta.request?.start_year+'-'+meta.request?.end_year;
  if(!ranges.some(x=>x.join('-')===key)||seenBatches.has(key))throw Error('Unexpected or repeated BLS batch '+key);
  seenBatches.add(key);
  const raw=fs.readFileSync(path.join(d,'source_RAW.json'));
  if(sha256(raw)!==meta.raw_sha256||raw.length!==meta.raw_size)throw Error('Source raw SHA or size mismatch for '+key);
  const response=JSON.parse(raw.toString('utf8'));
  const observations=parseBlsCpi(response,meta.request.start_year,meta.request.end_year);
  if(meta.observations!==observations.length||meta.first_month!==observations[0].month||meta.last_month!==observations.at(-1).month)throw Error('Provenance mismatch for '+key);
  const originalData=response.Results?.series?.find(s=>s.seriesID==='CUUR0000SA0')?.data;
  if(!Array.isArray(originalData))throw Error('Missing official BLS source observations');
  const footnotes=new Map();
  for(const r of originalData){
   if(!/^M(0[1-9]|1[0-2])$/.test(r.period))continue;
   const m=r.year+'-'+r.period.slice(1);
   if(footnotes.has(m))throw Error('Duplicated raw observation '+m);
   footnotes.set(m,(r.footnotes||[]).filter(f=>f?.code).map(f=>f.code).join(';'));
  }
  for(const r of observations){
   if(all.has(r.month))throw Error('Cross-batch duplicated month '+r.month);
   if(r.month>'2026-10')continue;
   all.set(r.month,{month:r.month,value:r.value,footnotes:footnotes.get(r.month)||'',batch_sha256:meta.raw_sha256});
  }
  selected.push({year_start:meta.request.start_year,year_end:meta.request.end_year,raw_sha256:meta.raw_sha256,raw_bytes:meta.raw_size,raw_observations:observations.length,retrieved_at:meta.retrieved_at});
 }
 if(seenBatches.size!==ranges.length)throw Error('Expected all 7 requested BLS API batches, got '+seenBatches.size);
 const rows=[...all.values()].sort((a,b)=>a.month.localeCompare(b.month));
 if(rows[0]?.month!=='1966-01')throw Error('Start 1966-01 not observed');
 if(rows.at(-1)?.month<'2026-01')throw Error('No 2026 observation');
 const gaps=[],extreme_monthly_changes=[];
 for(let i=1;i<rows.length;i++){
  const delta=serial(rows[i].month)-serial(rows[i-1].month);
  if(delta!==1){for(let s=serial(rows[i-1].month)+1;s<serial(rows[i].month);s++)gaps.push(String(Math.floor(s/12)).padStart(4,'0')+'-'+String(s%12+1).padStart(2,'0'));}
  const a=Number(rows[i-1].value),b=Number(rows[i].value),rate=b/a-1;
  if(!Number.isFinite(rate)||Math.abs(rate)>0.2)extreme_monthly_changes.push({month:rows[i].month,change:rate});
 }
 if(gaps.length)throw Error('Missing observed months: '+gaps.join(','));
 if(extreme_monthly_changes.length)throw Error('Review CPI month jumps > 20%: '+JSON.stringify(extreme_monthly_changes));
 const out=path.join(dir,'BLS_CPI_US_1966_2026_QA_PRIVATE');
 fs.mkdirSync(out,{recursive:false,mode:0o700});
 const csvHeader='month,series_id,cpi_index,unit,frequency,seasonal_adjustment,origin,footnote_codes,raw_response_sha256';
 const csv=[csvHeader,...rows.map(r=>[r.month,'CUUR0000SA0',r.value,'INDEX_1982_84_100','MONTHLY','NSA','OBSERVED',r.footnotes,r.batch_sha256].join(','))].join('\n')+'\n';
 const csvBuf=Buffer.from(csv,'utf8');
 fs.writeFileSync(path.join(out,'cpi_us_monthly_observed.csv'),csvBuf,{flag:'wx',mode:0o600});
 const m={dataset_id:'BLS_CPI_US_CUUR0000SA0',source_id:'BLS',source_url:'https://api.bls.gov/publicAPI/v1/timeseries/data/',series_id:'CUUR0000SA0',source_kind:'OFFICIAL_OBSERVED_CPI_INDEX',return_type:'NOT_INVESTMENT_RETURN',currency:'NOT_APPLICABLE_INDEX',base_period:'1982-84=100',frequency:'MONTHLY',seasonal_adjustment:'NSA',retrieval_method:'BLS_API_V1_7_POST_REQUESTS',target_first:'1966-01',target_last:'2026-10',first_month:rows[0].month,last_month:rows.at(-1).month,observations:rows.length,expected_months_in_observed_span:serial(rows.at(-1).month)-serial(rows[0].month)+1,missing_months:gaps,duplicates:0,extreme_monthly_changes,source_batches:selected.sort((a,b)=>a.year_start-b.year_start),csv_sha256:sha256(csvBuf),qa_passed:true,rights:{commercial_processing:'BLS_PUBLIC_DOMAIN_GENERAL_REVIEWED',public_display:'PENDING_OWNER_APPROVAL',derived_delivery:'PENDING_OWNER_APPROVAL',raw_csv_redistribution:'PENDING_OWNER_APPROVAL',production_approved:false},private_only:true,site_publication_approved:false,normalized_origin:'OBSERVED_NO_PROXY_NO_IMPUTATION',as_of:now};
 fs.writeFileSync(path.join(out,'quality_report.json'),JSON.stringify(m,null,2)+'\n',{flag:'wx',mode:0o600});
 return m;
}
if(require.main===module){
 try{const dir=process.argv[2];if(!dir||!path.isAbsolute(dir))throw Error('Expected absolute path to private BLS input directory');
  const m=verifyAndMerge(dir);console.log('BLS_QA_PASS '+JSON.stringify({first:m.first_month,last:m.last_month,observations:m.observations,missing:m.missing_months.length,duplicates:m.duplicates,csv_sha256:m.csv_sha256,batches:m.source_batches.length,publication_approved:false}));}
 catch(e){console.error('BLS_QA_FAILED '+e.message);process.exitCode=1;}
}
module.exports={verifyAndMerge,serial,ranges};
