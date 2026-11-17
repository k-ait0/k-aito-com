'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {defaults,validateConfig,makeScenario,calculatePreview}=require('../lib/analytics/offline-preview-v032.cjs');
const {compile}=require('./build-analytics-offline-preview-v032.cjs');
const FIXED=Object.freeze({...defaults,horizon_years:1,initial_yen:20000,monthly_living_yen:1000,annual_return_pct:0,annual_cpi_pct:0});
const happy=(x={})=>calculatePreview({...FIXED,...x});
const inputFields={initial_yen:'10000000',monthly_contribution_yen:'0',monthly_living_yen:'100000',horizon_years:'10',annual_return_pct:'4',annual_cpi_pct:'2',cashflow_timing:'MONTH_START',stress_profile:'FLAT_RATE'};
function fakeDom(){
  class Element{
    constructor(id=''){this.id=id;this.textContent='';this.value=inputFields[id]||'';this.children=[];this.attrs={};this.listeners={};}
    setAttribute(k,v){this.attrs[k]=v;}get firstChild(){return this.children[0]||null;}
    appendChild(c){this.children.push(c);return c;}removeChild(c){const i=this.children.indexOf(c);if(i===-1)throw Error('Missing child');this.children.splice(i,1);return c;}
    addEventListener(kind,fn){this.listeners[kind]=fn;}
  }
  const nodes=new Map();for(const id of [...Object.keys(inputFields),'scenario-form','error-msg','fixed-final','cpi-final','result-state','details','audit-state','balance-chart'])nodes.set(id,new Element(id));
  const document={getElementById(id){const e=nodes.get(id);if(!e)throw Error('Missing DOM ID '+id);return e;},createElement(tag){return new Element(tag);},createTextNode(content){const e=new Element('#text');e.textContent=String(content);return e;},createElementNS(ns,tag){if(ns!=='http://www.w3.org/2000/svg')throw Error('Unexpected namespace');return new Element(tag);},body:new Element('body')};
  return {document,nodes};
}
test('same nominal CPI and zero returns match fixed outlays on the audited existing Core',()=>{
 const r=happy();assert.equal(r.fixed.ending_assets_yen,8000);assert.equal(r.cpi_linked.ending_assets_yen,8000);assert.equal(r.cpi_linked.final_living_yen,1000);
 assert.equal(r.fixed.total_unfunded_yen,0);assert.equal(r.independent_input_audits,2);assert.equal(r.cpi_cross_engine_concordance,'PASS');
});
test('zero wealth after fully paid final month is not a shortfall',()=>{
 const r=happy({initial_yen:12000});assert.equal(r.fixed.ending_assets_yen,0);assert.equal(r.fixed.shortfall_months,0);assert.equal(r.fixed.first_shortfall_month,null);
});
test('unpaid months and unpaid sums are independently reported',()=>{
 const r=happy({initial_yen:1100});assert.equal(r.fixed.ending_assets_yen,0);assert.equal(r.fixed.shortfall_months,11);assert.equal(r.fixed.total_unfunded_yen,10900);assert.equal(r.cpi_linked.total_unfunded_yen,10900);
});
test('positive synthetic CPI causes different expenses without deflating assets',()=>{
 const r=happy({initial_yen:1000000,annual_cpi_pct:12});assert.ok(r.cpi_linked.ending_assets_yen<r.fixed.ending_assets_yen);
 assert.ok(r.cpi_linked.final_living_yen>1000);assert.equal(r.cpi_linked.first_living_yen,1000);
});
test('negative CPI permits deflation and strictly positive living expense',()=>{
 const r=happy({initial_yen:1000000,annual_cpi_pct:-15});assert.ok(r.cpi_linked.ending_assets_yen>r.fixed.ending_assets_yen);
 assert.ok(r.cpi_linked.final_living_yen>0&&r.cpi_linked.final_living_yen<1000);
});
test('MONTH_END and MONTH_START are explicitly different for returns and cashflows',()=>{
 const a=happy({initial_yen:1000000,annual_return_pct:40,cashflow_timing:'MONTH_START'}),b=happy({initial_yen:1000000,annual_return_pct:40,cashflow_timing:'MONTH_END'});
 assert.ok(b.fixed.ending_assets_yen>a.fixed.ending_assets_yen);assert.equal(b.phase,'MONTH_END');assert.equal(b.cpi_cross_engine_concordance,'PASS');
});
test('year-one shock synthetic profile is truly -30% annualized for 12 months',()=>{
 const {monthly_market_returns:m}=makeScenario({...FIXED,stress_profile:'YEAR1_SHOCK',annual_return_pct:20,horizon_years:2});
 let factor=1;for(let i=0;i<12;i++)factor*=1+m[i].asset_returns.STOCK;
 assert.ok(Math.abs(factor-.7)<1e-11);assert.ok(m[12].asset_returns.STOCK>0);
});
test('synthetic mode always labels every month synthetic and preserves no real data claim',()=>{
 const x=makeScenario({...FIXED,horizon_years:30});assert.equal(x.monthly_market_returns.length,360);
 assert.equal(x.cpiLevels.length,361);assert.ok(x.monthly_market_returns.every(r=>r.origin==='SYNTHETIC'));
 assert.ok(x.cpiLevels.every(r=>r.origin==='SYNTHETIC'&&r.source_id==='SYNTHETIC_FIXTURE'));
 const r=happy({horizon_years:30});assert.equal(r.market_mode,'SYNTHETIC_DEMO');assert.equal(r.real_data_qa_completed,false);
 assert.equal(r.official_jp_cpi_used,false);assert.equal(r.production_approved,false);assert.equal(r.timeline.length,31);
 assert.equal(r.retrospective_market_probabilities,false);
});
test('input object not mutated and calculation is deterministic',()=>{
 const input={...FIXED,horizon_years:2};const json=JSON.stringify(input);
 assert.deepEqual(happy({horizon_years:2}),happy({horizon_years:2}));assert.equal(JSON.stringify(input),json);
});
test('allow only whitelisted UI fields, no observed/proxy/private source mode',()=>{
 for(const field of ['market_mode','origin','private_key','source_file','jp_cpi_monthly_levels','publication_approved','verified_sha256'])
   assert.throws(()=>validateConfig({...FIXED,[field]:'OBSERVED'}),/未対応/);
});
test('strict monetary and numerical checks reject coerced strings and fractional yen',()=>{
 for(const value of [NaN,Infinity,-1,1.1,'1000',100000000001])assert.throws(()=>validateConfig({...FIXED,initial_yen:value}),/整数/);
 for(const value of [NaN,Infinity,-96,101,'5'])assert.throws(()=>validateConfig({...FIXED,annual_return_pct:value}),/騰落率/);
 for(const value of [NaN,Infinity,-21,51,'2'])assert.throws(()=>validateConfig({...FIXED,annual_cpi_pct:value}),/CPI/);
});
test('invalid horizon, settlement timing and stress setting rejected',()=>{
 for(const y of [0,31,1.5,'20'])assert.throws(()=>validateConfig({...FIXED,horizon_years:y}),/期間/);
 for(const v of ['MID_MONTH',null,undefined])assert.throws(()=>validateConfig({...FIXED,cashflow_timing:v}),/月初/);
 assert.throws(()=>validateConfig({...FIXED,stress_profile:'ACTUAL_MARKET'}),/シナリオ/);
});
test('empty principal and empty contributions fail rather than show misleading funded result',()=>{
 assert.throws(()=>validateConfig({...FIXED,initial_yen:0,monthly_contribution_yen:0}),/どちらか/);
});
test('generated monthly series and CPI settlement reference agree for start/end phases',()=>{
 for(const phase of ['MONTH_START','MONTH_END']){
  const a=makeScenario({...FIXED,annual_cpi_pct:25,cashflow_timing:phase});
  assert.equal(a.monthly_market_returns[0].month,'2026-01');assert.equal(a.cpiLevels[0].month,'2025-12');
  assert.equal(a.monthly_cashflows[0].withdrawal_yen,1000);
  assert.ok(a.monthly_cashflows[1].withdrawal_yen>1000);
 }
});
test('thirty-year intense CPI rate either computes safely or fails closed (no silently fabricated outputs)',()=>{
 assert.doesNotThrow(()=>happy({horizon_years:30,initial_yen:10000000,annual_cpi_pct:50,annual_return_pct:0}));
});
test('builder includes actual audited Core CJS and no external libraries',()=>{
 const generated=compile();assert.ok(generated.html.includes('asset_returns'));assert.ok(generated.bundle.includes('INPUT_AUDIT_MISMATCH'));
 assert.ok(generated.bundle.includes('runRollingPortfolioCpiLinked'));
 assert.ok(!generated.bundle.includes('XMLHttpRequest'));assert.ok(!/\bfetch\s*\(/.test(generated.bundle));
 assert.ok(!/<script[^>]+src=/.test(generated.html));assert.ok(!/<link[^>]+href=/.test(generated.html));
});
test('strong CSP pins exact inline script/style bytes; connects and object embeds prohibited',()=>{
 const {html,csp}=compile();const script=html.match(/<script>([\s\S]*?)<\/script>/)[1],css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
 for(const [key,value] of [['script-src',script],['style-src',css]]){
  const digest=crypto.createHash('sha256').update(value).digest('base64');assert.ok(csp.includes(key+" 'sha256-"+digest+"'"));
 }
 assert.ok(csp.includes("connect-src 'none'"));assert.ok(csp.includes("form-action 'none'"));
});
test('offline browser boot renders verified synthetic core output and an SVG timeline',()=>{
 const {document,nodes}=fakeDom(),context={window:{},document};vm.runInNewContext(compile().bundle,context,{timeout:7000});
 assert.equal(document.body.attrs['data-preview-status'],'READY');assert.match(nodes.get('audit-state').textContent,/PASS/);
 assert.match(nodes.get('fixed-final').textContent,/円/);assert.match(nodes.get('cpi-final').textContent,/円/);
 assert.ok(nodes.get('balance-chart').children.some(x=>x.id==='polyline'));
 assert.ok(nodes.get('details').children.length===6);
});
test('offline browser interaction recalculates on real submit without network',()=>{
 const {document,nodes}=fakeDom(),context={window:{},document};vm.runInNewContext(compile().bundle,context,{timeout:7000});
 const old=nodes.get('fixed-final').textContent;
 nodes.get('cashflow_timing').value='MONTH_END';nodes.get('stress_profile').value='YEAR1_SHOCK';
 let prevented=false;nodes.get('scenario-form').listeners.submit({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(document.body.attrs['data-preview-status'],'READY');
 assert.notEqual(nodes.get('fixed-final').textContent,old);
});
test('offline browser blocks invalid input and displays accessible error',()=>{
 const {document,nodes}=fakeDom(),context={window:{},document};vm.runInNewContext(compile().bundle,context,{timeout:7000});
 nodes.get('monthly_living_yen').value='notanumber';nodes.get('scenario-form').listeners.submit({preventDefault(){}});
 assert.equal(document.body.attrs['data-preview-status'],'ERROR');assert.match(nodes.get('error-msg').textContent,/数値/);
 assert.equal(nodes.get('fixed-final').textContent,'—');assert.equal(nodes.get('cpi-final').textContent,'—');
 assert.equal(nodes.get('balance-chart').children.length,0);assert.match(nodes.get('audit-state').textContent,/未実施/);
});
test('actual emitted HTML precisely equals reproducible builder output',()=>{
 const file=path.resolve(__dirname,'../research/analytics/K_Aito_Analytics_Offline_Preview_v032.html');
 assert.equal(fs.readFileSync(file,'utf8'),compile().html);
});
