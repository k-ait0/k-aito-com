'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const V=require('../lib/analytics/cpi-published-vintages.cjs');
const {runRollingPortfolioCpiAsOf:run}=require('../lib/analytics/rolling-portfolio-cpi-asof.cjs');
const {monthSerial,formatMonth}=require('../lib/analytics/cashflow-core.cjs');
const portfolio={initial_holdings_yen:{STOCK:10000},target_weights:{STOCK:1},rebalance:{mode:'NONE'}};
const plan={monthly_withdrawal_yen:1000};
const market=(start='2026-01',n=3,rate=0,origin='SYNTHETIC')=>Array.from({length:n},(_,i)=>({month:formatMonth(monthSerial(start)+i),origin,asset_returns:{STOCK:rate}}));
const vintage=(id,published,levels,start='2025-11',patch={})=>({vintage_id:id,published_on:published,origin:'SYNTHETIC',source_id:'SYNTHETIC_FIXTURE',series_id:'JP_CPI_HEADLINE_2025_LINKED',series_kind:'CPI_LEVEL',unit:'INDEX_2025_100',seasonal_adjustment:'NSA',levels:levels.map((value,i)=>({month:formatMonth(monthSerial(start)+i),value})),...patch});
const vintages=()=>[
 vintage('v0','2025-12-15',[100]),
 vintage('v1','2026-01-15',[100,110]),
 vintage('v2','2026-02-15',[100,110,121]),
 vintage('v3','2026-03-15',[100,110,121,133.1])];
