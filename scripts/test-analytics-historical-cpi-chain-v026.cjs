'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const V=require('../lib/analytics/cpi-historical-release-contract-v026.cjs');
const {runRollingPortfolioCpiHistoricalChain:run}=require('../lib/analytics/rolling-portfolio-cpi-chain-v026.cjs');
const {monthSerial,formatMonth}=require('../lib/analytics/cashflow-core.cjs');
const portfolio={initial_holdings_yen:{STOCK:10000},target_weights:{STOCK:1},rebalance:{mode:'NONE'}};
const market=(month='2021-07',n=3,rate=0,origin='SYNTHETIC')=>Array.from({length:n},(_,i)=>({month:formatMonth(monthSerial(month)+i),origin,asset_returns:{STOCK:rate}}));
const bases={2015:'JP_CPI_HEADLINE_2015_BASE',2020:'JP_CPI_HEADLINE_2020_BASE',2025:'JP_CPI_HEADLINE_2025_LINKED'};
const v=(id,day,base,start,values,patch={})=>({vintage_id:id,published_on:day,origin:'SYNTHETIC',source_id:'SYNTHETIC_FIXTURE',series_id:bases[base],series_kind:'CPI_LEVEL',unit:`INDEX_${base}_100`,seasonal_adjustment:'NSA',levels:values.map((x,i)=>({month:formatMonth(monthSerial(start)+i),value:x})),...patch});
const raw=()=>[v('old','2021-07-23',2015,'2021-05',[100,106]),v('new','2021-08-06',2020,'2021-05',[100,110]),v('later','2021-09-24',2020,'2021-05',[100,110,121,133.1])];
const args=(patch={})=>({monthly_market_returns:market(),cpi_vintage_snapshots:raw(),horizon_months:3,portfolio,cashflow_plan:{monthly_withdrawal_yen:1000},market_mode:'SYNTHETIC_DEMO',cashflow_timing:'MONTH_END',...patch});
const obs=a=>a.map(x=>({...x,origin:'OBSERVED',source_id:'ESTAT',source_snapshot_sha256:'a'.repeat(64)}));
const bad=(x,re)=>assert.throws(()=>V.validateHistoricalCpiVintages(x,'SYNTHETIC_DEMO'),re);
test('pinned official first release dates are 2016,2021,2026',()=>{
 assert.deepEqual(Object.keys(V.RELEASE_BASES),[bases[2015],bases[2020],bases[2025]]);
 assert.equal(V.RELEASE_BASES[bases[2015]].earliest_published_on,'2016-08-12');
 assert.equal(V.RELEASE_BASES[bases[2020]].earliest_published_on,'2021-08-06');
 assert.equal(V.RELEASE_BASES[bases[2025]].earliest_published_on,'2026-08-07');
});
test('observed 2025 base cannot claim publication in 2025',()=>{
 assert.throws(()=>V.validateHistoricalCpiVintages(obs([v('e','2025-12-15',2025,'2025-11',[100])]),'OBSERVED_RESEARCH'),/Impossible historical release/);
});
test('observed 2020 and 2015 bases cannot claim pre-introduction release',()=>{
 for(const [basis,date,first] of [[2020,'2021-08-05','2021-06'],[2015,'2016-08-11','2016-06']])
  assert.throws(()=>V.validateHistoricalCpiVintages(obs([v('e',date,basis,first,[100])]),'OBSERVED_RESEARCH'),/Impossible historical release/);
});
test('first official retrospective release cannot contain next month observations',()=>{
 for(const [basis,date,month] of [[2015,'2016-08-12','2016-07'],[2020,'2021-08-06','2021-07'],[2025,'2026-08-07','2026-07']])
  assert.throws(()=>V.validateHistoricalCpiVintages(obs([v('e',date,basis,month,[100])]),'OBSERVED_RESEARCH'),/first published in a later/);
});
test('introduction date is supported but no historical source authenticity is claimed',()=>{
 const r=V.validateHistoricalCpiVintages(obs([v('e','2026-08-07',2025,'2026-06',[100])]),'OBSERVED_RESEARCH');
 assert.equal(r.snapshots[0].basis_year,2025);assert.equal(r.archive_bytes_authenticated_here,false);
 assert.equal(r.individual_release_dates_independently_verified,false);
});
test('2015 to 2020 synthetic basis transition is chain linked with same-vintage ratios',()=>{
 const r=run(args());assert.equal(r.complete_windows,1);
 const x=r.windows[0];assert.equal(x.base_transition_count,1);
 assert.deepEqual([x.first_cpi_basis_year,x.last_cpi_basis_year],[2015,2020]);
 assert.equal(x.last_living_expense_yen,1210);assert.equal(x.ending_assets_yen,6790);
 assert.equal(x.initial_index_reference_month,'2021-06');assert.equal(x.last_index_reference_month,'2021-08');
});
test('rescaling the whole new basis does not invent inflation',()=>{
 const x=raw();x[1]=v('new','2021-08-06',2020,'2021-05',[250,275]);
 x[2]=v('later','2021-09-24',2020,'2021-05',[250,275,302.5,332.75]);
 const r=run(args({cpi_vintage_snapshots:x}));assert.equal(r.windows[0].last_living_expense_yen,1210);
 assert.equal(r.windows[0].ending_assets_yen,6790);
});
test('no overlapping CPI reference across new basis excludes window',()=>{
 const x=raw();x[1]=v('new','2021-08-06',2020,'2021-07',[121]);
 const r=run(args({cpi_vintage_snapshots:x}));assert.equal(r.complete_windows,0);
 assert.equal(r.excluded_no_overlap,1);
});
test('reference backwards due to snapshot truncation excludes window',()=>{
 const x=raw();x[2]=v('later','2021-09-24',2020,'2021-04',[99]);
 const r=run(args({cpi_vintage_snapshots:x}));assert.equal(r.complete_windows,0);
 assert.equal(r.excluded_regressing_reference,1);
});
test('lack of available release at start excludes, not future-fills',()=>{
 const r=run(args({cpi_vintage_snapshots:raw().slice(1)}));
 assert.equal(r.complete_windows,0);assert.equal(r.excluded_no_published_release,1);
});
test('month-start does not use index released after calendar first',()=>{
 const r=run(args({cashflow_timing:'MONTH_START'}));
 assert.equal(r.complete_windows,0);assert.equal(r.excluded_no_published_release,1);
});
test('same-day index release is excluded and next-day included',()=>{
 const s=V.validateHistoricalCpiVintages(raw(),'SYNTHETIC_DEMO').snapshots;
 assert.equal(V.latestReleasedBefore(s,'2021-08-06').vintage_id,'old');
 assert.equal(V.latestReleasedBefore(s,'2021-08-07').vintage_id,'new');
});
test('2025 basis cannot regress to 2020 in chosen vintage sequence',()=>{
 bad([v('n','2026-08-07',2025,'2026-06',[100]),v('o','2026-09-10',2020,'2026-07',[100])],/must not regress/);
});
test('basket, series, unit, and unknown proxy flags rejected',()=>{
 bad([v('b','2021-07-23',2015,'2021-06',[100],{unit:'INDEX_2020_100'})],/base mismatch/);
 bad([v('b','2021-07-23',2015,'2021-06',[100],{series_id:'JP_CPI_EX_RENT_2015_BASE'})],/base mismatch/);
 bad([v('b','2021-07-23',2015,'2021-06',[100],{proxy:'yes'})],/Unsupported/);
 bad([v('b','2021-07-23',2015,'2021-06',[100],{estimated:false})],/Unsupported/);
});
test('duplicate dates and IDs cannot change release selection order',()=>{
 bad([v('id','2021-07-23',2015,'2021-06',[100]),v('id','2021-07-24',2015,'2021-06',[100])],/duplicate/);
 bad([v('a','2021-07-23',2015,'2021-06',[100]),v('b','2021-07-23',2015,'2021-06',[100])],/ordered/);
});
test('observed inputs require ESTAT and asserted pin but pin is not authenticated',()=>{
 assert.throws(()=>V.validateHistoricalCpiVintages([v('a','2021-07-23',2015,'2021-06',[100])],'OBSERVED_RESEARCH'),/provenance/);
 const a=obs([v('a','2021-07-23',2015,'2021-06',[100])]);delete a[0].source_snapshot_sha256;
 assert.throws(()=>V.validateHistoricalCpiVintages(a,'OBSERVED_RESEARCH'),/archive SHA/);
});
test('invalid dates, future observations, duplicate CPI months, and unsafe values rejected',()=>{
 bad([v('b','2021-02-30',2015,'2021-01',[100])],/calendar date/);
 bad([v('b','2021-07-23',2015,'2021-07',[100])],/observation month/);
 bad([v('b','2021-07-23',2015,'2021-05',[100,-1])],/Unsafe/);
 bad([v('b','2021-07-23',2015,'2021-06',[100],{levels:[{month:'2021-06',value:100},{month:'2021-06',value:99}]})],/consecutive/);
});
test('pensions, expenses and income are not CPI-indexed',()=>{
 const r=run(args({cashflow_plan:{monthly_withdrawal_yen:1000,relative_pension_schedule:[{id:'p',start_offset_months:1,monthly_yen:200}],relative_one_time_events:[{id:'e',kind:'EXPENSE',offset_months:2,amount_yen:300},{id:'i',kind:'INCOME',offset_months:0,amount_yen:50}]}}));
 assert.equal(r.windows[0].ending_assets_yen,10000-3210+400-300+50);
});
test('monthly cashflow timing changes results at positive market return',()=>{
 const x=[v('prior','2021-06-23',2015,'2021-05',[100]),...raw()];
 const p=args({monthly_market_returns:market('2021-07',3,.1),cpi_vintage_snapshots:x});
 const a=run({...p,cashflow_timing:'MONTH_START'}),b=run({...p,cashflow_timing:'MONTH_END'});
 assert.equal(a.complete_windows,1);assert.equal(b.complete_windows,1);
 assert.ok(b.windows[0].ending_assets_yen>a.windows[0].ending_assets_yen);
});
test('one unchanged basis produces same nominal results as v0.25',()=>{
 const {runRollingPortfolioCpiAsOf}=require('../lib/analytics/rolling-portfolio-cpi-asof.cjs');
 const vintages=[v('v0','2025-12-15',2025,'2025-11',[100]),v('v1','2026-01-15',2025,'2025-11',[100,110]),v('v2','2026-02-15',2025,'2025-11',[100,110,121])];
 const params=args({monthly_market_returns:market('2026-01',3),cpi_vintage_snapshots:vintages,cashflow_timing:'MONTH_START'});
 const a=run(params),b=runRollingPortfolioCpiAsOf(params);
 assert.equal(a.windows[0].ending_assets_yen,b.windows[0].ending_assets_yen);
 assert.equal(a.windows[0].last_living_expense_yen,b.windows[0].final_living_expense_yen);
});
test('market data gaps are excluded separately from missing historical CPI',()=>{
 const r=run(args({monthly_market_returns:[market('2021-07',1)[0],market('2021-09',1)[0]],horizon_months:2}));
 assert.equal(r.complete_market_windows,0);assert.equal(r.complete_windows,0);assert.equal(r.excluded_market_gap_windows,2);
});
test('self-reported observed vintages are never labeled as verified historic results',()=>{
 const r=run(args({monthly_market_returns:market('2021-07',3,0,'OBSERVED'),cpi_vintage_snapshots:obs(raw()),market_mode:'OBSERVED_RESEARCH'}));
 assert.equal(r.complete_windows,1);assert.equal(r.historical_funded_fraction,null);
 assert.equal(r.actual_individual_release_dates_verified,false);assert.equal(r.source_snapshot_bytes_authenticated_here,false);
 assert.equal(r.descriptive_fraction_of_unverified_observed_candidates,1);
});
test('CPI path is deterministic and never mutates inputs',()=>{
 const a=args(),before=JSON.stringify(a);assert.deepEqual(run(a),run(a));assert.equal(JSON.stringify(a),before);
});
