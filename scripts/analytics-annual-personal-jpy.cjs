#!/usr/bin/env node
'use strict';
// Personal research only. Annual NYU academic returns + Dec Fed H10 FX + e-Stat CPI.
// NEVER interpolate annual observations into monthly prices/returns. Not official SPDJI TR.
// No network; original price/return values stay OUTSIDE Git checkout.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const pins={
 nyu:'582c2ccdc6abe75f3e118cd61628f4d428fed9acbd1ec275c811699fe1c5b440',
 fx:'4aeae87dd69b33936b5afc17a02ed85eea579fefca278b10dae4544c4a8ae6cf',
 cpi:'18da76e236057e1f59b2e7b224bfb7b0f2186d5586139d14b26c701ba74c36cc'
};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function parseCSV(s){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(quoted){if(c==='"'&&s[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c;}
  else if(c==='"')quoted=true;
  else if(c===','){row.push(field);field='';}
  else if(c==='\n'){row.push(field);rows.push(row);row=[];field='';}
  else if(c!=='\r')field+=c;
 }
 if(quoted)throw Error('Unclosed CSV quote');
 if(field.length||row.length){row.push(field);rows.push(row);}
 if(rows.length<2||new Set(rows[0]).size!==rows[0].length)throw Error('CSV header missing or duplicated');
 const cols=rows.shift();
 return rows.map((r,i)=>{if(r.length!==cols.length)throw Error('CSV column count in line '+(i+2));return Object.fromEntries(cols.map((h,j)=>[h,r[j]]))});
}
function load(filename,digest){
 const raw=fs.readFileSync(filename);
 if(sha(raw)!==digest)throw Error('Source file SHA differs from pinned data');
 return parseCSV(raw.toString('utf8').replace(/^\uFEFF/,''));
}
function annualNyU(rows,{strict=true}={}){
 const map=new Map();
 for(const r of rows){
  const y=Number(r.year);
  if(!Number.isInteger(y)||y<1928||y>2025||map.has(y))throw Error('Invalid or duplicate annual year');
  const keys=['US_STOCK_WITH_DIVIDENDS','US_TBOND_10YR_ANNUAL_TOTAL','US_TBILL_3M_ANNUAL'];
  const v=Object.fromEntries(keys.map(k=>[k,Number(r[k])]));
  if(Object.values(v).some(x=>!Number.isFinite(x)||x<=-1||x>=10))throw Error('Annual return outside domain');
  map.set(y,v);
 }
 if(strict&&(map.size!==98||!map.has(1928)||!map.has(2025)))throw Error('Annual data incomplete');
 return map;
}
function monthly(rows,kind){
 const expected=kind==='fx'?['FED_H10_USDJPY_MONTH_END','FED_BOARD','FX_RATE','JPY_PER_USD','JPY']:['JP_CPI_HEADLINE_2025_LINKED','ESTAT','CPI_LEVEL','INDEX_2025_100','NOT_APPLICABLE'];
 const map=new Map();
 for(const r of rows){
  if(r.series_id!==expected[0])continue;
  const fields=['series_id','source_id','series_kind','unit','currency'];
  for(let i=0;i<fields.length;i++)if(r[fields[i]]!==expected[i])throw Error('Wrong '+fields[i]);
  if(r.origin!=='OBSERVED')throw Error('Unapproved estimated monthly input');
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month)||map.has(r.month))throw Error('Invalid/duplicate month');
  const v=Number(r.value);
  if(!Number.isFinite(v)||v<=0)throw Error('Nonpositive FX/CPI');
  map.set(r.month,v);
 }
 return map;
}
function calculate(annual,fx,cpi,{strict=true}={}){
 const usd=[],jpy=[];
 const years=[...annual.keys()].sort((a,b)=>a-b);
 for(const y of years){
  const r=annual.get(y);
  usd.push({year:y,stock_usd:r.US_STOCK_WITH_DIVIDENDS,
   bond_usd:r.US_TBOND_10YR_ANNUAL_TOTAL,bill_usd:r.US_TBILL_3M_ANNUAL,
   balanced6040_usd:.6*r.US_STOCK_WITH_DIVIDENDS+.4*r.US_TBOND_10YR_ANNUAL_TOTAL});
 }
 for(let y=1972;y<=2025;y++){
   const a=String(y-1)+'-12',b=String(y)+'-12';
   if(!annual.has(y)||!fx.has(a)||!fx.has(b)||!cpi.has(a)||!cpi.has(b)){
     if(strict)throw Error('Missing Dec FX/CPI or annual return in '+y);
     continue;
   }
   const fxGross=fx.get(b)/fx.get(a),inflationGross=cpi.get(b)/cpi.get(a);
   const stockGross=(1+annual.get(y).US_STOCK_WITH_DIVIDENDS)*fxGross;
   const bondGross=(1+annual.get(y).US_TBOND_10YR_ANNUAL_TOTAL)*fxGross;
   const billGross=(1+annual.get(y).US_TBILL_3M_ANNUAL)*fxGross;
   const balancedGross=.6*stockGross+.4*bondGross;
   jpy.push({year:y,stock_jpy_nominal:stockGross-1,bond_jpy_nominal:bondGross-1,
     bill_jpy_nominal:billGross-1,balanced6040_jpy_nominal:balancedGross-1,
     stock_jpy_real:stockGross/inflationGross-1,bond_jpy_real:bondGross/inflationGross-1,
     balanced6040_jpy_real:balancedGross/inflationGross-1,
     fx_ratio:fxGross,cpi_ratio:inflationGross});
 }
 if(strict&&(jpy.length!==54||jpy[0].year!==1972||jpy.at(-1).year!==2025))throw Error('JPY calendar-year join incomplete');
 return {usd,jpy};
}
function rolling(rows,key,years){
 const out=[];
 for(let i=0;i+years<=rows.length;i++){
  let wealth=1;
  for(let j=i;j<i+years;j++){
   if(j>i&&rows[j].year!==rows[j-1].year+1)throw Error('Gap in annual return years');
   const r=rows[j][key];
   if(!Number.isFinite(r)||r<=-1)throw Error('Invalid annual return');
   wealth*=1+r;
  }
  out.push({start:rows[i].year,end:rows[i+years-1].year,
    multiple:wealth,cagr:wealth**(1/years)-1});
 }
 return out;
}
function summarize(rows,keys){
 const res={};
 for(const k of keys){
  res[k]={};
  for(const n of [10,20,30]){
   const z=rolling(rows,k,n),c=z.map(x=>x.cagr).sort((a,b)=>a-b),N=z.length;
   res[k][n]={windows:N,first_start:z[0]?.start,last_start:z.at(-1)?.start,
    min_cagr:c[0]??null,median_cagr:N?(N%2?c[(N-1)/2]:(c[N/2-1]+c[N/2])/2):null,
    max_cagr:c.at(-1)??null,positive_count:c.filter(x=>x>0).length,
    worst_start_year:z.find(x=>x.cagr===c[0])?.start??null};
  }
 }
 return res;
}
function outputCsv(rows){
 const keys=Object.keys(rows[0]);
 return Buffer.from([keys.join(','),...rows.map(r=>keys.map(k=>r[k]).join(','))].join('\n')+'\n');
}
function selftest(){
 const fake=new Map();
 for(let y=1928;y<=2025;y++)fake.set(y,{US_STOCK_WITH_DIVIDENDS:.1,
   US_TBOND_10YR_ANNUAL_TOTAL:0.04,US_TBILL_3M_ANNUAL:.02});
 const fx=new Map(),cpi=new Map();
 for(let y=1971;y<=2025;y++){fx.set(y+'-12',100+2*(y-1971));cpi.set(y+'-12',80+3*(y-1971))}
 const {usd,jpy}=calculate(fake,fx,cpi);
 assert.equal(usd.length,98);assert.equal(jpy.length,54);
 assert.equal(rolling(usd,'stock_usd',30).length,69);
 assert.equal(rolling(jpy,'balanced6040_jpy_real',30).length,25);
 assert(Math.abs(usd[0].balanced6040_usd-.076)<1e-12);
 const expected=.6*(1.1*102/100)+.4*(1.04*102/100);
 assert(Math.abs(jpy[0].balanced6040_jpy_nominal-(expected-1))<1e-12);
 assert.throws(()=>calculate(fake,new Map(),cpi),/Missing Dec/);
 assert.throws(()=>annualNyU([{year:'1928',US_STOCK_WITH_DIVIDENDS:'-1',
   US_TBOND_10YR_ANNUAL_TOTAL:'0',US_TBILL_3M_ANNUAL:'0'}],{strict:false}),/outside domain/);
 assert.throws(()=>monthly([{month:'1971-12',series_id:'FED_H10_USDJPY_MONTH_END',
  source_id:'FED_BOARD',series_kind:'FX_RATE',unit:'JPY_PER_USD',currency:'JPY',origin:'ESTIMATED',value:'200'}],'fx'),/estimated/);
 console.log('PASS annual personal USD and JPY 10/20/30-year rolling, exact calendar-year FX/CPI join, reject estimated and missing values');
}
function main(args){
 if(args.length===1&&args[0]==='--selftest'){selftest();return}
 if(args.length!==5||args[0]!=='--run')throw Error('Usage: --selftest or --run NYU_ANNUAL.csv FED_MONTHLY.csv JP_CPI_MONTHLY.csv OUT_PRIVATE_DIR');
 const [_,nyuFile,fxFile,cpiFile,outPath]=args;
 const out=path.resolve(outPath),repo=path.resolve(__dirname,'..');
 if(fs.existsSync(out)||out===repo||out.startsWith(repo+path.sep)||repo.startsWith(out+path.sep))
  throw Error('Private output must be a new directory outside Git checkout');
 const {usd,jpy}=calculate(annualNyU(load(nyuFile,pins.nyu)),monthly(load(fxFile,pins.fx),'fx'),monthly(load(cpiFile,pins.cpi),'cpi'));
 const qa={status:'PRIVATE_ANNUAL_RESEARCH_QA_PASS',site_approved:false,not_for_publication:true,monthly_returns_invented:false,
  source_mode:'NYU_ACADEMIC_RESEARCH_NOT_OFFICIAL_SP500_TR',
  fx_source_adr:'FED_DDP_1971_CANDIDATE_UNAPPROVED',
  year_ranges:{usd:[1928,2025],jpy:[1972,2025]},
  annual_rows:{usd:usd.length,jpy:jpy.length},input_sha256:pins,
  usd_rolling:summarize(usd,['stock_usd','bond_usd','bill_usd','balanced6040_usd']),
  jpy_rolling:summarize(jpy,['stock_jpy_real','bond_jpy_real','balanced6040_jpy_real',
    'stock_jpy_nominal','bond_jpy_nominal','balanced6040_jpy_nominal']),
  warning:'Overlapping historical windows not predictive; no monthly sequencing, taxes, fees, or dividends isolated from research stock TR'};
 fs.mkdirSync(out,{recursive:true,mode:0o700});
 const files=[['US_1928_2025_ANNUAL_PRIVATE.csv',outputCsv(usd)],
 ['JPY_1972_2025_ANNUAL_PRIVATE.csv',outputCsv(jpy)],
 ['ANNUAL_PERSONAL_RESEARCH_QA_PRIVATE.json',Buffer.from(JSON.stringify(qa,null,2)+'\n')]];
 for(const [n,v] of files)fs.writeFileSync(path.join(out,n),v,{mode:0o600,flag:'wx'});
 console.log('PASS_PRIVATE_ANNUAL '+JSON.stringify({usd_years:usd.length,jpy_years:jpy.length,
  usd_30yr_windows:qa.usd_rolling.stock_usd[30].windows,
  jpy_30yr_windows:qa.jpy_rolling.stock_jpy_real[30].windows,
  source_mode:qa.source_mode,site_approved:false}));
}
if(require.main===module)try{main(process.argv.slice(2))}catch(e){console.error('ANNUAL_PRIVATE_QA_FAILED '+e.message);process.exitCode=1}
module.exports={parseCSV,annualNyU,monthly,calculate,rolling,summarize};
