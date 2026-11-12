'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./fixtures/private-cpi-benchmark-fixture.cjs');
const {buildPrivateCpiBenchmarkReport}=require('../lib/analytics/private-cpi-benchmark-research.cjs');
const {parseArgs}=require('./run-analytics-private-cpi-benchmark-v14.cjs');
const run=(data=fixture(),rate=0)=>buildPrivateCpiBenchmarkReport({...data,comparison_annual_expense_inflation:rate});
test('six synthetic source bytes -> independent raw normalization -> paired 120m calculation',()=>{
 const x=run();assert.equal(x.raw_to_canonical_normalization_independently_recomputed,true);
 assert.equal(x.comparison[0].horizon_months,120);assert.equal(x.comparison[0].paired_complete_windows,2);
 assert.equal(x.comparison[1].horizon_months,240);assert.equal(x.comparison[1].paired_complete_windows,0);
 assert.equal(x.publication_approved,false);
});
test('synthetic CPI rising makes difference in withdrawal needs over zero-fixed inflation',()=>{const x=run();const a=x.comparison[0];assert.equal(a.fixed_only_windows_excluded_from_comparison,0);assert.ok(a.median_delta_ending_assets_cpi_minus_fixed_yen<0);assert.equal(a.funded_cpi_windows,2);});
test('private aggregated report contains no row-level CPI levels or returns',()=>{
 const x=run();const s=JSON.stringify(x);
 assert.equal(s.includes('\"paired_windows\":'),false);assert.equal(s.includes('asset_returns'),false);assert.equal(s.includes('cpi_start_level'),false);assert.equal(s.includes('source_RAW'),false);assert.equal(s.includes('wrapped_key'),false);
});
test('source hash change blocks paired report BEFORE using market values',()=>{const d=fixture();d.files.fed=Buffer.from('mismatch');assert.throws(()=>run(d),/SHA256 mismatch/)});
test('source CPI canonical tamper blocks comparison',()=>{const d=fixture();d.files.cpi_canonical=Buffer.from('bad bytes');assert.throws(()=>run(d),/SHA256 mismatch/)});
test('unapproved 1971 DDP source not accepted',()=>{const d=fixture();d.manifest.fx.source_channel='H10_DDP_CANDIDATE';assert.throws(()=>run(d),/DRAFT source channel|wrong quote/)});
test('only one-asset approved Shiller fallback allowed in private research',()=>{const d=fixture();d.plan.portfolio.initial_holdings_yen.BOND=500;assert.throws(()=>run(d),/one-asset/)});
test('double CPI+fixed inflation input rejected',()=>{const d=fixture();d.plan.cashflow_plan.annual_expense_inflation=.02;assert.throws(()=>run(d),/Unsupported/)});
test('annual fixed inflation must be explicit numeric for research comparison',()=>{const d=fixture();for(const bad of [null,NaN,-.8,2,undefined])assert.throws(()=>buildPrivateCpiBenchmarkReport({...d,comparison_annual_expense_inflation:bad}),/comparison_annual/)});
test('CLI requires all paths and explicit annual rate',()=>{assert.throws(()=>parseArgs([]),/required/);assert.throws(()=>parseArgs(['--annual-rate','0.02']),/required/);const args=parseArgs(['--handoff-dir','/data','--registry','/r','--plan','/p','--out-dir','/out','--annual-rate','0.02']);assert.equal(args.annualRate,.02)});
test('CLI duplicate flags and bad formats rejected',()=>{assert.throws(()=>parseArgs(['--annual-rate','0','--annual-rate','1']),/repeated/);assert.throws(()=>parseArgs(['--foobar','hi']),/Unknown/);const p=['--handoff-dir','/data','--registry','/r','--plan','/p','--out-dir','/out'];for(const bad of ['NaN','Infinity','1e-2','-0.8'])assert.throws(()=>parseArgs([...p,'--annual-rate',bad]),/annual-rate|inflation/)});
test('repeated private run deterministic; source bytes and plan untouched',()=>{const d=fixture(),source=Object.fromEntries(Object.entries(d.files).map(([k,v])=>[k,Buffer.from(v)])),plan=JSON.stringify(d.plan);const a=run(d),b=run(d);assert.deepEqual(a,b);for(const k of Object.keys(source))assert.deepEqual(d.files[k],source[k]);assert.equal(JSON.stringify(d.plan),plan)});
