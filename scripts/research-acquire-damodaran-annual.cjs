#!/usr/bin/env node
'use strict';
// NYU Stern / A. Damodaran original public research TABLE -> private annual CSV.
// RESEARCH SOURCE, not licensed official S&P DJI / Bloomberg index data.
// Not a monthly return path, do not interpolate. No raw market numbers in Git.
// Running --fetch does one bounded GET to this whitelisted university source only.
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path'),assert=require('node:assert/strict');
const URL_FIXED='https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html';
const SERIES=['US_STOCK_WITH_DIVIDENDS','US_SMALL_CAP_BOTTOM_DECILE','US_TBILL_3M_ANNUAL','US_TBOND_10YR_ANNUAL_TOTAL','US_BAA_CORPORATE_BOND','US_REAL_ESTATE_RESEARCH','GOLD_ANNUAL_RESEARCH'];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function decodeHtml(x){
 return x.replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]*>/g,'').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))
 .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16)))
 .replace(/&nbsp;|&ensp;|&emsp;/gi,' ').replace(/&minus;/g,'−').replace(/&amp;/g,'&')
 .replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
}
function percentage(s){
 const v=decodeHtml(s).replace(/[−]/g,'-');
 if(!/^[+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?%$/.test(v))throw Error('Not a displayed annual percentage: '+v.slice(0,30));
 const n=Number(v.slice(0,-1).replaceAll(',',''))/100;
 if(!Number.isFinite(n)||n<=-1||n>=10)throw Error('Invalid annual return range');
 return n;
}
function parseAnnual(html,{minYear=1928,maxYear=2025,requireAll=true}={}){
 if(!/Historical Returns|Annual Returns/i.test(html))throw Error('Not the specified annual-returns publication');
 const rows=[],seen=new Set();
 for(const tr of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)){
   const cells=[...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td\s*>/gi)].map(m=>decodeHtml(m[1]));
   if(cells.length<8)continue;
   const y=cells[0].replace(/\s/g,'');
   if(!/^(19|20)\d{2}$/.test(y))continue;
   const year=Number(y);
   if(year<minYear||year>maxYear)continue;
   if(seen.has(year))throw Error('Duplicate year '+year);
   let vals;try{vals=cells.slice(1,8).map(percentage)}catch(e){throw Error('Year '+year+': '+e.message)}
   seen.add(year);
   rows.push({year,returns:Object.fromEntries(SERIES.map((id,i)=>[id,vals[i]]))});
 }
 rows.sort((a,b)=>a.year-b.year);
 if(!rows.length)throw Error('No valid complete annual rows');
 for(let i=1;i<rows.length;i++)if(rows[i].year!==rows[i-1].year+1)throw Error('Missing year '+(rows[i-1].year+1));
 if(requireAll&&(rows[0].year!==minYear||rows.at(-1).year!==maxYear||
   rows.length!==maxYear-minYear+1))throw Error('Incomplete required year range');
 return rows;
}
function csvFrom(rows){
 return ['year,'+SERIES.join(','),...rows.map(x=>[x.year,...SERIES.map(k=>x.returns[k].toFixed(6))].join(','))].join('\n')+'\n';
}
function selftest(){
 const fields=[
 ['1928','43.81%','62.15%','3.08%','0.84%','3.22%','1.49%','0.10%'],
 ['1929','-8.30%','-46.08%','3.16%','4.20%','3.02%','-2.06%','-0.15%']
 ];
 const html='<h1>Historical Returns</h1><table>'+
 fields.map(f=>'<tr>'+f.map(c=>'<td class="xl1"><span>'+c+'</span></td>').join('')+'</tr>').join('')+'</table>';
 const rr=parseAnnual(html,{maxYear:1929});
 assert.equal(rr.length,2);
 assert.equal(rr[0].returns.US_STOCK_WITH_DIVIDENDS,.4381);
 assert.equal(rr[0].returns.US_TBOND_10YR_ANNUAL_TOTAL,.0084);
 assert.equal(rr[1].returns.US_STOCK_WITH_DIVIDENDS,-.083);
 assert.match(csvFrom(rr),/^year,US_STOCK_WITH_DIVIDENDS/);
 assert.throws(()=>parseAnnual(html+html,{maxYear:1929}),/Duplicate/);
 assert.throws(()=>parseAnnual(html.replace('1929','1930'),{maxYear:1929}),/Incomplete/);
 console.log('PASS Damodaran 7-column annual parser, duplicate/year-gap/positive and negative returns, research-only format');
}
async function fetchOnce(){
 const response=await fetch(URL_FIXED,{redirect:'follow',signal:AbortSignal.timeout(30000),
   headers:{'User-Agent':'KaitoAnalyticsPersonalResearch/0.1 (personal noncommercial dataset QA; no bulk crawler)','Accept':'text/html'}});
 const remote=new URL(response.url);
 if(!['pages.stern.nyu.edu','people.stern.nyu.edu','www.stern.nyu.edu'].includes(remote.hostname)||remote.protocol!=='https:')
   throw Error('Unexpected final host: '+remote.hostname);
 if(!response.ok)throw Error('Official source HTTP '+response.status);
 const len=Number(response.headers.get('content-length')||0);
 if(len>4e6)throw Error('Publication too large');
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length>4e6)throw Error('Downloaded publication too large');
 const html=bytes.toString('utf8');
 const rows=parseAnnual(html);
 // Two known historical anchors detect row/column shifts. Values may be revised by owner:
 // require explicit source snapshot review instead of silently adopting changed history.
 const byYear=Object.fromEntries(rows.map(x=>[x.year,x.returns]));
 if(Math.abs(byYear[1928].US_STOCK_WITH_DIVIDENDS-.4381)>1e-7||
    Math.abs(byYear[1928].US_TBOND_10YR_ANNUAL_TOTAL-.0084)>1e-7||
    Math.abs(byYear[2022].US_TBOND_10YR_ANNUAL_TOTAL+.1783)>1e-7||
    Math.abs(byYear[2025].US_STOCK_WITH_DIVIDENDS-.1778)>1e-7)
    throw Error('Annual column schema / source content changed; source review required');
 const csv=Buffer.from(csvFrom(rows),'utf8');
 const qa={schema_version:'0.1',source_kind:'NYU_ACADEMIC_ANNUAL_RESEARCH_NOT_OFFICIAL_INDEX_LICENSE',
   source:URL_FIXED,final_url:response.url,raw_html_sha256:sha(bytes),normalized_csv_sha256:sha(csv),
   from:rows[0].year,to:rows.at(-1).year,annual_years:rows.length,annual_series:SERIES,
   finite_values:rows.length*SERIES.length,window_years:{"10":89,"20":79,"30":69},
   source_date_claim:'2026-01-05',monthly_returns_derived:false,monthly_backtest_eligible:false,
   official_SPDJI_TR:false,official_Bloomberg_bond_TR:false,authorized_scope:'PRIVATE_PERSONAL_RESEARCH_ONLY',
   site_use_approved:false,raw_value_publication_approved:false,
   qa:'PASS_OFFICIAL_UNIVERSITY_WEB_TABLE_ANNUAL_NO_INTERPOLATION'};
 const out=process.env.ANALYTICS_PRIVATE_DATA_DIR;
 if(!out||!path.isAbsolute(out)||path.resolve(out).startsWith(path.resolve(process.cwd())+path.sep))throw Error('Private out dir must be absolute and outside repo');
 fs.mkdirSync(out,{recursive:true,mode:0o700});
 for(const [name,data] of [['NYU_DAMODARAN_original_private.html',bytes],
     ['NYU_DAMODARAN_1928_2025_7series_ANNUAL_PRIVATE.csv',csv],
     ['NYU_DAMODARAN_1928_2025_QA_PRIVATE.json',Buffer.from(JSON.stringify(qa,null,2)+'\n')]])
    fs.writeFileSync(path.join(out,name),data,{flag:'wx',mode:0o600});
 console.log('PASS_ANNUAL_ORIGINAL_RESEARCH '+JSON.stringify({
   from:qa.from,to:qa.to,annual_years:qa.annual_years,series:SERIES.length,
   private_raw_sha256:qa.raw_html_sha256,private_csv_sha256:qa.normalized_csv_sha256,
   yearly_30y_windows:69,public_rights:false}));
}
if(require.main===module){
 const args=process.argv.slice(2);
 if(args.length!==1||!['--selftest','--fetch'].includes(args[0])){console.error('Use --selftest or --fetch');process.exit(2)}
 if(args[0]==='--selftest')selftest();
 else fetchOnce().catch(e=>{console.error('SOURCE_QA_FAIL '+e.message);process.exitCode=1});
}
module.exports={parseAnnual,csvFrom,SERIES};
