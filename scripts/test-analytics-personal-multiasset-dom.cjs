#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const html=require('./build-analytics-personal-multiasset-ui.cjs').build();
assert(html.includes("connect-src 'none'"));
const s=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];assert(s);
new vm.Script(s);
const nodes=new Map(),noop=()=>{};
const canvas={setTransform:noop,clearRect:noop,beginPath:noop,moveTo:noop,lineTo:noop,stroke:noop,fillText:noop};
function el(id=''){
 const classes=new Set(),children=[];
 const e={id,value:'',disabled:false,checked:false,files:[],style:{},children,
  classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>{if(on)classes.add(x);else classes.delete(x)}},
  append(...x){children.push(...x)},appendChild(x){children.push(x)},addEventListener:noop,
  getContext:()=>canvas,getBoundingClientRect:()=>({width:800,height:300})};
 let text='';Object.defineProperty(e,'textContent',{get:()=>text,set(v){text=String(v);if(text==='')children.length=0}});
 return e;
}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id)},createElement(tag){const n=el(tag);let value='';Object.defineProperty(n,'id',{get:()=>value,set(v){value=v;if(v)nodes.set(v,n)}});return n;}};
const form={dataMode:'demo',assetCount:'3',initial:'10000000',horizon:'120',startOffset:'0',rebalance:'NONE',rebalanceParam:'12',expensePriority:'EVENT_FIRST',
 monthlyContribution:'0',monthlyExpense:'100000',expenseMode:'NOMINAL_FIXED',inflationRate:'2',salaries:'',pensions:'',events:''};
for(const [k,v] of Object.entries(form))document.getElementById(k).value=v;
const window={devicePixelRatio:1,addEventListener:noop,setTimeout:noop};
vm.runInNewContext(s,{document,window,Intl,Map,Set,Date,Math,Number,String,Array,Blob,URL,console});
const app=window.__KAI_MULTI_TEST__,$=id=>document.getElementById(id);
assert(app);assert.equal(app.getState().assets,3);
assert.equal(app.getState().months,600);assert.equal(app.getState().resultMonths,120,$('message').textContent);
assert.equal(app.getState().rollingWindows,481);
assert(app.getState().downloadEnabled);
$('assetCount').value='12';$('assetCount').onchange();
assert.equal(app.getState().assets,12);assert.equal($('assetEditor').children.length,12);
$('events').value='repair,12,EXPENSE,500000';app.run();
assert.equal(app.getState().downloadEnabled,true);
$('events').value='bad,12,EXPENSE,-1';app.run();
assert.equal(app.getState().downloadEnabled,false);
$('events').value='repair,0,EXPENSE,100000';
$('expensePriority').value='LIVING_FIRST';app.run();
assert.equal(app.getState().downloadEnabled,true,'LIVING_FIRST must be selectable');
$('expensePriority').value='EVENT_FIRST';$('events').value='';app.run();
assert.equal(app.getState().downloadEnabled,true);
const sha='a'.repeat(64);
const csv=['month,series_id,value,unit,currency,series_kind,origin,source_id,raw_response_sha256'];
for(let i=0;i<145;i++){
 const n=2000*12+i;
 csv.push([Math.floor(n/12)+'-'+String(n%12+1).padStart(2,'0'),'PERSONAL_JPX_TR',String(100+i),
  'INDEX_TR','JPY','INDEX_TOTAL_RETURN','OBSERVED','JPX',sha].join(','));
}
const valid=csv.join('\n')+'\n',parsed=app.indexCsv(valid);
assert.equal(parsed.records.size,145);
assert.equal(app.buildMarketFromLevels([parsed],true,null).monthly_market_returns.length,144);
assert.throws(()=>app.indexCsv(valid.replaceAll('INDEX_TOTAL_RETURN','COMMODITY_SPOT')),/TR以外/);
assert.throws(()=>app.indexCsv(valid.replaceAll(',JPY,INDEX_TOTAL_RETURN',',USD,INDEX_TOTAL_RETURN')),/JPY/);
assert.throws(()=>app.buildMarketFromLevels([parsed,parsed],true,null),/重複/);
assert.throws(()=>app.indexCsv(valid.replaceAll(',INDEX_TR,JPY,',',FX_RATE,JPY,')),/INDEX_TR/,
 'Index kind alone is insufficient if its declared unit is a currency quotation');
const cp=['month,series_id,value,unit,currency,series_kind,origin,source_id,raw_response_sha256'];
for(let i=0;i<145;i++){
 const n=2000*12+i;
 cp.push([Math.floor(n/12)+'-'+String(n%12+1).padStart(2,'0'),
  'JP_CPI_HEADLINE_2025_LINKED',(100+i/10).toFixed(1),'INDEX_2025_100','NOT_APPLICABLE',
  'CPI_LEVEL','OBSERVED','ESTAT',sha].join(','));
}
const cpiValid=cp.join('\n')+'\n';
assert.equal(app.cpiCsv(cpiValid).size,145);
assert.throws(()=>app.cpiCsv(cpiValid.replaceAll('INDEX_2025_100','INDEX_2015_100')),
 /2025基準/, 'Silent CPI base-year substitution must fail');
assert.throws(()=>app.cpiCsv(cpiValid.replaceAll(',OBSERVED,ESTAT',',ESTIMATED,ESTAT')),
 /2025基準/, 'Estimated CPI values must fail');
assert.equal(app.buildMarketFromLevels([parsed],true,app.cpiCsv(cpiValid)).cpi_levels.length,145);
$('events').value='';app.run();
assert(app.getState().downloadEnabled,'Valid plan must be recomputed before coverage UI is asserted');
assert($('windowsFoot').textContent.includes('暦月基準で除外'));
console.log('PASS offline 1..12 asset HTML bundle, DOM synthetic 3/12 assets, fail-closed events, private index levels->monthly JPY returns');
