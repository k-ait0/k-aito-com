'use strict';
/** Fail-closed monthly canonical CSV parser; no site output or network. */
const {monthSerial}=require('./cashflow-core.cjs');
const HEAD=['month','series_id','value','unit','currency','series_kind','origin','source_id','seasonal_adjustment','raw_response_sha256','footnote_codes'];
function csvCells(line){
 const cells=[];let value='',quoted=false,closed=false;
 for(let i=0;i<line.length;i++){
  const c=line[i];
  if(quoted){if(c==='"'){if(line[i+1]==='"'){value+='"';i++}else{quoted=false;closed=true}}else value+=c;}
  else if(c===','){cells.push(value);value='';closed=false;}
  else if(c==='"'){if(value||closed)throw Error('Malformed CSV quoting');quoted=true;}
  else{if(closed)throw Error('Malformed CSV after quoted field');value+=c;}
 }
 if(quoted)throw Error('Unclosed CSV quote');cells.push(value);return cells;
}
function canonicalRows(raw,{label,allowedSeries}){
 if(!Buffer.isBuffer(raw)||raw.length>16*1024*1024||raw.length<HEAD.join(',').length)throw Error('Invalid canonical CSV bytes '+label);
 const text=raw.toString('utf8');
 if(text.includes('\uFFFD')||text.includes('\0')||text.includes('\r')||!text.endsWith('\n'))throw Error('Canonical CSV must be UTF-8 LF '+label);
 const lines=text.slice(0,-1).split('\n');
 if(lines[0]!==HEAD.join(','))throw Error('Canonical monthly CSV schema drift '+label);
 const results=[],keys=new Set();let lastKey='';
 for(let i=1;i<lines.length;i++){
  const cells=csvCells(lines[i]);if(cells.length!==HEAD.length)throw Error('Canonical CSV column width '+label);
  const row=Object.fromEntries(HEAD.map((h,j)=>[h,cells[j]]));
  monthSerial(row.month);
  if(!allowedSeries.has(row.series_id))throw Error('Unknown canonical series '+row.series_id);
  const key=row.series_id+'|'+row.month;
  if(keys.has(key)||key<=lastKey)throw Error('Canonical CSV duplicate or unsorted '+label);
  lastKey=key;keys.add(key);
  if(!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(row.value)||!(Number(row.value)>0)||!Number.isFinite(Number(row.value)))throw Error('Nonpositive/nonfinite observation '+label);
  if(!/^[a-f0-9]{64}$/.test(row.raw_response_sha256))throw Error('Invalid canonical original SHA '+label);
  if(row.origin!=='OBSERVED')throw Error('Proxy or estimated canonical value not accepted '+label);
  results.push(row);
 }
 if(!results.length)throw Error('Empty canonical observed data '+label);
 return results;
}
module.exports={canonicalRows,HEAD};