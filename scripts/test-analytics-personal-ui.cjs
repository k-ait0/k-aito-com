#!/usr/bin/env node
'use strict';
// No licensed data. Verify source is a self-contained network-disabled HTML
// and execute the exact embedded math/CSV parser against deterministic fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('research/analytics/personal-lab/index.html','utf8');
assert.match(html,/<meta http-equiv="Content-Security-Policy"/);
for(const check of ["default-src 'none'","connect-src 'none'","object-src 'none'","外部送信しません","SYNTHETIC","PUBLISHED_LEVEL_STATUS_UNVERIFIED","id=\"fileFx\"","id=\"fileCpi\"","id=\"fileGold\""])
 assert(html.includes(check),'Expected: '+check);
assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+href=|\bfetch\s*\(|\bXMLHttpRequest\s*\(|\bsendBeacon\s*\(/i);
const match=/<script>\s*([\s\S]*?)\s*<\/script>/.exec(html);assert(match);
new vm.Script(match[1]);
const first=match[1].indexOf('const $='),last=match[1].indexOf('function setOptions(){');
assert(first>=0&&last>first);
const ctx=vm.createContext({Intl,Map,Set,Math,Number,Date,String,Array,document:{getElementById:()=>({})}});
new vm.Script(match[1].slice(first,last)+'\n globalThis.fns={csvRows,checkRows,mergeSeries,addMonths,demo,powerRows,rollingPower,powerSummary,simulateWithdrawal,rollingWithdraw};').runInContext(ctx);
const f=ctx.fns;
const fixture=f.demo(),joined=f.mergeSeries(fixture.fx,fixture.cpi,fixture.gold);
assert.equal(joined.length,669);assert.equal(joined[0].month,'1971-01');assert.equal(joined.at(-1).month,'2026-09');
const real=f.powerRows(joined,'usd',true);
assert.equal(real[0].value,100);assert.equal(f.rollingPower(real,10).length,549);assert.equal(f.rollingPower(real,20).length,429);assert.equal(f.rollingPower(real,30).length,309);
assert(f.powerRows(joined,'jpy',false).every(x=>x.value===100));
const sha='a'.repeat(64);
const csv=[
 'month,series_id,value,unit,currency,series_kind,origin,source_id,seasonal_adjustment,raw_response_sha256,footnote_codes',
 '2000-01,FED_H10_USDJPY_MONTH_END,100,JPY_PER_USD,JPY,FX_RATE,OBSERVED,FED_BOARD,NOT_APPLICABLE,'+sha+',',
 '2000-02,FED_H10_USDJPY_MONTH_END,110,JPY_PER_USD,JPY,FX_RATE,OBSERVED,FED_BOARD,NOT_APPLICABLE,'+sha+','
].join('\n');
assert.equal(f.checkRows(csv,'fx').map.get('2000-02'),110);
assert.throws(()=>f.checkRows(csv.replace('2000-02','2000-01'),'fx'),/重複/);
assert.throws(()=>f.checkRows(csv.replace('2000-02','2000-03'),'fx'),/欠損/);
assert.throws(()=>f.checkRows(csv.replaceAll('OBSERVED','PUBLISHED_LEVEL_STATUS_UNVERIFIED'),'fx'),/origin/);
assert.equal(f.csvRows('x,y\n"a,b","c""d"\n')[1][0],'a,b');
const sample=Array.from({length:14},(_,i)=>({month:f.addMonths('2000-01',i),fx:100,cpi:100,gold:100}));
const ruin=f.simulateWithdrawal(sample,0,1,1000,100,'jpy',false);
assert.equal(ruin.ruinMonth,'2000-12');assert.equal(ruin.depletedMonth,'2000-11');assert.equal(ruin.remaining,0);assert.equal(ruin.total,1000);assert.equal(ruin.totalShortfall,200);
const survive=f.simulateWithdrawal(sample,0,1,3000,100,'jpy',false);
assert.equal(survive.remaining,1800);assert.equal(survive.ruinMonth,null);assert(survive.covered);
assert.equal(f.rollingWithdraw(sample,1,3000,100,'jpy',false).length,2);

const exact=f.simulateWithdrawal(sample,0,1,1200,100,'jpy',false);
assert.equal(exact.covered,true);assert.equal(exact.totalShortfall,0);assert.equal(exact.depletedMonth,'2001-01');
assert.equal(exact.ruinMonth,null);assert.equal(exact.remaining,0);
const noDue=f.simulateWithdrawal(sample,0,1,1000,0,'jpy',false);
assert.equal(noDue.covered,true);assert.equal(noDue.ruinMonth,null);assert.equal(noDue.totalShortfall,0);
const begin=f.simulateWithdrawal(sample,0,1,1000,100,'jpy',false,'BEGINNING_OF_MONTH');
assert.equal(begin.rows.length,13);assert.equal(begin.rows[0].withdrawn,100);
assert.equal(begin.rows.at(-1).withdrawn,0);assert.equal(begin.total,1000);
assert.equal(begin.depletedMonth,'2000-10');assert.equal(begin.firstShortfallMonth,'2000-11');
assert.equal(begin.totalShortfall,200);
assert.equal(f.rollingWithdraw(sample,1,1200,100,'jpy',false).every(x=>x.covered),true);
assert.equal(f.rollingWithdraw(sample,1,1000,100,'jpy',false,'BEGINNING_OF_MONTH').every(x=>!x.covered),true);
const infl=sample.map((r,i)=>({...r,cpi:100+i*10}));
const ci=f.simulateWithdrawal(infl,0,1,100000,100,'jpy',true,'END_OF_MONTH');
assert(Math.abs(ci.rows[1].due-110)<1e-9);
const ciBegin=f.simulateWithdrawal(infl,0,1,100000,100,'jpy',true,'BEGINNING_OF_MONTH');
assert.equal(ciBegin.rows[0].due,100);assert.equal(ciBegin.rows.at(-1).due,0);
assert(ci.totalDue>ciBegin.totalDue);
const growth=sample.map((r,i)=>({...r,fx:i===0?100:200}));
const endG=f.simulateWithdrawal(growth,0,1,1000,100,'usd',false,'END_OF_MONTH');
const beginG=f.simulateWithdrawal(growth,0,1,1000,100,'usd',false,'BEGINNING_OF_MONTH');
assert.equal(endG.total,1200);assert.equal(endG.remaining,800);
assert.equal(beginG.total,1200);assert.equal(beginG.remaining,600);
for(const q of [endG,beginG,ci,ciBegin,exact,ruin]){
  const delta=q.rows.reduce((n,x)=>n+x.investment_return,0);
  assert(Math.abs(q.remaining-(q.rows[0].value+q.rows[0].withdrawn+delta-q.total))<1e-5);
  assert(q.rows.every(x=>x.value>=0&&x.shortfall>=0&&x.withdrawn>=0));
}
const broken=sample.map(x=>({...x}));broken[2].month='2000-05';
assert.throws(()=>f.simulateWithdrawal(broken,0,1,1000,100,'jpy',false),/連続/);
assert.throws(()=>f.simulateWithdrawal(sample,0,1,1000,100,'jpy',false,'WEEKLY'),/時点/);
assert.equal(f.rollingWithdraw(joined,30,30000000,100000,'jpy',false).length,309);

console.log('PASS personal-ui: CSP/network isolation, no remote assets, canonical parser, 669-month demo, 10/20/30y windows, monthly BEGIN/END timing, exact zero/full pay, shortfalls, ledger identity, fail-on-gap/origin');
