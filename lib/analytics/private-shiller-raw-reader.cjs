'use strict';
/** The historical data team's pinned Shiller CSV transformation (research-only). */
const {monthSerial}=require('./cashflow-core.cjs');
const HEAD='month,sp500_price_index,annualized_dividend_index_points,us_cpi_index';
function deriveShillerApproxUsdReturns(raw, expectedRows){
 if(!Buffer.isBuffer(raw))throw Error('Shiller raw must be file bytes');
 const lines=raw.toString('utf8').replace(/^\uFEFF/,'').trimEnd().split(/\r?\n/);
 if(lines.shift()!==HEAD)throw Error('Shiller raw schema mismatch');
 if(!lines.length || (expectedRows!==undefined&&lines.length!==expectedRows))throw Error('Shiller source rows/count mismatch');
 let previous=null,prior=null;const returns=[];
 for(const [i,line] of lines.entries()){
   const cells=line.split(',');
   if(cells.length!==4)throw Error('Shiller CSV width at row '+(i+2));
   const [month,...numbers]=cells;
   const serial=monthSerial(month);
   if(previous!==null && serial!==previous+1)throw Error('Shiller missing or duplicate month');
   if(numbers.some(s=>!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(s)))throw Error('Shiller invalid decimal value');
   const [price,dividend,cpi]=numbers.map(Number);
   if(!Number.isFinite(price)||price<=0||!Number.isFinite(dividend)||dividend<0||!Number.isFinite(cpi)||cpi<=0)throw Error('Shiller invalid index value');
   if(prior){
     const ret=price/prior.price-1+dividend/(12*prior.price);
     if(!Number.isFinite(ret)||ret<=-1||ret>10)throw Error('Shiller return out of bounds');
     returns.push({month,approx_total_return_usd:ret});
   }
   previous=serial;prior={price,dividend,cpi};
 }
 return {first_source_month:lines[0].slice(0,7),last_source_month:lines.at(-1).slice(0,7),source_rows:lines.length,usd_monthly_returns:returns};
}
module.exports={deriveShillerApproxUsdReturns};