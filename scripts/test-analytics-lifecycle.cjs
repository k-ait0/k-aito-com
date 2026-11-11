'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {simulateLifecycleCashflow}=require('../lib/analytics/lifecycle-core.cjs');
const {simulateMonthlyCashflow,makeSyntheticFlatPath}=require('../lib/analytics/cashflow-core.cjs');
const {compareScenarios}=require('../lib/analytics/scenario-compare.cjs');
const path=(months=3,r=0)=>makeSyntheticFlatPath({start_month:'2026-01',months,monthly_return:r});
const base={initial_assets_yen:1000,monthly_withdrawal_yen:100,monthly_returns:path()};
const run=(opt={})=>simulateLifecycleCashflow({...base,...opt});
test('without events matches v0.1 cashflow core exactly',()=>{
 const a=run(),b=simulateMonthlyCashflow(base);
 assert.equal(a.ending_assets_yen,b.ending_assets_yen);
 assert.deepEqual(a.rows.map(x=>x.closing_yen),b.rows.map(x=>x.closing_yen));
});
test('pension begins and ends on inclusive months',()=>{
 const x=run({pension_schedule:[{id:'p1',start_month:'2026-02',end_month:'2026-02',monthly_yen:80}]});
 assert.deepEqual(x.rows.map(r=>r.pension_income_yen),[0,80,0]);assert.equal(x.ending_assets_yen,780);
});
test('pension surplus accumulates',()=>{
 const x=run({initial_assets_yen:0,pension_schedule:[{id:'p',start_month:'2026-01',monthly_yen:150}]});
 assert.equal(x.ending_assets_yen,150);assert.equal(x.status,'FUNDED');
});
test('one time income is added before expenses',()=>{
 const x=run({one_time_events:[{id:'b',month:'2026-01',kind:'INCOME',amount_yen:500}]});
 assert.equal(x.rows[0].closing_yen,1400);assert.equal(x.ending_assets_yen,1200);
});
test('one time expense included in requested withdrawal',()=>{
 const x=run({one_time_events:[{id:'repair',month:'2026-02',kind:'EXPENSE',amount_yen:250}]});
 assert.equal(x.rows[1].requested_withdrawal_yen,350);assert.equal(x.ending_assets_yen,450);
});
test('income and expense events same month net before return',()=>{
 const x=run({one_time_events:[{id:'in',month:'2026-01',kind:'INCOME',amount_yen:25},{id:'out',month:'2026-01',kind:'EXPENSE',amount_yen:75}]});
 assert.equal(x.rows[0].closing_yen,850);
});
test('shortfall tracked when extraordinary expense exceeds assets',()=>{
 const x=run({initial_assets_yen:50,one_time_events:[{id:'bill',month:'2026-01',kind:'EXPENSE',amount_yen:150}]});
 assert.equal(x.first_shortfall_month,'2026-01');assert.equal(x.rows[0].unfunded_yen,200);
 assert.equal(x.ending_assets_yen,0);
});
test('inflation first month is unchanged, year 2 is exactly 10 percent',()=>{
 const x=run({monthly_returns:path(13),annual_expense_inflation:0.10});
 assert.equal(x.rows[0].living_expense_yen,100);assert.equal(x.rows[12].living_expense_yen,110);
});
test('negative inflation is explicit deflation',()=>{
 const x=run({monthly_returns:path(13),annual_expense_inflation:-0.1});
 assert.equal(x.rows[12].living_expense_yen,90);
});
test('pension stays fixed nominal while expenses inflate',()=>{
 const x=run({monthly_returns:path(13),annual_expense_inflation:0.1,pension_schedule:[{id:'p',start_month:'2026-01',monthly_yen:100}]});
 assert.equal(x.rows[12].pension_income_yen,100);assert.equal(x.rows[12].living_expense_yen,110);
});
test('recovery after insolvency is allowed when pension starts later',()=>{
 const x=run({initial_assets_yen:0,pension_schedule:[{id:'p',start_month:'2026-02',monthly_yen:200}]});
 assert.deepEqual(x.rows.map(r=>r.closing_yen),[0,100,200]);
 assert.equal(x.first_shortfall_month,'2026-01');assert.equal(x.status,'SHORTFALL');
});
test('pension schedule outside analyzed months fails',()=>assert.throws(()=>run({pension_schedule:[{id:'p',start_month:'2027-01',monthly_yen:2}]}),/does not overlap/));
test('pension end before start fails',()=>assert.throws(()=>run({pension_schedule:[{id:'p',start_month:'2026-02',end_month:'2026-01',monthly_yen:2}]}),/before start/));
test('duplicate pension identifiers fail',()=>assert.throws(()=>run({pension_schedule:[{id:'p',start_month:'2026-01',monthly_yen:2},{id:'p',start_month:'2026-02',monthly_yen:2}]}),/Duplicate pension/));
test('duplicate event identifiers fail',()=>assert.throws(()=>run({one_time_events:[{id:'x',month:'2026-01',kind:'INCOME',amount_yen:20},{id:'x',month:'2026-02',kind:'EXPENSE',amount_yen:2}]}),/Duplicate event/));
test('outside-calendar one-time events fail',()=>assert.throws(()=>run({one_time_events:[{id:'e',month:'2027-01',kind:'EXPENSE',amount_yen:2}]}),/outside simulation/));
test('event amount must be nonnegative integer',()=>assert.throws(()=>run({one_time_events:[{id:'e',month:'2026-01',kind:'EXPENSE',amount_yen:-1}]}),/safe integer/));
test('invalid and unbounded inflation rejected',()=>{
 for(const n of [-0.6,1.1,NaN,Infinity,'0.03'])assert.throws(()=>run({annual_expense_inflation:n}),/annual_expense_inflation/);
});
test('overflow from pension and events is rejected',()=>assert.throws(()=>run({initial_assets_yen:Number.MAX_SAFE_INTEGER,pension_schedule:[{id:'p',start_month:'2026-01',monthly_yen:100}]}),/Unsafe monetary/));
test('comparison incorporates pension schedule and cashflow effects',()=>{
 const x=compareScenarios({scenarios:[{id:'base',...base},{id:'pension',...base,pension_schedule:[{id:'p',start_month:'2026-02',monthly_yen:80}]}]});
 assert.equal(x.summary[1].ending_assets_yen,860);assert.equal(x.summary[1].delta_vs_baseline.ending_assets_yen,160);
});
test('comparison incorporates inflation assumption and identifies cashflow differences',()=>{
 const x=compareScenarios({scenarios:[{id:'a',...base,monthly_returns:path(13)},{id:'b',...base,monthly_returns:path(13),annual_expense_inflation:0.1}]});
 assert.equal(x.attribution,'CASHFLOW_INPUT_DIFFERENCES');
 assert.ok(x.summary[1].ending_assets_yen<=x.summary[0].ending_assets_yen);
});
test('unsupported tax or financial input must not be silently ignored',()=>assert.throws(()=>compareScenarios({scenarios:[{id:'a',...base},{id:'b',...base,tax_rate:0.2}]}),/Unsupported scenario input: tax_rate/));
test('malformed pension schedule and event list cannot be silently skipped',()=>{
 assert.throws(()=>run({pension_schedule:null}),/pension_schedule must be an array/);
 assert.throws(()=>run({one_time_events:{}}),/one_time_events must be an array/);
});
test('mixed origin still rejected for advanced comparisons',()=>{
 const observed=path().map(r=>({...r,origin:'OBSERVED'}));
 assert.throws(()=>compareScenarios({scenarios:[{id:'a',...base},{id:'b',...base,monthly_returns:observed,provenance:'OBSERVED',annual_expense_inflation:0.1}]}),/Mixed market provenance/);
});

test('lifecycle direct API rejects unsupported tax assumptions',()=>assert.throws(()=>run({tax_rate:0.15}),/Unsupported lifecycle input/));
test('new cashflow retains ledger conservation in synthetic random paths',()=>{
 for(let seed=1;seed<=100;seed++){
   const r=(seed*131%19)/100-0.09;
   const initial=seed*115,monthly=seed%17*13,pension=(seed%7)*20;
   const result=run({initial_assets_yen:initial,monthly_withdrawal_yen:monthly,monthly_returns:path(12,r),pension_schedule:[{id:'p',start_month:'2026-01',monthly_yen:pension}]});
   for(const line of result.rows){
     assert.equal(line.opening_yen+line.contribution_yen+line.pension_income_yen+line.one_time_income_yen, line.requested_withdrawal_yen-line.unfunded_yen+line.invested_before_return_yen);
     assert.equal(line.closing_yen-line.invested_before_return_yen,line.investment_gain_yen);
   }
 }
});
