#!/usr/bin/env node
'use strict';
/*
 * REAL DWZ R4 v16.9 research financial simulateOne (pinned source excerpt)
 * vs Personal Lab v0.2 1-asset cash-flow ledger.
 * 192 fully synthetic cases, no market values, no official TR, no network.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('research/analytics/personal-lab/index.html','utf8');
const js=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)[1],mark=js.indexOf('function setOptions(){');
assert(mark>0);
const ctx=vm.createContext({Intl,Map,Set,Math,Number,Date,String,Array,document:{getElementById:()=>({})}});
new vm.Script(js.slice(js.indexOf('const $='),mark)+
 '\nglobalThis.personal={simulateWithdrawal,rollingWithdraw,addMonths};').runInContext(ctx);
const p=ctx.personal;
const source=fs.readFileSync('research/analytics/fixtures/dwz_simulateOne_r4_v16_9_research_fixture.js','utf8');
assert(source.includes('function simulateOne(s, m)'));
assert(source.includes("phase('BEGINNING_OF_MONTH');"));
assert(source.includes("phase('END_OF_MONTH');"));
const dwz=vm.createContext({Math,Object,Array,Number,Error});
new vm.Script([
 "const validation_js_1={validateInputs(){return true;}};",
 "const exports={ENGINE_VERSION:'0.2.1-phase1-beta'};",
 "const clone=(h)=>Object.fromEntries(Object.entries(h).map(([k,v])=>[k,{...v}]));",
 source,
 "globalThis.dwzSimulate=simulateOne;"
].join('\n')).runInContext(dwz);
function close(a,b,detail){
 const tolerance=Math.max(1e-6,Math.abs(b)*1e-9);
 assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance,
  detail+' '+a+' vs '+b+' (tolerance '+tolerance+')');
}
function run(timing,escalation,pathName,initial,monthly){
 const months=Array.from({length:13},(_,i)=>p.addMonths('2000-01',i));
 const level=[1];
 const returns=Array.from({length:12},(_,i)=>{
   if(pathName==='flat')return 0;
   if(pathName==='growth')return 0.035;
   if(pathName==='crash')return i===2?-0.65:i===6?0.55:0.005;
   return (i%2===0?0.12:-0.105);
 });
 for(const ret of returns)level.push(level.at(-1)*(1+ret));
 const cpi=months.map((_,i)=>100*Math.pow(1.004,i));
 const rows=months.map((month,i)=>({month,fx:level[i],cpi:cpi[i],gold:null}));
 const personal=p.simulateWithdrawal(rows,0,1,initial,monthly,'usd',escalation,timing);
 const basis=timing==='BEGINNING_OF_MONTH'?0:1;
 const scenario={
   id:'offline-dwz-parity',schemaVersion:'test-v0',
   portfolio:{holdings:{USD:{marketValue:initial,costBasis:initial}}},
   person:{simulationStartAgeMonths:480},lifeEvents:[],
   expenseStreams:[{timing,monthlyAmount:monthly,startAgeMonths:480,endAgeMonths:492,
     escalationModel:{type:escalation?'CPI_LINKED':'NONE'}}],
   incomeStreams:[],pensionStreams:[],target:{valueBasis:'NOMINAL',targetAssets:0}
 };
 const market={datasetVersion:'synthetic-only',
   months:months.slice(basis,basis+12),
   returns:{USD:returns},
   cpiIndex:months.slice(basis,basis+12).map((_,i)=>cpi[i+basis]/cpi[0])};
 const result=dwz.dwzSimulate(scenario,market);
 const desc=[timing,escalation,pathName,initial,monthly].join(' / ');
 close(result.summary.finalAssets,personal.remaining,'final '+desc);
 close(result.summary.totalWithdrawals,personal.total,'actual withdrawals '+desc);
 close(result.summary.cumulativeCashShortfall,personal.totalShortfall,'shortfalls '+desc);
 close(result.summary.totalInvestmentReturn,personal.investmentReturnTotal,'returns '+desc);
 const first=result.summary.firstShortfallAgeMonths;
 const firstMonth=first===null?null:months[first-480+basis];
 assert.equal(personal.firstShortfallMonth,firstMonth,'first shortfall '+desc);
 assert.equal(personal.covered,first===null,'coverage '+desc);
 assert.equal(personal.rows.length,13);
 const line=result.timeline.at(-1);
 close(line.totalAssets,personal.remaining,'ledger close '+desc);
}
let n=0;
for(const timing of ['BEGINNING_OF_MONTH','END_OF_MONTH'])
 for(const escalation of [false,true])
  for(const pathName of ['flat','growth','crash','zigzag'])
   for(const initial of [500,1000,1200,10000])
    for(const monthly of [0,30,100]){
       run(timing,escalation,pathName,initial,monthly);n++;
    }
assert.equal(n,192);
console.log('PASS: 192/192 synthetic historical-path scenarios reconciled to the actual DWZ R4 v16.9 draft simulateOne financial phase; single-asset/no tax only');
