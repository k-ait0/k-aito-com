'use strict';
const MONTHS={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
function parseFedH10(html){
 if(!/Historical Rates for the Japanese Yen/i.test(html))throw Error('Wrong official H.10 data source/title');
 const clean=html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
 const out=new Map();
 for(const m of clean.matchAll(/\b(\d{1,2})-([A-Z]{3})-(\d{2})\s+(ND|\d+\.\d{4})\b/g)){
  const month=MONTHS[m[2]],day=Number(m[1]),year=2000+Number(m[3]);
  if(!month)throw Error('Invalid month');
  const date=[year,String(month).padStart(2,'0'),String(day).padStart(2,'0')].join('-');
  if(new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid ISO date');
  if(out.has(date))throw Error('Duplicate H.10 date: '+date);
  if(m[4]!=='ND'&&(!(Number(m[4])>0)||Number(m[4])>1000))throw Error('Bad FX value');
  out.set(date,{date,value:m[4]==='ND'?'':m[4],status:m[4]==='ND'?'ND':'OK'});
 }
 return [...out.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function normalizeFedMonthly(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('No FX dates');
 const m=new Map();for(const r of rows){if(r.status!=='OK')continue;
  const month=r.date.slice(0,7),prev=m.get(month);if(!prev||prev.date<r.date)m.set(month,{month,date:r.date,value:r.value});
 }
 const arr=[...m.values()].sort((a,b)=>a.month.localeCompare(b.month));
 let cursor=Number(arr[0].month.slice(0,4))*12+Number(arr[0].month.slice(5))-1;
 for(const a of arr){const x=Number(a.month.slice(0,4))*12+Number(a.month.slice(5))-1;if(x!==cursor)throw Error('Missing entire FX month: '+Math.floor(cursor/12)+'-'+String(cursor%12+1).padStart(2,'0'));cursor++}
 return arr;
}
function parseBlsCpi(json,startYear,endYear){
 if(json?.status!=='REQUEST_SUCCEEDED')throw Error('BLS API did not succeed');
 const series=json?.Results?.series?.find(s=>s.seriesID==='CUUR0000SA0')||json?.Results?.[0]?.series?.find(s=>s.seriesID==='CUUR0000SA0');
 if(!series||!Array.isArray(series.data))throw Error('BLS series missing');
 const rows=new Map();
 for(const d of series.data){
  if(!/^M(0[1-9]|1[0-2])$/.test(d.period))continue;
  const year=Number(d.year);if(year<startYear||year>endYear)throw Error('BLS returned out-of-range year');
  const month=String(year)+'-'+d.period.slice(1),value=Number(d.value);
  if(rows.has(month))throw Error('Duplicate BLS month '+month);
  if(!Number.isFinite(value)||value<=0)throw Error('Invalid BLS CPI '+month);
  rows.set(month,{month,value:String(d.value)});
 }
 const arr=[...rows.values()].sort((a,b)=>a.month.localeCompare(b.month));
 if(!arr.length)throw Error('No BLS monthly observations');
 for(let i=1;i<arr.length;i++){
  const prev=Number(arr[i-1].month.slice(0,4))*12+Number(arr[i-1].month.slice(5))-1;
  const cur=Number(arr[i].month.slice(0,4))*12+Number(arr[i].month.slice(5))-1;
  if(cur!==prev+1)throw Error('BLS CPI missing month after '+arr[i-1].month);
 }
 if(arr[0].month!==startYear+'-01')throw Error('BLS CPI start year incomplete');
 if(endYear<new Date().getUTCFullYear()&&arr.at(-1).month!==endYear+'-12')throw Error('BLS CPI historical end year incomplete');
 return arr;
}
function verifyXlsxSignature(buf){
 if(!Buffer.isBuffer(buf)||buf.length<5000||!buf.subarray(0,4).equals(Buffer.from([0x50,0x4b,0x03,0x04])))throw Error('Expected sufficiently large XLSX, not HTML/partial download');
}
module.exports={parseFedH10,parseBlsCpi,verifyXlsxSignature,normalizeFedMonthly};
