'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const R=require('../lib/analytics/public-shiller-candidate-v20.cjs');
const old=require('../lib/analytics/private-shiller-recovery.cjs');
const cli=require('./analyze-analytics-shiller-candidate-v20.cjs');
function fixture({price=100,div=12}={}){
 const header=old.HEADER;const rows=[header];
 for(let i=0;i<522;i++){
  const date=`${1980+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}-01`;
  rows.push([date,price,div,20,70+i/10,5,0,0,0,0].join(','));
 }
 rows.push('2023-07-01,4500,0,0,0,0,0,0,0,0');
 return Buffer.from(rows.join('\n')+'\n');
}
const dir=()=>fs.mkdtempSync(path.join(os.tmpdir(),'analytics_public_candidate_v20_'));
const tmpTest=fn=>t=>{const d=dir();try{return fn(t,d)}finally{fs.rmSync(d,{recursive:true,force:true})}};
test('v20 candidate report requires upstream Git blob pin by default',()=>assert.throws(()=>R.candidateReport(fixture()),/Git blob mismatch/));
test('v20 candidate handles 522 monthly observations without consuming FRED-only extension',()=>{
 const r=R.candidateReport(fixture(),{skipBlobPin:true});
 assert.equal(r.source_original_months,522);assert.equal(r.derived_nominal_usd_return_months,521);
 assert.equal(r.source_first_month,'1980-01');assert.equal(r.source_last_month,'2023-06');
});
test('v20 candidate rolling windows exactly 402/282/162',()=>{
 const r=R.candidateReport(fixture(),{skipBlobPin:true});
 assert.equal(r.windows['120'].complete_overlapping_windows,402);
 assert.equal(r.windows['240'].complete_overlapping_windows,282);
 assert.equal(r.windows['360'].complete_overlapping_windows,162);
});
test('v20 candidate constant monthly factor gives independently known CAGR',()=>{
 const r=R.candidateReport(fixture(),{skipBlobPin:true});
 const expected=1.01**12-1;
 for(const k of ['120','240','360']){
  assert.ok(Math.abs(r.windows[k].median_annualized-expected)<1e-10);
  assert.equal(r.windows[k].negative_nominal_usd_windows,0);
 }
});
test('v20 candidate cumulative windows start and end correctly',()=>{
 const r=R.candidateReport(fixture(),{skipBlobPin:true});
 assert.equal(r.windows['120'].first_start,'1980-02');
 assert.equal(r.windows['120'].last_start,'2013-07');
 assert.equal(r.windows['240'].last_start,'2003-07');
 assert.equal(r.windows['360'].last_start,'1993-07');
});
test('v20 candidate reports source differentiation and research-only state',()=>{
 const r=R.candidateReport(fixture(),{skipBlobPin:true});
 assert.equal(r.legacy_exact_bytes_recovered,false);assert.equal(r.official_sp500_total_return,false);
 assert.equal(r.publication_approved,false);assert.equal(r.fx_adjusted_jpy,false);
 assert.equal(r.legacy_shiller_sha256,old.PINNED_SHILLER_SHA256);
 assert.equal(r.commit,old.UPSTREAM_COMMIT);
});
test('v20 candidate output contains only aggregate stats, not raw rows',()=>{
 const r=R.candidateReport(fixture(),{skipBlobPin:true});
 assert.equal(Object.hasOwn(r,'rows'),false);assert.equal(Object.hasOwn(r,'returns'),false);
 assert.equal(Object.hasOwn(r.windows['120'],'all_starts'),false);
 assert.equal(JSON.stringify(r).includes('2023-07'),false);
});
test('v20 candidate rejects missing source rows',()=>{
 const bad=fixture().toString().replace(/^1980-02-01.*\n/m,'');
 assert.throws(()=>R.candidateReport(Buffer.from(bad),{skipBlobPin:true}),/Missing or repeated/);
});
test('v20 candidate rejects unchanged file if source is inside repo',()=>{
 assert.throws(()=>R.inspectFile(path.join(__dirname,'test-analytics-public-shiller-candidate-v20.cjs')),/Input CSV cannot be in Git checkout/);
});
test('v20 candidate refuses overwriting immutable private report',tmpTest((t,d)=>{
 const r=R.candidateReport(fixture(),{skipBlobPin:true});
 R.writePrivateAggregate(r,d);
 assert.throws(()=>R.writePrivateAggregate(r,d),/EEXIST/);
 const p=path.join(d,'SHILLER_PUBLIC_CANDIDATE_V020_AGGREGATE.json');
 assert.equal(JSON.parse(fs.readFileSync(p,'utf8')).publication_approved,false);
 if(process.platform!=='win32')assert.equal(fs.statSync(p).mode&0o077,0);
}));
test('v20 candidate refuses unknown input/publish flag',tmpTest((t,d)=>{
 assert.throws(()=>R.writePrivateAggregate({...R.candidateReport(fixture(),{skipBlobPin:true}),publication_approved:true},d),/Not research aggregate/);
}));
test('v20 candidate CLI forbids implicit fetch',()=>assert.throws(()=>cli.parse([]),/Specify source-file/));
test('v20 candidate CLI forbids double source designation',()=>assert.throws(()=>cli.parse(['--source-file','/a','--fetch-pinned-once']),/source-file OR/));
test('v20 candidate CLI optional out-dir is explicit',()=>assert.equal(cli.parse(['--fetch-pinned-once','--out-dir','/private'])['--out-dir'],'/private'));
test('v20 zero-inflation fixture yields equal US nominal and US real CAGR',()=>{
 const r=R.candidateReport(fixture(),{skipBlobPin:true});
 // Synthetic fixture CPI rises by 0.1 every month, so US real must be less than nominal.
 for(const k of ['120','240','360'])assert.ok(r.us_cpi_real_windows[k].median_annualized<r.windows[k].median_annualized);
});
test('v20 CPI-index normalization scales cancel on real return',()=>{
 const raw=fixture().toString();const scaled=raw.split('\n').map((line,i)=>{
  if(i===0||!line.startsWith('19')&&!line.startsWith('20'))return line;
  const cells=line.split(',');if(cells[0]<='2023-06-01')cells[4]=String(Number(cells[4])*10);return cells.join(',');
 }).join('\n');
 const a=R.candidateReport(Buffer.from(raw),{skipBlobPin:true});
 const b=R.candidateReport(Buffer.from(scaled),{skipBlobPin:true});
 for(const k of ['120','240','360'])assert.ok(Math.abs(a.us_cpi_real_windows[k].median_annualized-b.us_cpi_real_windows[k].median_annualized)<1e-10);
});
