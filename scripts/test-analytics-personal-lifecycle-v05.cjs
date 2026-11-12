#!/usr/bin/env node
'use strict';
// Entirely synthetic independent QA for Personal Lab v0.5 lifecycle cashflows.
// No published market prices, private keys, official TR values or network calls.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('research/analytics/personal-lab/index.html','utf8');
assert(html.includes('PERSONAL RESEARCH LAB · v0.5'));
assert(html.includes('salaryMonthly')&&html.includes('pensionMonthly')&&html.includes('eventAmount'));
assert(html.includes('one_time_expense_shortfall_yen'), 'CSV must retain event shortage');
assert(html.includes('connect-src \'none\''), 'private offline gate');
const script=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert(script);new vm.Script(script);
const start=script.indexOf('const $='),end=script.indexOf('function setOptions(){');
assert(start>=0&&end>start);
const ctx=vm.createContext({Intl,Map,Set,Math,Number,Date,String,Array,document:{getElementById:()=>({})}});
new vm.Script(script.slice(start,end)+
 '\n globalThis.fns={addMonths,simulateTwoAsset,rollingTwoAsset,validatePersonalLifecycle};').runInContext(ctx);
const f=ctx.fns;
const close=(a,b,msg)=>assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=Math.max(1e-5,Math.abs(b)*1e-10),
 msg+': actual '+a+' expected '+b);
