'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {compareRollingLifecyclePlans}=require('../lib/analytics/rolling-plan-compare.cjs');
const {makeSyntheticFlatPath}=require('../lib/analytics/cashflow-core.cjs');
const market=makeSyntheticFlatPath({start_month:'2000-01',months:5,monthly_return:0}).map(x=>({...x,origin:'OBSERVED'}));
const base={id:'base',initial_assets_yen:1000,monthly_withdrawal_yen:100};
const pension={id:'pension',initial_assets_yen:1000,monthly_withdrawal_yen:100,
 relative_pension_schedule:[{id:'p',start_offset_months:1,monthly_yen:80}]};
const compare=(options={})=>compareRollingLifecyclePlans({monthly_returns:market,horizon_months:3,plans:[base,pension],...options});
test('compares life plan outcomes on exactly same market windows',()=>{
 const x=compare();assert.equal(x.complete_windows,3);
 assert.equal(x.windows[0].scenarios[0].ending_assets_yen,700);
 assert.equal(x.windows[0].scenarios[1].ending_assets_yen,860);
 assert.deepEqual(x.windows.map(w=>w.scenarios[1].delta_ending_assets_vs_baseline_yen),[160,160,160]);
});
test('custom baseline flips deltas',()=>{
 const x=compare({baseline_id:'pension'});
 assert.equal(x.windows[0].scenarios[0].delta_ending_assets_vs_baseline_yen,-160);
 assert.equal(x.windows[0].scenarios[1].delta_ending_assets_vs_baseline_yen,0);
});
test('funded fraction is historical only, production remains unapproved',()=>{
 const x=compare();assert.equal(x.future_probability_claim,false);
 assert.equal(x.publication_approved,false);
 assert.equal(x.summary[0].historical_funded_fraction,1);
});
test('relative plan can turn historical failure into funded scenario',()=>{
 const x=compare({plans:[{id:'base',initial_assets_yen:50,monthly_withdrawal_yen:100},
   {id:'pension',initial_assets_yen:50,monthly_withdrawal_yen:100,relative_pension_schedule:[{id:'p',start_offset_months:0,monthly_yen:100}]}]});
 assert.equal(x.summary[0].funded_windows,0);
 assert.equal(x.summary[1].funded_windows,3);
 assert.equal(x.summary[1].delta_funded_windows_vs_baseline,3);
});
test('no complete windows gives null, zero windows, no probability claim',()=>{
 const x=compare({horizon_months:6});
 assert.equal(x.complete_windows,0);assert.equal(x.summary[0].historical_funded_fraction,null);
 assert.equal(x.windows.length,0);
});
test('gaps shared across plan comparison, not counted as failure',()=>{
 const short=[market[0],market[1],market[3],market[4]];
 const x=compare({monthly_returns:short,horizon_months:2});
 assert.equal(x.complete_windows,2);assert.equal(x.excluded_windows_due_to_missing_months,2);
});
test('mixed source origin rejected across comparison',()=>{
 const bad=[...market];bad[0]={...bad[0],origin:'SYNTHETIC'};
 assert.throws(()=>compare({monthly_returns:bad}),/Mixed/);
});
test('duplicate identifiers rejected',()=>assert.throws(()=>compare({plans:[base,base]}),/Duplicate plan id/));
test('unrecognized plan keys cannot silently change assumptions',()=>assert.throws(()=>compare({plans:[base,{...pension,service_fee_yen:100}]}),/Unsupported plan field/));
test('max eight plans and 2 min enforced',()=>{
 assert.throws(()=>compare({plans:[base]}),/2..8/);
 assert.throws(()=>compare({plans:Array.from({length:9},(_,i)=>({...base,id:'plan'+i}))}),/2..8/);
});
test('invalid baseline rejected',()=>assert.throws(()=>compare({baseline_id:'missing'}),/Unknown baseline_id/));
test('all 8 scenario plans can be evaluated',()=>{
 const x=compare({plans:Array.from({length:8},(_,i)=>({...base,id:'plan'+i,monthly_withdrawal_yen:100-i*5}))});
 assert.equal(x.summary.length,8);assert.equal(x.windows[1].scenarios.length,8);
});