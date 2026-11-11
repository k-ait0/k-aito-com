#!/usr/bin/env node
'use strict';
// DOM-level offline event flow with 100% synthetic inputs; no network or licensed data.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('research/analytics/personal-lab/index.html','utf8');
const source=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert(source);new vm.Script(source);
const nodes=new Map();
function makeNode(id=''){
 const classSet=new Set();
 const el={
   id,value:'',checked:false,disabled:false,files:[],textContent:'',innerHTML:'',
   style:{},dataset:{},options:[],
   classList:{
     add:x=>classSet.add(x),remove:x=>classSet.delete(x),
     toggle:(x,force)=>{if(force??!classSet.has(x))classSet.add(x);else classSet.delete(x);return classSet.has(x)},
     contains:x=>classSet.has(x)
   },
   getBoundingClientRect:()=>({width:800,height:320,left:0,top:0}),
   addEventListener:()=>{},setAttribute:()=>{},querySelector:()=>makeNode(),
   closest:()=>makeNode(),appendChild(child){this.options.push(child);},
   getContext:()=>ctx
 };
 return el;
}
const ctx={
 setTransform:()=>{},clearRect:()=>{},beginPath:()=>{},moveTo:()=>{},lineTo:()=>{},
 stroke:()=>{},fillText:()=>{},closePath:()=>{},fill:()=>{},
 createLinearGradient:()=>({addColorStop:()=>{}})
};
const document={
 getElementById:id=>{if(!nodes.has(id))nodes.set(id,makeNode(id));return nodes.get(id)},
 createElement:tag=>makeNode(tag)
};
const ids=['initial','monthly','withdrawType','withdrawTiming','startMonth','horizon','plotMode',
 'asset','portfolioRisk','cashPercent','sellOrder','rebalance'];
const init={
 initial:'30000000',monthly:'100000',withdrawType:'real',withdrawTiming:'END_OF_MONTH',
 startMonth:'',horizon:'30',plotMode:'real',asset:'usd',portfolioRisk:'usd',
 cashPercent:'20',sellOrder:'CASH_FIRST',rebalance:'NONE'
};
for(const id of ids)document.getElementById(id).value=init[id];
const win={addEventListener:()=>{}};
const context=vm.createContext({document,window:win,Intl,Map,Set,Date,Math,Number,
 String,Array,devicePixelRatio:1,console,Blob,URL,setTimeout});
new vm.Script(source,{filename:'personal-lab.js'}).runInContext(context);
const get=()=>win.__KAI_PERSONAL_TEST__.getState(),el=id=>nodes.get(id);
assert.equal(get().tab,'power');assert.equal(get().months,669);
assert.equal(get().rendered,669);assert.equal(el('dataErrors').classList.contains('hidden'),true);
el('tabPortfolio').onclick();
assert.equal(get().tab,'portfolio');assert.equal(get().rendered,361);
assert.equal(el('portfolioInputs').classList.contains('hidden'),false);
assert.equal(el('withdrawInputs').classList.contains('hidden'),false);
assert.equal(el('exportCsv').disabled,false);
assert(el('chartTitle').textContent.includes('円現金'));
assert(el('statC').textContent.includes('309'));
assert.equal(el('portfolioLedger').classList.contains('hidden'),true);
el('modeDetail').onclick();
assert.equal(el('portfolioLedger').classList.contains('hidden'),false);
assert.equal(el('portfolioAdvanced').classList.contains('hidden'),false);
el('sellOrder').value='RISK_FIRST';el('rebalance').value='ANNUAL';el('sellOrder').onchange();
assert(el('chartSubtitle').textContent.includes('投資資産優先'));
assert(el('chartSubtitle').textContent.includes('年次調整'));
assert.equal(get().results,361);
el('portfolioRisk').value='tr';el('portfolioRisk').onchange();
assert(el('legendText').textContent.includes('TR'));
assert.equal(get().rendered,361);
el('horizon').value='10';el('horizon').onchange({target:{value:'10'}});
assert.equal(get().rendered,121);
assert(el('statC').textContent.includes('549'));
el('modeSimple').onclick();
assert.equal(el('portfolioAdvanced').classList.contains('hidden'),true);
assert(el('chartSubtitle').textContent.includes('現金優先'));
assert(el('chartSubtitle').textContent.includes('リバランスなし'));
el('tabWithdraw').onclick();
assert.equal(get().tab,'withdraw');assert.equal(get().results,121);
assert.equal(el('portfolioInputs').classList.contains('hidden'),true);
el('tabPower').onclick();assert.equal(get().tab,'power');assert.equal(get().rendered,669);
// Synthetic validated personal TR input + self-use acknowledgement gate.
const raw='month,series_id,value,unit,currency,series_kind,origin,source_id,raw_response_sha256\n';
const sha='a'.repeat(64);
const months=Array.from({length:373},(_,i)=>win.__KAI_PERSONAL_TEST__.mergeSeries
 ? {month:(2000+Math.floor(i/12))+'-'+String((i%12)+1).padStart(2,'0'),i}
 : null);
const trCsv=raw+months.map(({month,i})=>[month,'JPX_TR_SELF_USE',100+i,'INDEX_TR','JPY',
 'INDEX_TOTAL_RETURN','OBSERVED','JPX',sha].join(',')).join('\n')+'\n';
const fxCsv='month,series_id,value,unit,currency,series_kind,origin,source_id,raw_response_sha256\n'+
 months.map(({month,i})=>[month,'FED_H10_USDJPY_MONTH_END',120+i/100,
 'JPY_PER_USD','JPY','FX_RATE','OBSERVED','FED_BOARD',sha].join(',')).join('\n')+'\n';
const cpiCsv='month,series_id,value,unit,currency,series_kind,origin,source_id,raw_response_sha256\n'+
 months.map(({month,i})=>[month,'JP_CPI_HEADLINE_2025_LINKED',90+i/200,
 'INDEX_2025_100','NOT_APPLICABLE','CPI_LEVEL','OBSERVED','ESTAT',sha].join(',')).join('\n')+'\n';
const file=text=>({size:text.length,text:async()=>text});
el('fileFx').files=[file(fxCsv)];el('fileCpi').files=[file(cpiCsv)];el('fileTr').files=[file(trCsv)];
el('sourceLocal').onclick();
async function main(){
 await el('loadFiles').onclick();
 assert(el('dataErrors').textContent.includes('TR指数は適法'));
 el('trAck').checked=true;
 await el('loadFiles').onclick();
 assert.equal(get().kind,'local');assert.equal(get().months,373);
 el('tabPortfolio').onclick();el('portfolioRisk').value='tr';el('portfolioRisk').onchange();
 assert.equal(get().results,121);
 assert(el('chartSubtitle').textContent.includes('円現金'));
 assert.equal(el('chartBadge').textContent,'PRIVATE CSV');
 assert.equal(el('dataErrors').classList.contains('hidden'),true);
 assert.equal(el('exportCsv').disabled,false);
 el('clearFiles').onclick();
 assert.equal(get().kind,'demo');assert.equal(get().months,669);
 console.log('PASS DOM: offline 3-tab navigation, 2-asset controls, 30y/10y windows, synthetic TR upload consent/error, no network');
}
main().catch(e=>{console.error(e);process.exitCode=1});
