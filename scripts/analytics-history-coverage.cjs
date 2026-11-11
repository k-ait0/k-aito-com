'use strict';
// Analytics history coverage contract v0.5. Pure calculations; no downloads or implicit data backfill.
function monthSerial(month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Expected YYYY-MM: '+month);
 return Number(month.slice(0,4))*12+Number(month.slice(5))-1;
}
function toMonth(serial){
 if(!Number.isInteger(serial)||serial<0)throw Error('Invalid month serial');
 return String(Math.floor(serial/12)).padStart(4,'0')+'-'+String(serial%12+1).padStart(2,'0');
}
function potentialRollingWindows({first_month,last_month,kind},horizonMonths=360){
 if(!Number.isInteger(horizonMonths)||horizonMonths<1)throw Error('Invalid horizon');
 const first=monthSerial(first_month),last=monthSerial(last_month);
 if(last<first)throw Error('Reversed coverage');
 if(!['LEVEL','MONTHLY_RETURN'].includes(kind))throw Error('Invalid series representation');
 const firstReturn=first+(kind==='LEVEL'?1:0);
 const returns=Math.max(0,last-firstReturn+1);
 return {start_return_month:returns?toMonth(firstReturn):null,end_return_month:returns?toMonth(last):null,
  potential_complete_windows:Math.max(0,returns-horizonMonths+1),history_return_months:returns,
  status:'THEORETICAL_UPPER_BOUND_ONLY',reason:'Published date bounds are not proof of full observation continuity, matching methodology, or publication rights'};
}
function potentialJointWindows(series,horizonMonths=360){
 if(!Array.isArray(series)||series.length===0)throw Error('No selected series');
 if(!Number.isInteger(horizonMonths)||horizonMonths<1)throw Error('Invalid horizon');
 const r=series.map(s=>{if(!['LEVEL','MONTHLY_RETURN'].includes(s.kind))throw Error('Invalid series representation');
  const f=monthSerial(s.first_month)+(s.kind==='LEVEL'?1:0),t=monthSerial(s.last_month);
  if(t<monthSerial(s.first_month))throw Error('Reversed coverage');
  return {first:f,last:t}});
 const first=Math.max(...r.map(x=>x.first)),last=Math.min(...r.map(x=>x.last));
 const overlapMonths=Math.max(0,last-first+1);
 return {potential_complete_windows:Math.max(0,overlapMonths-horizonMonths+1),
  common_first_return_month:overlapMonths?toMonth(first):null,common_last_return_month:overlapMonths?toMonth(last):null,
  status:'THEORETICAL_UPPER_BOUND_ONLY',no_proxies_assumed:true};
}
function verifiedRollingWindows(records,horizonMonths=360){
 if(!Number.isInteger(horizonMonths)||horizonMonths<1)throw Error('Invalid horizon');
 if(!Array.isArray(records))throw Error('Need monthly returns array');
 const observations=records.map(x=>{
  const month=monthSerial(x.month);
  if(x.origin!=='OBSERVED'||x.proxy===true)throw Error('Proxy or unsupported input in observed-only analysis');
  if(!Number.isFinite(x.monthly_return)||x.monthly_return<=-1)throw Error('Invalid return '+x.month);
  return {month,return:x.monthly_return}
 }).sort((a,b)=>a.month-b.month);
 let runs=[],current=0,previous=-1;
 for(const x of observations){
  if(x.month===previous)throw Error('Duplicate month '+toMonth(x.month));
  if(previous>=0&&x.month!==previous+1){runs.push(current);current=0}
  current++;previous=x.month;
 }
 if(current)runs.push(current);
 const windows=runs.reduce((sum,n)=>sum+Math.max(0,n-horizonMonths+1),0);
 return {complete_windows:windows,observed_months:observations.length,contiguous_blocks:runs.length,
  missing_months_not_filled:true,proxies_used:false,mode:'OBSERVED_ONLY'};
}
module.exports={monthSerial,toMonth,potentialRollingWindows,potentialJointWindows,verifiedRollingWindows};
