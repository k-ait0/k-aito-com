'use strict';
// Monthly historical path builder: private research only. Explicitly fails on holes.
const MONTH_RE=/^\d{4}-(0[1-9]|1[0-2])$/;
function monthIndex(m){if(!MONTH_RE.test(m))throw Error('Invalid YYYY-MM '+m);return 12*Number(m.slice(0,4))+Number(m.slice(5))-1}
function indexedSeries(rows,key){
 if(!Array.isArray(rows)||!rows.length)throw Error('Empty series '+key);
 const out=new Map();
 for(const item of rows){const m=item.month;monthIndex(m);const v=Number(item[key]);
  if(item[key]===''||item[key]===null||item[key]===undefined||!Number.isFinite(v))throw Error('Invalid value '+key+' for '+m);
  if(out.has(m))throw Error('Duplicate month '+key+' '+m);
  out.set(m,v);
 }
 return out;
}
function buildJpyHistoricalPath({usdReturns,monthlyFx,monthlyCpi,cpiCountry,fxQuote}){
 if(cpiCountry!=='JP')throw Error('JPY real return requires Japan CPI; US CPI is not valid');
 if(fxQuote!=='JPY_PER_USD')throw Error('Expected USDJPY quote: JPY per USD');
 if(!Array.isArray(monthlyFx)||!monthlyFx.length)throw Error('FX data missing');
 const fxComplete=monthlyFx.filter(x=>x.month_status==='COMPLETE_OBSERVED');
 const skippedProvisional=monthlyFx.length-fxComplete.length;
 if(monthlyFx.some(x=>!['COMPLETE_OBSERVED','LATEST_MONTH_PROVISIONAL'].includes(x.month_status)))throw Error('Unknown month status');
 const rMap=indexedSeries(usdReturns,'approx_total_return_usd');
 const fxMap=indexedSeries(fxComplete,'value');
 const cpiMap=indexedSeries(monthlyCpi,'value');
 for(const [m,r] of rMap)if(r<=-1)throw Error('Impossible USD return '+m);
 for(const [m,fx] of fxMap)if(fx<=0)throw Error('Nonpositive FX '+m);
 for(const [m,c] of cpiMap)if(c<=0)throw Error('Nonpositive CPI '+m);
 const common=[...rMap.keys()].filter(x=>fxMap.has(x)&&cpiMap.has(x)).sort();
 if(common.length<2)throw Error('No sufficient overlap between USD returns, FX and CPI; stop without fabricating missing data');
 for(let i=1;i<common.length;i++){
  if(monthIndex(common[i])!==monthIndex(common[i-1])+1)throw Error('Gap in common historical months after '+common[i-1]);
 }
 const rows=[];
 for(let i=1;i<common.length;i++){
  const month=common[i],previous=common[i-1];
  const usdReturn=rMap.get(month),fxChange=fxMap.get(month)/fxMap.get(previous),cpiChange=cpiMap.get(month)/cpiMap.get(previous);
  const jpyReturn=(1+usdReturn)*fxChange-1;
  const jpyReal=(1+jpyReturn)/cpiChange-1;
  if(![fxChange,cpiChange,jpyReturn,jpyReal].every(Number.isFinite)||jpyReturn<=-1)throw Error('Bad monthly conversion '+month);
  rows.push({month,usdReturn,fxReturn:fxChange-1,jpyNominalReturn:jpyReturn,jpyRealReturn:jpyReal});
 }
 return {rows,meta:{calendar_months_covered:common.length,fx_provisional_excluded:skippedProvisional,first_return_month:rows[0].month,last_return_month:rows.at(-1).month,rights:'PRIVATE_RESEARCH_ONLY',fx_method:'monthly last observed, no forward fill',returns_method:'(1+USD_r)*(FX_t/FX_(t-1))-1',cpi_method:'(1+jpy_nominal)/(JP_CPI_t/JP_CPI_(t-1))-1',official_total_return:false}};
}
module.exports={monthIndex,indexedSeries,buildJpyHistoricalPath};
