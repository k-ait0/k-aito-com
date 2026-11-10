#!/usr/bin/env node
'use strict';
// Legacy Shiller data are for private research only. Never commit source or derived rows.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const sha256=v=>crypto.createHash('sha256').update(v).digest('hex');
const EXPECTED_HEADERS='month,sp500_price_index,annualized_dividend_index_points,us_cpi_index';
function monthNumber(ym){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym))throw Error('Invalid YYYY-MM: '+ym);return Number(ym.slice(0,4))*12+Number(ym.slice(5,7))-1;}
function loadResearchRows(text){
 const lines=text.replace(/^\uFEFF/,'').trimEnd().split(/\r?\n/);
 if(lines[0]!==EXPECTED_HEADERS)throw Error('Unexpected input header; no automatic remapping');
 const data=[];
 for(let i=1;i<lines.length;i++){
  const parts=lines[i].split(',');
  if(parts.length!==4)throw Error('CSV width at '+(i+1));
  const [month,...cells]=parts;
  const [price,dividend,cpi]=cells.map(Number);
  if(cells.some(s=>!/\d+(?:\.\d+)?/.test(s))||!Number.isFinite(price)||price<=0||!Number.isFinite(dividend)||dividend<0||!Number.isFinite(cpi)||cpi<=0)throw Error('Invalid price/dividend/CPI at '+month);
  const serial=monthNumber(month);
  if(data.length&&serial!==data[data.length-1].serial+1)throw Error('Missing or duplicate source month near '+month);
  data.push({month,serial,price,dividend,cpi});
 }
 if(data.length<2)throw Error('Not enough months');
 return data;
}
function prepareReturns(data){
 const output=[];
 for(let i=1;i<data.length;i++){
  const prev=data[i-1],cur=data[i];
  // Shiller Dividend is an annualized index-point estimate, NOT a monthly cash dividend.
  // This deliberately approximate calculation is NOT an official S&P 500 Total Return index.
  const priceReturn=cur.price/prev.price-1;
  const dividendApprox=cur.dividend/(12*prev.price);
  const usdNominal=priceReturn+dividendApprox;
  const cpiFactor=cur.cpi/prev.cpi;
  const usdReal=(1+usdNominal)/cpiFactor-1;
  if(![priceReturn,dividendApprox,usdNominal,cpiFactor,usdReal].every(Number.isFinite)||usdNominal<=-1)throw Error('Numerical anomaly '+cur.month);
  output.push({month:cur.month,price_return:priceReturn,dividend_yield_approx:dividendApprox,approx_total_return_usd:usdNominal,cpi_change_us:cpiFactor-1,approx_real_return_usd:usdReal});
 }
 return output;
}
function rollingStats(returns,horizon){
 if(!Number.isInteger(horizon)||horizon<=0)throw Error('Bad rolling horizon');
 const totals=[];
 for(let start=0;start+horizon<=returns.length;start++){
  let wealth=1;for(let j=start;j<start+horizon;j++)wealth*=1+returns[j].approx_total_return_usd;
  if(!Number.isFinite(wealth)||wealth<=0)throw Error('Invalid compounded wealth');
  totals.push({start_month:returns[start].month,end_month:returns[start+horizon-1].month,annualized_return:Math.pow(wealth,12/horizon)-1});
 }
 const sorted=totals.map(x=>x.annualized_return).sort((a,b)=>a-b);
 return {horizon_months:horizon,complete_windows:totals.length,first_start:totals[0]?.start_month??null,last_start:totals.at(-1)?.start_month??null,min_annualized:sorted[0]??null,median_annualized:sorted.length?(sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.floor(sorted.length/2)])/2:null,max_annualized:sorted.at(-1)??null,note:'Overlapping historical windows, NOT independent observations or future success probability'};
}
function buildReport(raw){
 const input=loadResearchRows(raw.toString('utf8'));
 const returns=prepareReturns(input);
 const report={dataset_id:'DWZ_SHILLER_LEGACY_APPROX_TR_RESEARCH_ONLY',record_status:'RESEARCH_ONLY_NOT_PUBLISHABLE',raw_sha256:sha256(raw),source_rows:input.length,normalized_return_rows:returns.length,first_source_month:input[0].month,last_source_month:input.at(-1).month,first_return_month:returns[0].month,last_return_month:returns.at(-1).month,return_method:'P_t/P_(t-1)-1 + D_t/(12*P_(t-1))',cpi_method:'(1+nominal_return)/(CPI_t/CPI_(t-1))-1',currency:'USD',source_prices_rounded_2dp:true,official_sp500_total_return:false,fx_adjusted_jpy:false,site_publication_approved:false,raw_redistribution_approved:false,rolling_windows:[120,240,360].filter(n=>n<=returns.length).map(n=>rollingStats(returns,n))};
 return {input,returns,report};
}
function privateOutput(dir){
 const here=fs.realpathSync(process.cwd());
 const dest=path.resolve(dir);fs.mkdirSync(dest,{recursive:true,mode:0o700});
 const p=fs.realpathSync(dest);
 if(p===here||p.startsWith(here+path.sep)||here.startsWith(p+path.sep))throw Error('Output must not overlap checkout/current worktree');
 return p;
}
function main(argv=process.argv.slice(2)){
 if(argv.length!==3||argv[1]!=='--private-output')throw Error('Usage: node prepare-shiller-research.cjs INPUT.csv --private-output /outside/repository');
 const raw=fs.readFileSync(argv[0]),{returns,report}=buildReport(raw);
 const dest=privateOutput(argv[2]),prefix='shiller_research_'+report.raw_sha256.slice(0,12);
 const reportPath=path.join(dest,prefix+'_QA.json'),csvPath=path.join(dest,prefix+'_RETURNS_PRIVATE.csv');
 for(const p of [reportPath,csvPath])if(fs.existsSync(p))throw Error('Immutable result exists: '+p);
 const cols=['month','price_return','dividend_yield_approx','approx_total_return_usd','cpi_change_us','approx_real_return_usd'];
 const csv=[cols.join(','),...returns.map(r=>cols.map(c=>c==='month'?r[c]:r[c].toFixed(12)).join(','))].join('\n')+'\n';
 fs.writeFileSync(csvPath,csv,{flag:'wx',mode:0o600});
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({result:'RESEARCH_ONLY',reportPath,rows:report.normalized_return_rows,raw_sha256:report.raw_sha256}));
}
if(require.main===module){try{main()}catch(e){console.error('FAILED: '+e.message);process.exitCode=1}}
module.exports={monthNumber,loadResearchRows,prepareReturns,rollingStats,buildReport,main};
