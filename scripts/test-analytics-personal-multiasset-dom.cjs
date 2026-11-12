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
 return {id,value:'',disabled:false,checked:false,files:[],textContent:'',style:{},children,
  classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>{if(on)classes.add(x);else classes.delete(x)}},
  append(...x){children.push(...x)},appendChild(x){children.push(x)},addEventListener:noop,
  getContext:()=>canvas,getBoundingClientRect:()=>({width:800,height:300})};
}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id)},createElement:el};
const form={dataMode:'demo',assetCount:'3',initial:'10000000',horizon:'120',startOffset:'0',rebalance:'NONE',rebalanceParam:'12',
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
console.log('PASS offline 1..12 asset HTML bundle, DOM synthetic 3/12 assets, fail-closed events, private index levels->monthly JPY returns');
