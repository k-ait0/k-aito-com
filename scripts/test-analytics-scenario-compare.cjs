'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {compareScenarios}=require('../lib/analytics/scenario-compare.cjs');
const {makeSyntheticFlatPath}=require('../lib/analytics/cashflow-core.cjs');
const synthetic=(months=2,r=0)=>makeSyntheticFlatPath({start_month:'2026-01',months,monthly_return:r});
const scenario=(id,{initial=1000,withdrawal=100,contribution=0,returns=synthetic(),provenance='SYNTHETIC',label}={})=>({
 id,label,initial_assets_yen:initial,monthly_withdrawal_yen:withdrawal,monthly_contribution_yen:contribution,
 monthly_returns:returns,provenance
});
const compare=(other,base=scenario('base'),opts={})=>compareScenarios({scenarios:[base,other],baseline_id:'base',...opts});
test('identical scenarios have zero delta',()=>{
 const r=compare(scenario('twin'));
 assert.equal(r.summary[1].delta_vs_baseline.ending_assets_yen,0);
 assert.equal(r.timeline[0].scenarios[1].delta_closing_vs_baseline_yen,0);
 assert.equal(r.same_market_path,true);
});
test('monthly cashflow differences yield correct signed deltas',()=>{
 const r=compare(scenario('half', {withdrawal:50}));
 assert.equal(r.summary[0].ending_assets_yen,800);
 assert.equal(r.summary[1].ending_assets_yen,900);
 assert.equal(r.summary[1].delta_vs_baseline.ending_assets_yen,100);
 assert.equal(r.summary[1].delta_vs_baseline.total_paid_withdrawal_yen,-100);
 assert.equal(r.timeline[1].scenarios[1].delta_closing_vs_baseline_yen,100);
});
test('baseline may be non-first scenario',()=>{
 const r=compareScenarios({scenarios:[scenario('a'),scenario('b',{withdrawal:50})],baseline_id:'b'});
 assert.equal(r.summary[0].delta_vs_baseline.ending_assets_yen,-100);
 assert.equal(r.summary[1].delta_vs_baseline.ending_assets_yen,0);
});
test('first scenario becomes default baseline',()=>{
 const r=compareScenarios({scenarios:[scenario('a'),scenario('b')]});
 assert.equal(r.baseline_id,'a');
});
test('shortfalls are compared separately from ending balances',()=>{
 const r=compare(scenario('poor',{initial:50}));
 assert.equal(r.summary[1].status,'SHORTFALL');
 assert.equal(r.summary[1].total_unfunded_yen,150);
 assert.equal(r.summary[1].delta_vs_baseline.total_unfunded_yen,150);
 assert.equal(r.summary[1].first_shortfall_month,'2026-01');
});
test('different return rates prohibited under controlled mode',()=>
 assert.throws(()=>compare(scenario('up',{returns:synthetic(2,.01)})),/CONTROLLED requires/));
test('stress mode allows different paths but forbids causal attribution',()=>{
 const r=compare(scenario('up',{returns:synthetic(2,.1)}),scenario('base'),{comparison_mode:'STRESS'});
 assert.equal(r.same_market_path,false);
 assert.equal(r.attribution,'MIXED_CASHFLOW_AND_MARKET_EFFECTS');
 assert.equal(r.summary[1].ending_assets_yen,979);
});
test('identical paths in stress mode remain attributable to cashflow inputs',()=>{
 const r=compare(scenario('up'),scenario('base'),{comparison_mode:'STRESS'});
 assert.equal(r.attribution,'CASHFLOW_INPUT_DIFFERENCES');
});
test('mixed observed and synthetic provenance rejected',()=>{
 const returns=synthetic().map(r=>({...r,origin:'OBSERVED'}));
 assert.throws(()=>compare(scenario('observed',{returns,provenance:'OBSERVED'})),/Mixed market provenance/);
});
test('scenario calendar mismatch rejected',()=>assert.throws(()=>compare(scenario('one',{returns:synthetic(1)})),/calendar mismatch/));
test('different starting month rejected even with same horizon',()=>{
 const different=makeSyntheticFlatPath({start_month:'2026-02',months:2,monthly_return:0});
 assert.throws(()=>compare(scenario('other',{returns:different})),/calendar mismatch/);
});
test('duplicate ids rejected',()=>assert.throws(()=>compareScenarios({scenarios:[scenario('x'),scenario('x')]}),/Duplicate scenario/));
test('unsafe ids are rejected',()=>{
 for(const id of ['__proto__','constructor','x a','a/'.repeat(25)])
  assert.throws(()=>compare(scenario(id)),/Invalid scenario id/);
});
test('missing baseline rejected',()=>assert.throws(()=>compare(scenario('x'),scenario('base'),{baseline_id:'missing'}),/Unknown baseline/));
test('invalid mode rejected',()=>assert.throws(()=>compare(scenario('x'),scenario('base'),{comparison_mode:'GUESS'}),/comparison_mode/));
test('two to eight scenarios required',()=>{
 assert.throws(()=>compareScenarios({scenarios:[scenario('only')]}),/2..8/);
 assert.throws(()=>compareScenarios({scenarios:Array.from({length:9},(_,i)=>scenario('x'+i))}),/2..8/);
});
test('invalid money inputs fail at shared core boundary',()=>assert.throws(()=>compare(scenario('bad',{initial:NaN})),/safe integer/));
test('research flags are always false for publication',()=>{
 const r=compare(scenario('other'));
 assert.equal(r.publication_approved,false);
 assert.equal(r.status,'RESEARCH_ONLY_HOLD');
});
test('label passed through, with length bound',()=>{
 const r=compare(scenario('other',{label:'月額を半減'}));
 assert.equal(r.summary[1].label,'月額を半減');
 assert.throws(()=>compare(scenario('other',{label:'a'.repeat(81)})),/Invalid scenario label/);
});
test('each case is independently simulated and no input mutation',()=>{
 const a=scenario('base'),b=scenario('b',{withdrawal:50});
 const before=JSON.stringify([a,b]);
 const r=compareScenarios({scenarios:[a,b]});
 assert.equal(JSON.stringify([a,b]),before);
 assert.equal(r.timeline.length,2);
});