function history(n=373,returnMonthly=0,inflationMonthly=0){
 let fx=100,cpi=100;
 return Array.from({length:n},(_,i)=>{
   if(i>0){fx*=1+returnMonthly;cpi*=1+inflationMonthly;}
   return {month:f.addMonths('1980-01',i),fx,cpi,gold:fx};
 });
}
const base={cashPercent:20,sellOrder:'CASH_FIRST',rebalance:'NONE',monthlyContribution:100};
const lifecycle={
 salary:{monthly:100,start:0,end:6},
 pension:{monthly:50,start:6,end:12},
 events:[{id:'extra-income',at:2,kind:'INCOME',amount:500},
         {id:'repair',at:3,kind:'EXPENSE',amount:300}]
};
const flat=history();
for(const timing of ['BEGINNING_OF_MONTH','END_OF_MONTH']){
 const r=f.simulateTwoAsset(flat,0,1,1000,0,'usd',false,timing,{...base,lifecycle});
 assert.equal(r.totalContributed,1200);
 assert.equal(r.totalSalaryIncome,600);
 assert.equal(r.totalPensionIncome,300);
 assert.equal(r.totalEventIncome,500);
 assert.equal(r.totalEventExpenseDue,300);
 assert.equal(r.totalEventExpensePaid,300);
 assert.equal(r.totalEventExpenseShortfall,0);
 assert.equal(r.externalIncome,2600);
 assert.equal(r.total,300);
 close(r.remaining,3300,'1000 + 2600 - 300');
 assert.equal(r.rows[0].salary_income_yen,100);
 assert.equal(r.rows[2].one_time_income_yen,500);
 assert.equal(r.rows[3].one_time_expense_paid_yen,300);
 assert.equal(r.rows[6].salary_income_yen,0);
 assert.equal(r.rows[6].pension_income_yen,50);
 assert.equal(r.rows[12].pension_income_yen,0);
 assert.equal(r.rows.at(-1).contribution_yen,0);
 assert.equal(r.rows.length,13);
}
const broke=f.simulateTwoAsset(flat,0,1,100,0,'usd',false,'BEGINNING_OF_MONTH',{
 cashPercent:100,sellOrder:'CASH_FIRST',rebalance:'NONE',
 lifecycle:{events:[{id:'large-repair',at:0,kind:'EXPENSE',amount:500},
                    {id:'late-income',at:1,kind:'INCOME',amount:1000}]}
});
assert.equal(broke.totalEventExpensePaid,100);
assert.equal(broke.totalEventExpenseShortfall,400);
assert.equal(broke.firstShortfallMonth,'1980-01');
assert.equal(broke.depletedMonth,'1980-01');
assert.equal(broke.rows[1].value,1000,'Later earned income can replenish zero balance; missed expense still recorded');
assert.equal(broke.covered,false);
close(broke.remaining,1000,'recovery not retroactive payment');
const one=f.simulateTwoAsset(flat,5,1,1000,0,'usd',false,'END_OF_MONTH',{...base,lifecycle});
assert.equal(one.rows[2].one_time_income_yen,500,'Relative offsets reanchor per rolling start');
assert.equal(one.rows[2].month,'1980-08');
const rolls=f.rollingTwoAsset(flat,30,1_000_000,0,'usd',false,'END_OF_MONTH',{...base,lifecycle});
assert.equal(rolls.length,13);
assert(rolls.every(r=>r.totalContributed===360*100),'contribution schedule per rolling window');
assert(rolls.every(r=>r.totalSalaryIncome===600&&r.totalPensionIncome===300));
let audited=0;
for(const timing of ['BEGINNING_OF_MONTH','END_OF_MONTH'])
for(const adjust of [false,true])
for(const sellOrder of ['CASH_FIRST','RISK_FIRST','PRO_RATA'])
for(const rebalance of ['NONE','ANNUAL','MONTHLY'])
for(const cashPercent of [0,20,50,100])
for(const eventKind of ['NONE','INCOME','EXPENSE'])
for(const withSalaryPension of [false,true]){
 const events=eventKind==='NONE'?[]:[{id:'event',at:84,kind:eventKind,amount:30000}];
 const life={
  salary:{monthly:withSalaryPension?8000:0,start:0,end:120},
  pension:{monthly:withSalaryPension?12000:0,start:120,end:240},events};
 const r=f.simulateTwoAsset(history(373,.002,.001),0,20,2000000,15000,'usd',adjust,timing,{
  cashPercent,sellOrder,rebalance,monthlyContribution:20000,lifecycle:life});
 close(r.remaining,2000000+r.externalIncome+r.investmentReturnTotal-r.total,'portfolio capital conservation');
 close(r.totalDue,r.total+r.totalShortfall,'planned obligations conservation');
 close(r.totalEventExpenseDue,r.totalEventExpensePaid+r.totalEventExpenseShortfall,'event expense conservation');
 close(r.totalContributed,4_800_000,'regular deposits');
 close(r.totalSalaryIncome,withSalaryPension?960000:0,'salary window');
 close(r.totalPensionIncome,withSalaryPension?1440000:0,'pension window');
 assert(r.rows.every(row=>row.cash_yen>=0&&row.risk_yen>=0&&row.value>=0&&row.withdrawn>=0&&row.shortfall>=0));
 assert.equal(r.rows.length,241);
 assert.equal(r.rows.at(-1).salary_income_yen,0);
 audited++;
}
assert.equal(audited,432);
// Zero-income lifestyle must be exactly the previous v0.4 computation.
const previous={cashPercent:35,sellOrder:'PRO_RATA',rebalance:'ANNUAL',monthlyContribution:12000};
const zeroLife={
 salary:{monthly:0,start:0,end:120},
 pension:{monthly:0,start:120,end:360},events:[]
};
for(const timing of ['BEGINNING_OF_MONTH','END_OF_MONTH']){
 const a=f.simulateTwoAsset(history(373,.005,.001),0,30,5000000,10000,'usd',true,timing,previous);
 const b=f.simulateTwoAsset(history(373,.005,.001),0,30,5000000,10000,'usd',true,timing,
   {...previous,lifecycle:zeroLife});
 for(const k of ['remaining','cash','risk','total','totalDue','totalShortfall','totalContributed','investmentReturnTotal','rebalanceTurnover'])
  assert.equal(a[k],b[k],'Zero lifecycle backward parity '+k);
 for(let i=0;i<a.rows.length;i++)
  for(const k of ['value','cash_yen','risk_yen','withdrawn','due','shortfall','investment_return','rebalance_yen','contribution_yen'])
    assert.equal(a.rows[i][k],b.rows[i][k],'Zero lifecycle monthly ledger parity '+i+' '+k);
}
const good={salary:{monthly:0,start:0,end:0},pension:{monthly:0,start:0,end:0},events:[]};
for(const [bad,pattern] of [
 [{salary:{monthly:-1,start:0,end:2}},/整数円/],
 [{salary:{monthly:1,start:2,end:1}},/終了/],
 [{pension:{monthly:12.5,start:0,end:2}},/整数円/],
 [{salary:{monthly:100,start:0,end:0}},/終了/],
 [{events:[{id:'e1',at:-1,kind:'EXPENSE',amount:2}]},/経過月/],
 [{events:[{id:'e1',at:4,kind:'TRANSFER',amount:2}]},/種別/],
 [{events:[{id:'e1',at:4,kind:'EXPENSE',amount:-2}]},/整数円/],
 [{events:[{id:'e1',at:4,kind:'EXPENSE',amount:2},{id:'e1',at:4,kind:'INCOME',amount:2}]},/重複/],
 [{unsupported_tax_rate:.1},/未対応/]
]){
 assert.throws(()=>f.validatePersonalLifecycle(bad),pattern);
}
assert.equal(f.validatePersonalLifecycle(good).events.length,0);
console.log('PASS personal v0.5 lifecycle: 432 synthetic portfolio invariant combinations, salary/pension month cutoffs, two event types, recovery after shortfall, relative rolling reanchor, v0.4 zero-lifecycle exact monthly parity, invalid inputs');
