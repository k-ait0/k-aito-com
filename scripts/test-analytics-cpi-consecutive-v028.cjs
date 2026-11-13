'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const R=require('../lib/analytics/cpi-official-consecutive-v028.cjs');
const ROOT=path.resolve(__dirname,'..');
const DATA=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/ANALYTICS_JP_CPI_RELEASE_SEQUENCE_V028.json'),'utf8'));
const clone=()=>JSON.parse(JSON.stringify(DATA));
const bad=(fn,re)=>{const d=clone();fn(d);assert.throws(()=>R.validateSequence(d),re)};
function cli(...argv){return cp.spawnSync(process.execPath,['scripts/check-analytics-cpi-consecutive-v28.cjs',...argv],{cwd:ROOT,encoding:'utf8'});}
test('Three reviewed 2025-base national CPI releases are contiguous and strictly chronological',()=>{
 assert.equal(R.validateSequence(clone()).length,3);
 assert.deepEqual(DATA.records.map(x=>x.observation_month),['2026-07','2026-08','2026-09']);
 assert.deepEqual(DATA.records.map(x=>x.headline_index),[102,102.2,102.2]);
});
test('July reviewed observation matches previously independent v027 sample',()=>{
 const other=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/ANALYTICS_CPI_OFFICIAL_MONTHLY_EVIDENCE_V0_27.json'),'utf8')).records.find(x=>x.observation_month==='2026-07');
 assert.equal(other.value,DATA.records[0].headline_index);assert.equal(other.published_on,DATA.records[0].published_on);
});
test('Strict as-of blocks 2026-07 before publication',()=>assert.equal(R.releasedAsOf(DATA,'2026-08-20').latest_headline_index,null));
test('Strict as-of blocks same-day July publication',()=>assert.equal(R.releasedAsOf(DATA,'2026-08-21').latest_headline_index,null));
test('Strict as-of allows July from next day',()=>assert.equal(R.releasedAsOf(DATA,'2026-08-22').latest_headline_index,102));
test('September 18 asof still uses July',()=>assert.equal(R.releasedAsOf(DATA,'2026-09-18').latest_observation_month,'2026-07'));
test('September 19 asof uses August',()=>assert.equal(R.releasedAsOf(DATA,'2026-09-19').latest_observation_month,'2026-08'));
test('October 23 asof still uses August',()=>assert.equal(R.releasedAsOf(DATA,'2026-10-23').latest_observation_month,'2026-08'));
test('October 24 asof uses September',()=>assert.equal(R.releasedAsOf(DATA,'2026-10-24').latest_observation_month,'2026-09'));
test('cutoff prevents projection of stale September vintage into unverified future',()=>assert.throws(()=>R.releasedAsOf(DATA,'2026-11-14'),/cutoff/));
test('asof rejects invalid calendar date, non-date, and ordinal',()=>{
 for(const x of ['2026-02-30','2026-13-02',null,'20261024'])assert.throws(()=>R.releasedAsOf(DATA,x));
});
test('all records have exact pinned e-stat dataset identities',()=>{
 for(const r of DATA.records){assert.match(r.stat_infid,/^\d{12}$/);assert.equal(r.publication_metadata_url.endsWith(r.stat_infid),true);assert.equal(r.release_pdf_sha256,null);}
});
test('reject altered July headline',()=>bad(d=>d.records[0].headline_index=102.1,/mismatch/));
test('reject altered August headline',()=>bad(d=>d.records[1].headline_index=102.3,/mismatch/));
test('reject altered September headline',()=>bad(d=>d.records[2].headline_index=102.1,/mismatch/));
test('reject wrong observation month',()=>bad(d=>d.records[1].observation_month='2026-10',/mismatch/));
test('reject wrong publication date',()=>bad(d=>d.records[1].published_on='2026-09-17',/mismatch/));
test('reject manufactured publication time',()=>bad(d=>d.records[1].published_at_jst='2026-09-18T08:29:00+09:00',/timestamp/));
test('reject altered metadata source',()=>bad(d=>d.records[1].stat_infid='000040501409',/mismatch/));
test('reject altered metadata url',()=>bad(d=>d.records[0].publication_metadata_url='https://evil.test/x',/URL mismatch/));
test('reject changed headline source URL',()=>bad(d=>d.records[0].headline_value_source_url='https://evil.test/',/mismatch/));
test('reject claim of certified PDF SHA',()=>bad(d=>d.records[2].release_pdf_sha256='a'.repeat(64),/digest claim/));
test('reject false historic coverage claim',()=>bad(d=>d.all_historical_monthly_releases_obtained=true,/Misleading/));
test('reject false authenticated bytes claim',()=>bad(d=>d.raw_pdf_bytes_authenticated=true,/Misleading/));
test('reject false model backtest readiness claim',()=>bad(d=>d.allow_backtest_as_verified_vintage=true,/Misleading/));
test('reject false official inflation rate claim',()=>bad(d=>d.official_monthly_change_reconstructed_from_unrounded_values=true,/Misleading/));
test('reject extra record field that could carry proxy data',()=>bad(d=>d.records[1].estimated='yes',/shape/));
test('reject extra root field',()=>bad(d=>d.fake_origin='OBSERVED',/shape/));
test('reject missing months',()=>bad(d=>d.records.pop(),/Exactly three/));
test('reject duplicate month rows',()=>bad(d=>d.records[2]=structuredClone(d.records[1]),/mismatch/));
test('reject reorder of releases',()=>bad(d=>d.records.reverse(),/mismatch/));
test('value ratio based on rounded levels is NOT official monthly percentage change',()=>{
 const cmp=R.comparePublishedLevels(DATA);
 assert.equal(cmp.steps.length,2);assert.equal(cmp.steps[0].rounded_index_ratio_pct,0.196078);
 assert.equal(cmp.steps[1].rounded_index_ratio_pct,0);
 assert.equal(cmp.not_official_monthly_change,true);
});
test('expense preview uses released 2026-07, 08, 09 levels, never future values',()=>{
 const x=R.previewExpense(DATA,['2026-09-01','2026-10-01','2026-11-01'],100000);
 assert.deepEqual(x.samples.map(y=>y.reference_month),['2026-07','2026-08','2026-09']);
 assert.deepEqual(x.samples.map(y=>y.illustrative_living_expense_yen),[100000,100196,100196]);
 assert.equal(x.full_historical_vintage_backtest_approved,false);
});
test('preview rejects settlement date before first reviewed observation',()=>assert.throws(()=>R.previewExpense(DATA,['2026-08-21'],1000),/unavailable/));
test('preview rejects unsorted and duplicate dates',()=>{
 for(const x of [['2026-11-01','2026-10-01'],['2026-10-01','2026-10-01']])assert.throws(()=>R.previewExpense(DATA,x,1000),/ascend/);
});
test('preview rejects hypothetical future release beyond cutoff',()=>assert.throws(()=>R.previewExpense(DATA,['2026-12-01'],1000),/cutoff/));
test('preview rejects negative, fractional, or unsafe expenses',()=>{
 for(const x of [-1,0.25,1e20,NaN])assert.throws(()=>R.previewExpense(DATA,['2026-10-01'],x),/Invalid/);
});
test('zero expense preview preserves zero',()=>assert.equal(R.previewExpense(DATA,['2026-09-01'],0).samples[0].illustrative_living_expense_yen,0));
test('CLI valid as-of, no future leakage',()=>{
 const p=cli('--asof','2026-09-18');assert.equal(p.status,0,p.stderr);
 const j=JSON.parse(p.stdout);assert.equal(j.latest_observation_month,'2026-07');assert.equal(j.full_historical_asof_backtest_approved,false);
});
test('CLI valid preview uses actual observed review values only',()=>{
 const p=cli('--sample-dates','2026-09-01,2026-10-01,2026-11-01','--base-expense-yen','100000');assert.equal(p.status,0,p.stderr);
 assert.deepEqual(JSON.parse(p.stdout).samples.map(x=>x.illustrative_living_expense_yen),[100000,100196,100196]);
});
test('CLI invalid commands fail closed',()=>{
 for(const args of [['--upload','raw'],['--sample-dates','2026-10-01'],['--asof','2026-12-01'],['--compare','--asof','2026-09-01']]){
  const p=cli(...args);assert.equal(p.status,2);assert.match(p.stderr,/BLOCKED/);
 }
});
test('CLI --compare output warns against published MoM conversion',()=>{
 const p=cli('--compare');assert.equal(p.status,0,p.stderr);
 assert.equal(JSON.parse(p.stdout).not_official_monthly_change,true);
});
