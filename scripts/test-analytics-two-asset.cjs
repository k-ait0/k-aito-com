#!/usr/bin/env node
'use strict';
// V0.3: offline synthetic two-sleeve portfolio ledger QA. NEVER use licensed prices.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('research/analytics/personal-lab/index.html','utf8');
const script=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert(script,'single-file HTML must contain JS');
new vm.Script(script,{filename:'personal-lab-inline.js'});
const end=script.indexOf('function setOptions(){');
assert(end>0);
const context=vm.createContext({Intl,Map,Set,Math,Number,Date,String,Array,document:{getElementById:()=>({})}});
new vm.Script(script.slice(script.indexOf('const $='),end)+
 '\nglobalThis.fns={addMonths,simulateWithdrawal,simulateTwoAsset,rollingTwoAsset,mergeSeries,demo};').runInContext(context);
const f=context.fns;
const eq=(a,b,why)=>assert(Math.abs(a-b)<=Math.max(1e-5,Math.abs(b)*1e-10),why+' '+a+' vs '+b);
function history(length=373,kind='vary'){
 let month='1980-01',fx=100,cpi=100;
 return Array.from({length},(_,i)=>{
  if(i>0){
   const r=kind==='flat'?1:kind==='up'?1.005:kind==='crash'&&i===31?0.24:1+0.012*Math.sin(i*.73)-0.002;
   fx*=r;cpi*=kind==='flat'?1:1.001;
  }
  const row={month,fx,cpi,gold:60+2*i};
  month=f.addMonths(month,1);
  return row;
 });
}
const flat=history(373,'flat');
const base={cashPercent:20,sellOrder:'CASH_FIRST',rebalance:'NONE'};
const full=f.simulateTwoAsset(flat,0,1,1200,100,'usd',false,'END_OF_MONTH',
 {cashPercent:100,sellOrder:'CASH_FIRST',rebalance:'NONE'});
assert.equal(full.remaining,0);assert.equal(full.firstShortfallMonth,null);assert.equal(full.totalShortfall,0);
assert.equal(full.total,1200);assert.equal(full.depletedMonth,'1981-01');
const dueMore=f.simulateTwoAsset(flat,0,1,1000,100,'usd',false,'END_OF_MONTH',base);
assert.equal(dueMore.total,1000);assert.equal(dueMore.totalShortfall,200);
assert.equal(dueMore.firstShortfallMonth,'1980-12');
assert.equal(dueMore.depletedMonth,'1980-11');
const beginning=f.simulateTwoAsset(flat,0,1,1000,100,'usd',false,'BEGINNING_OF_MONTH',base);
assert.equal(beginning.rows[0].withdrawn,100);
assert.equal(beginning.rows.at(-1).withdrawn,0);
assert.equal(beginning.firstShortfallMonth,'1980-11');
assert.equal(beginning.totalShortfall,200);
assert.equal(f.simulateTwoAsset(flat,0,1,1000,0,'usd',true,'BEGINNING_OF_MONTH',base).totalShortfall,0);
const step=flat.map((x,i)=>({...x,fx:i===0?100:200+(i-1)*10}));
const a=f.simulateTwoAsset(step,0,1,1000,100,'usd',false,'END_OF_MONTH',
 {cashPercent:50,sellOrder:'CASH_FIRST',rebalance:'NONE'});
const b=f.simulateTwoAsset(step,0,1,1000,100,'usd',false,'END_OF_MONTH',
 {cashPercent:50,sellOrder:'RISK_FIRST',rebalance:'NONE'});
assert.equal(a.rows[1].cash_yen,400);assert.equal(a.rows[1].risk_yen,1000);
assert.equal(b.rows[1].cash_yen,500);assert.equal(b.rows[1].risk_yen,900);
assert(a.remaining>b.remaining);
const p=f.simulateTwoAsset(flat,0,1,1000,100,'usd',false,'END_OF_MONTH',
 {cashPercent:30,sellOrder:'PRO_RATA',rebalance:'NONE'});
eq(p.rows[1].cash_yen,270,'pro rata cash');eq(p.rows[1].risk_yen,630,'pro rata risk');
const cm=f.simulateTwoAsset(step,0,1,1000,0,'usd',false,'END_OF_MONTH',
 {cashPercent:50,sellOrder:'CASH_FIRST',rebalance:'MONTHLY'});