const args=(patch={})=>({monthly_market_returns:market(),cpi_vintage_snapshots:vintages(),horizon_months:3,portfolio,cashflow_plan:plan,market_mode:'SYNTHETIC_DEMO',...patch});
const failures=[
 ['invalid calendar day',()=>[vintage('bad','2025-02-30',[100])],/calendar date/],
 ['out-of-order vintage dates',()=>[vintages()[1],vintages()[0]],/strictly ordered/],
 ['duplicate vintage dates',()=>[vintages()[0],vintage('duplicate','2025-12-15',[100])],/strictly ordered/],
 ['duplicate vintage ID',()=>[vintages()[0],vintage('v0','2026-01-15',[100,110])],/duplicate vintage_id/],
 ['unknown snapshot field',()=>[vintage('v0','2025-12-15',[100],'2025-11',{proxy:'yes'})],/Unsupported vintage/],
 ['estimate marker',()=>[vintage('v0','2025-12-15',[100],'2025-11',{estimated:1})],/Unsupported vintage/],
 ['wrong CPI basket',()=>[vintage('v0','2025-12-15',[100],'2025-11',{series_id:'JP_CPI_EX_RENT_2025_LINKED'})],/basket/],
 ['wrong CPI basis',()=>[vintage('v0','2025-12-15',[100],'2025-11',{unit:'INDEX_2020_100'})],/base mismatch/],
 ['wrong origin',()=>[vintage('v0','2025-12-15',[100],'2025-11',{origin:'OBSERVED'})],/provenance/],
 ['missing CPI levels',()=>[vintage('v0','2025-12-15',[])],/vintage levels/],
 ['unsorted CPI levels',()=>[vintage('v0','2025-12-15',[100,110],'2025-10',{levels:[{month:'2025-11',value:100},{month:'2025-10',value:110}]})],/contiguous ascending/],
 ['CPI duplicate month',()=>[vintage('v0','2025-12-15',[100,110],'2025-10',{levels:[{month:'2025-10',value:100},{month:'2025-10',value:110}]})],/contiguous ascending/],
 ['CPI future monthly observation',()=>[vintage('v0','2025-12-15',[100,110],'2025-11')],/observation cannot be published/],
 ['unbounded CPI',()=>[vintage('v0','2025-12-15',[1e20])],/Unsafe vintage/],
 ['negative CPI',()=>[vintage('v0','2025-12-15',[-100])],/Unsafe vintage/],
 ['unknown CPI row field',()=>[vintage('v0','2025-12-15',[100],'2025-11',{levels:[{month:'2025-11',value:100,proxy:false}]})],/Unsupported vintage CPI row/]
];
test('calendar date validation includes leap years and rejects February 30',()=>{assert.equal(V.dateNumber('2024-02-29'),20240229);assert.equal(V.settlementDate('2024-02','MONTH_END'),'2024-02-29');assert.equal(V.settlementDate('2025-02','MONTH_END'),'2025-02-28');assert.throws(()=>V.dateNumber('2025-02-29'),/calendar date/);assert.throws(()=>V.dateNumber('2024-2-9'),/published_on/);});
test('settlement timing uses first/last calendar dates',()=>{assert.equal(V.settlementDate('2026-01','MONTH_START'),'2026-01-01');assert.equal(V.settlementDate('2026-01','MONTH_END'),'2026-01-31');});
test('publication on the exact settlement day is excluded conservatively',()=>{const ss=V.validateCpiVintageSnapshots([vintage('d','2025-12-15',[100])],'SYNTHETIC_DEMO').snapshots;assert.equal(V.latestReleasedBefore(ss,'2025-12-15'),null);assert.equal(V.latestReleasedBefore(ss,'2025-12-16').vintage_id,'d');});
test('strict release date picks latest historical snapshot, never future',()=>{const ss=V.validateCpiVintageSnapshots(vintages(),'SYNTHETIC_DEMO').snapshots;assert.equal(V.latestReleasedBefore(ss,'2026-01-01').vintage_id,'v0');assert.equal(V.latestReleasedBefore(ss,'2026-02-01').vintage_id,'v1');assert.equal(V.latestReleasedBefore(ss,'2026-04-01').vintage_id,'v3');});
test('month-start uses only published November, December, January levels across the three months',()=>{const r=run(args());assert.equal(r.complete_windows,1);assert.equal(r.windows[0].ending_assets_yen,6690);assert.equal(r.windows[0].final_living_expense_yen,1210);assert.equal(r.windows[0].baseline_cpi_observation_month,'2025-11');assert.equal(r.windows[0].last_used_cpi_observation_month,'2026-01');assert.equal(r.cpi_asof_policy,'PUBLISHED_VINTAGE_STRICT_PRIOR_CALENDAR_DAY');});
test('month-end benefits from released prior-month CPI and applies withdrawals after market returns',()=>{const r=run(args({cashflow_timing:'MONTH_END'}));assert.equal(r.complete_windows,1);assert.equal(r.windows[0].baseline_cpi_observation_month,'2025-12');assert.equal(r.windows[0].last_used_cpi_observation_month,'2026-02');assert.equal(r.windows[0].final_living_expense_yen,1210);assert.equal(r.windows[0].ending_assets_yen,6690);});
test('market price appreciation distinguishes month-start vs end cashflow after CPI adjustment',()=>{const m=market('2026-01',3,.1);const s=run(args({monthly_market_returns:m}));const e=run(args({monthly_market_returns:m,cashflow_timing:'MONTH_END'}));assert.ok(e.windows[0].ending_assets_yen>s.windows[0].ending_assets_yen);});
test('revisions change baseline inside SAME released vintage, never mix levels across vintages',()=>{const x=vintages();x[1]=vintage('v1','2026-01-15',[110,121]);x[2]=vintage('v2','2026-02-15',[120,132,145.2]);x[3]=vintage('v3','2026-03-15',[130,143,157.3,173.03]);const r=run(args({cpi_vintage_snapshots:x}));assert.equal(r.complete_windows,1);assert.equal(r.windows[0].final_living_expense_yen,1210);assert.equal(r.windows[0].ending_assets_yen,6690);});
test('missing initial vintage excludes start instead of using future publication',()=>{const x=vintages().slice(1);const r=run(args({cpi_vintage_snapshots:x}));assert.equal(r.complete_market_windows,1);assert.equal(r.complete_windows,0);assert.equal(r.excluded_due_to_no_published_cpi,1);assert.equal(r.synthetic_funded_fraction,null);});
test('missing base month in later vintage excludes entire window without vintage splicing',()=>{const x=vintages();x[2]=vintage('v2','2026-02-15',[110,121],'2025-12');const r=run(args({cpi_vintage_snapshots:x}));assert.equal(r.complete_windows,0);assert.equal(r.excluded_due_to_missing_baseline_in_vintage,1);});
test('vintage release date with fewer available CPI months does not forward fill missing data',()=>{const x=vintages();x[2]=vintage('v2','2026-02-15',[100,110],'2025-11');const r=run(args({cpi_vintage_snapshots:x}));assert.equal(r.complete_windows,1);assert.equal(r.windows[0].last_used_cpi_observation_month,'2025-12');assert.equal(r.windows[0].final_living_expense_yen,1100);});
test('year-end and new year market months do not permit December index published in January for January 1 cashflow',()=>{const m=market('2026-01',2),v=[vintage('d','2025-12-15',[100]),vintage('n','2026-01-15',[100,110])];const r=run(args({monthly_market_returns:m,cpi_vintage_snapshots:v,horizon_months:2}));assert.equal(r.windows[0].final_living_expense_yen,1100);});
test('same-day release at month end remains unavailable under date-only policy',()=>{const m=market('2026-01',1);const first=vintage('old','2025-12-15',[100]);const second=vintage('released_on_settlement','2026-01-31',[100,110]);const r=run(args({monthly_market_returns:m,horizon_months:1,cashflow_timing:'MONTH_END',cpi_vintage_snapshots:[first,second]}));assert.equal(r.windows[0].last_published_vintage,'old');});
test('pensions and one-time income/expenses never get CPI indexed',()=>{const x=run(args({cashflow_plan:{monthly_withdrawal_yen:1000,relative_pension_schedule:[{id:'p',start_offset_months:1,monthly_yen:200}],relative_one_time_events:[{id:'e',kind:'EXPENSE',offset_months:2,amount_yen:300},{id:'i',kind:'INCOME',offset_months:0,amount_yen:50}]}}));assert.equal(x.windows[0].ending_assets_yen,10000-3310+400-300+50);});
test('fixed inflation cannot be silently combined with as-of CPI',()=>assert.throws(()=>run(args({cashflow_plan:{...plan,annual_expense_inflation:0}})),/forbids/));
test('bad market mode or observed market with synthetic vintages rejected',()=>assert.throws(()=>run(args({market_mode:'OBSERVED_RESEARCH'})),/provenance|market/));
test('observed vintage requires full claimed SHA, but does not pretend authentication',()=>{const v=vintage('o','2026-02-15',[100,110],'2025-11',{origin:'OBSERVED',source_id:'ESTAT',source_snapshot_sha256:'a'.repeat(64)});const result=V.validateCpiVintageSnapshots([v],'OBSERVED_RESEARCH');assert.equal(result.source_snapshot_sha_verified_here,false);assert.match(result.source_provenance,/UNVERIFIED/);delete v.source_snapshot_sha256;assert.throws(()=>V.validateCpiVintageSnapshots([v],'OBSERVED_RESEARCH'),/needs pinned/);});
test('observed mode can be executed on self-asserted archive metadata but must visibly remain unauthenticated',()=>{const v=vintages().map(x=>({...x,origin:'OBSERVED',source_id:'ESTAT',source_snapshot_sha256:'a'.repeat(64)}));const r=run(args({market_mode:'OBSERVED_RESEARCH',monthly_market_returns:market('2026-01',3,0,'OBSERVED'),cpi_vintage_snapshots:v}));assert.equal(r.complete_windows,1);assert.equal(r.cpi_source_archive_authenticated_here,false);assert.equal(r.actual_release_dates_independently_verified,false);assert.equal(r.publication_approved,false);assert.equal(r.historical_funded_fraction,null);assert.equal(r.unverified_observed_candidate_funded_fraction,1);});
for(const [name,make,pattern] of failures){test('fail-closed '+name,()=>assert.throws(()=>V.validateCpiVintageSnapshots(make(),'SYNTHETIC_DEMO'),pattern));}
test('invalid source metadata is rejected before windows are counted',()=>{const m=market();m[2].proxy='yes';assert.throws(()=>run(args({monthly_market_returns:m})),/provenance/);});
test('input version is deterministic, without modifying caller objects',()=>{const a=args(),before=JSON.stringify(a),r=run(a);assert.deepEqual(r,run(a));assert.equal(JSON.stringify(a),before);});
test('multiple rolling starts reset baseline to information available at that start',()=>{const m=market('2026-01',3);const r=run(args({monthly_market_returns:m,horizon_months:2}));assert.equal(r.complete_windows,2);assert.deepEqual(r.windows.map(x=>x.baseline_cpi_observation_month),['2025-11','2025-12']);assert.deepEqual(r.windows.map(x=>x.ending_assets_yen),[7900,7900]);});
test('synthetic analysis cannot show historical fraction and no future probability claim',()=>{const r=run(args());assert.equal(r.historical_funded_fraction,null);assert.equal(r.synthetic_funded_fraction,1);assert.match(r.interpretation,/not future/);});
