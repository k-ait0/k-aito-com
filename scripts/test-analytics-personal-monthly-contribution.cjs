#!/usr/bin/env node
'use strict';
/** Personal v0.4 synthetic cashflow QA. Never include any licensed market observations. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('research/analytics/personal-lab/index.html','utf8');
assert(html.includes('PERSONAL RESEARCH LAB · v0.5'));
assert(html.includes('id="monthlyContribution"'));
assert(html.includes('monthly_contribution_yen'));
assert(html.includes("'cashPercent','monthlyContribution','sellOrder'"),'New input must trigger render');
const source=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert(source,'embedded app script');
new vm.Script(source);
const end=source.indexOf('function setOptions(){'),first=source.indexOf('const $=');
assert(end>first);
const cx=vm.createContext({Map,Set,Math,Number,Date,String,Array,Intl,document:{getElementById:()=>({})}});
new vm.Script(source.slice(first,end)+'\n globalThis.fns={addMonths,simulateTwoAsset,rollingTwoAsset,simulateWithdrawal};').runInContext(cx);
const f=cx.fns;
const close=(a,b,message)=>assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=Math.max(1e-5,Math.abs(b)*1e-10),message+': '+a+' != '+b);
function input(rate=1.0,months=373){
 let fx=100,cpi=100;
 const out=[];
 for(let i=0;i<months;i++){
   if(i){fx*=rate;cpi*=1.001;}
   out.push({month:f.addMonths('1980-01',i),fx,cpi,gold:fx});
 }
 return out;
}
const defaults={cashPercent:20,sellOrder:'CASH_FIRST',rebalance:'NONE'};
const flat=input();
const twelve=f.simulateTwoAsset(flat,0,1,1000,0,'usd',false,'END_OF_MONTH',
 {...defaults,cashPercent:50,monthlyContribution:100});
assert.equal(twelve.totalContributed,1200);
assert.equal(twelve.rows.length,13);
close(twelve.remaining,2200,'1000 initial + 12 x 100 deposits');
assert.equal(twelve.rows[0].contribution_yen,100);
assert.equal(twelve.rows[11].contribution_yen,100);
assert.equal(twelve.rows[12].contribution_yen,0);
close(twelve.cash,1100,'50% cash');
close(twelve.risk,1100,'50% risky');
assert(twelve.rows.every(x=>x.cash_yen>=0&&x.risk_yen>=0));
for(const timing of ['BEGINNING_OF_MONTH','END_OF_MONTH']){
  const v=f.simulateTwoAsset(flat,0,1,100,100,'usd',false,timing,
    {...defaults,monthlyContribution:100});
  assert.equal(v.totalContributed,1200);
  assert.equal(v.totalShortfall,0);
  assert.equal(v.total,1200);
  close(v.remaining,100,'same months contribution and withdrawal');
  assert.equal(v.withdrawalCount,12);
  const short=f.simulateTwoAsset(flat,0,1,100,150,'usd',false,timing,
    {...defaults,monthlyContribution:100});
  close(short.remaining,0,'shortened outstanding balance');
  assert(short.totalShortfall>0);
}
const single=f.simulateTwoAsset(flat,0,1,1000,60,'usd',false,'END_OF_MONTH',defaults);
const explicitZero=f.simulateTwoAsset(flat,0,1,1000,60,'usd',false,'END_OF_MONTH',{...defaults,monthlyContribution:0});
for(const metric of ['remaining','cash','risk','total','totalShortfall','investmentReturnTotal','rebalanceTurnover','firstShortfallMonth'])
 assert.equal(explicitZero[metric],single[metric],metric);
let audited=0;
for(const timing of ['BEGINNING_OF_MONTH','END_OF_MONTH'])
for(const adjustment of [false,true])
for(const sellOrder of ['CASH_FIRST','RISK_FIRST','PRO_RATA'])
for(const rebalance of ['NONE','ANNUAL','MONTHLY'])
for(const cashPercent of [0,15,50,100])
for(const contribution of [0,10000,75000]){
 const x=f.simulateTwoAsset(input(1.003),0,20,1_000_000,18000,'usd',adjustment,timing,
  {cashPercent,sellOrder,rebalance,monthlyContribution:contribution});
 const expectedContributions=20*12*contribution;
 close(x.totalContributed,expectedContributions,'total contribution');
 close(x.remaining,1_000_000+expectedContributions+x.investmentReturnTotal-x.total,'conservation');
 close(x.totalDue,x.total+x.totalShortfall,'planned vs funded');
 assert(x.rows.every(y=>y.value>=0&&y.shortfall>=0&&y.withdrawn>=0&&y.contribution_yen>=0));
 close(x.rows.reduce((s,y)=>s+y.contribution_yen,0),expectedContributions,'sum monthly deposits');
 assert.equal(x.rows.at(-1).contribution_yen,0,'never deposit after final market period');
 if(cashPercent===100&&rebalance==='NONE')close(x.investmentReturnTotal,0,'all cash yield zero');
 audited++;
}
assert.equal(audited,432);
const roll=f.rollingTwoAsset(input(1.002),30,2_000_000,10000,'usd',true,'END_OF_MONTH',
 {...defaults,monthlyContribution:10000});
assert.equal(roll.length,13);
assert(roll.every(x=>x.totalContributed===3600000));
for(const invalid of [-1,Number.POSITIVE_INFINITY,Number.NaN,100000001,'12']){
 assert.throws(()=>f.simulateTwoAsset(flat,0,1,1000,10,'usd',false,'END_OF_MONTH',
   {...defaults,monthlyContribution:invalid}),/積立額/);
}
console.log('PASS personal v0.4: 432 two-asset contribution/cashflow conservation cases, 12-month timing, zero-contribution backward parity, rolling 30Y, invalid inputs');