const ca=f.simulateTwoAsset(step,0,1,1000,0,'usd',false,'END_OF_MONTH',
 {cashPercent:50,sellOrder:'CASH_FIRST',rebalance:'ANNUAL'});
const cn=f.simulateTwoAsset(step,0,1,1000,0,'usd',false,'END_OF_MONTH',
 {cashPercent:50,sellOrder:'CASH_FIRST',rebalance:'NONE'});
eq(cm.rows[1].cash_yen,750,'monthly rebalance cash');eq(ca.rows[1].cash_yen,500,'annual no early trade');eq(cn.rows[1].cash_yen,500,'no rebalance cash');
assert(cm.rebalanceTurnover>0);eq(cn.rebalanceTurnover,0,'no rebalance turnover');
assert.equal(ca.rows.at(-1).rebalance_yen,0); // no pointless trade at final horizon
// Compare EXACT single-risk-mode valuation with v0.2 when cashPercent=0 and no rebalance.
let cases=0;
for(const kind of ['flat','up','crash','vary']){
 const rows=history(373,kind);
 for(const timing of ['BEGINNING_OF_MONTH','END_OF_MONTH'])
 for(const adjusted of [false,true])
 for(const horizon of [1,10,20,30])
 for(const initial of [1000,1200,300000])
 for(const monthly of [0,50,100]){
  const old=f.simulateWithdrawal(rows,0,horizon,initial,monthly,'usd',adjusted,timing);
  const newer=f.simulateTwoAsset(rows,0,horizon,initial,monthly,'usd',adjusted,timing,
   {cashPercent:0,sellOrder:'RISK_FIRST',rebalance:'NONE'});
  eq(newer.remaining,old.remaining,'single asset final');
  eq(newer.total,old.total,'single asset paid');
  eq(newer.totalShortfall,old.totalShortfall,'single asset shortfall');
  eq(newer.investmentReturnTotal,old.investmentReturnTotal,'single asset gains');
  assert.equal(newer.firstShortfallMonth,old.firstShortfallMonth,'single asset first shortfall');
  cases++;
 }
}
assert.equal(cases,576);
const random=history(373,'vary');
let audited=0;
for(const timing of ['BEGINNING_OF_MONTH','END_OF_MONTH'])
 for(const sellOrder of ['CASH_FIRST','RISK_FIRST','PRO_RATA'])
 for(const rebalance of ['NONE','ANNUAL','MONTHLY'])
 for(const cashPercent of [0,20,50,100])
 for(const adjusted of [false,true]){
  const r=f.simulateTwoAsset(random,0,20,3500000,14000,'usd',adjusted,timing,
      {cashPercent,sellOrder,rebalance});
  eq(r.remaining,3500000+r.investmentReturnTotal-r.total,'conservation');
  eq(r.totalDue,r.total+r.totalShortfall,'planned obligation');
  assert(r.rows.every(x=>x.value>=0&&x.cash_yen>=0&&x.risk_yen>=0&&x.withdrawn>=0&&x.shortfall>=0));
  assert.equal(r.rows.length,241);
  if(cashPercent===100&&rebalance==='NONE')eq(r.investmentReturnTotal,0,'100% cash has zero market gain');
  audited++;
 }
assert.equal(audited,144);
const roll=f.rollingTwoAsset(random,30,3000000,10000,'usd',true,'END_OF_MONTH',base);
assert.equal(roll.length,13);
const broke=random.map(x=>({...x}));broke[1].month='1980-04';
assert.throws(()=>f.simulateTwoAsset(broke,0,1,1000,100,'usd',false,'END_OF_MONTH',base),/連続/);
for(const bad of [{cashPercent:-1,sellOrder:'CASH_FIRST',rebalance:'NONE'},
 {cashPercent:101,sellOrder:'CASH_FIRST',rebalance:'NONE'},
 {cashPercent:20,sellOrder:'ILLEGAL',rebalance:'NONE'},
 {cashPercent:20,sellOrder:'CASH_FIRST',rebalance:'EVERY_DAY'}]){
 assert.throws(()=>f.simulateTwoAsset(flat,0,1,1000,100,'usd',false,'END_OF_MONTH',bad));
}
console.log('PASS two-asset: 576 single-asset parity cases, 144 multi-asset audit cases; cash buffer, three sell orders, three rebalance schedules, CPI, shortage and input failures');
