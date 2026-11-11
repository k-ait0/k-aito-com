'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {reconstructFedCanonical,examineRestoredHandoff,preparePrivateHandoff}=require('../lib/analytics/private-handoff-builder.cjs');
const {HEAD,canonicalRows}=require('../lib/analytics/private-canonical-csv.cjs');
const {REQUIREMENTS,matchingRestoredPaths}=require('../lib/analytics/restored-evidence-inventory.cjs');
const {options}=require('./prepare-analytics-private-handoff-v12.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const HTML=Buffer.from('<html><title>Historical Rates for the Japanese Yen</title>26-JAN-26 140.0000 27-FEB-26 141.0000 31-MAR-26 142.0000</html>');
const MONTHLY=Buffer.from('month,observation_date,usd_jpy,month_status\n2026-01,2026-01-26,140.0000,COMPLETE_OBSERVED\n2026-02,2026-02-27,141.0000,COMPLETE_OBSERVED\n2026-03,2026-03-31,142.0000,LATEST_MONTH_PROVISIONAL\n');
function build(opts={}){return reconstructFedCanonical({html:HTML,monthly_csv:MONTHLY,raw_sha256:hash(HTML),expected_canonical_sha256:'0'.repeat(64),...opts});}
test('Fed raw-to-monthly canonical reconstruction preserves only completed months',()=>{
 const {bytes,proof}=build();
 assert.equal(proof.complete_months,2);
 assert.equal(proof.first_month,'2026-01');assert.equal(proof.last_month,'2026-02');
 assert.equal(proof.provisional_month_excluded,'2026-03');
 const rows=canonicalRows(bytes,{label:'test',allowedSeries:new Set(['FED_H10_USDJPY_MONTH_END'])});
 assert.equal(rows.length,2);assert.deepEqual(rows.map(x=>x.value),['140.0000','141.0000']);
 assert.equal(rows[0].raw_response_sha256,hash(HTML));
 assert.equal(rows[0].currency,'JPY');assert.equal(rows[0].unit,'JPY_PER_USD');
});
test('candidate output only marked pinned when its entire byte hash matches',()=>{
 const candidate=build();assert.equal(candidate.proof.status,'RECONSTRUCTED_CANDIDATE_HASH_MISMATCH');
 const exact=build({expected_canonical_sha256:hash(candidate.bytes)});
 assert.equal(exact.proof.status,'PINNED_BYTE_MATCH');assert.deepEqual(candidate.bytes,exact.bytes);
});
test('raw Fed SHA cannot be spoofed by a monthly file',()=>assert.throws(()=>build({raw_sha256:'f'.repeat(64)}),/Pinned SHA256 mismatch/));
test('wrong monthly header rejects',()=>{const x=Buffer.from('month,date,value,status\n'+MONTHLY.toString().split('\n').slice(1).join('\n'));assert.throws(()=>build({monthly_csv:x}),/header mismatch/)});
test('Fed acquired monthly numerical drift rejects',()=>{const x=Buffer.from(MONTHLY.toString().replace('141.0000','150.0000'));assert.throws(()=>build({monthly_csv:x}),/value mismatch/)});
test('Fed missing month rejects',()=>{const x=Buffer.from(MONTHLY.toString().replace(/^2026-02,.*\n/m,''));assert.throws(()=>build({monthly_csv:x}),/coverage mismatch/)});
test('Fed provisional month cannot be treated as complete',()=>{const x=Buffer.from(MONTHLY.toString().replace('142.0000,LATEST_MONTH_PROVISIONAL','142.0000,COMPLETE_OBSERVED'));assert.throws(()=>build({monthly_csv:x}),/value mismatch|coverage mismatch/)});
test('Fed completed month cannot be flagged as provisional',()=>{const x=Buffer.from(MONTHLY.toString().replace('141.0000,COMPLETE_OBSERVED','141.0000,LATEST_MONTH_PROVISIONAL'));assert.throws(()=>build({monthly_csv:x}),/provisional month must be last/)});
test('Fed monthly CSV cannot be arbitrarily reordered or duplicated',()=>{const x=Buffer.from(MONTHLY.toString().replace('2026-02,','2026-01,'));assert.throws(()=>build({monthly_csv:x}),/unsorted/)});
test('Fed cannot silently use a different raw publisher',()=>{const x=Buffer.from('<html>Fed random FX 26-JAN-26 140.0000</html>');assert.throws(()=>build({html:x,raw_sha256:hash(x)}),/Wrong Fed H10 title/)});
test('e-Stat pinned official folder layout is correctly matched (v0.11 regression)',()=>{
 const all=[{rel:'estat_jp_cpi/CPI_JP_NATIONAL_2025_LINKED_HEADLINE__ab12/source_RAW.csv'},
 {rel:'estat_jp_cpi/CPI_JP_NATIONAL_2025_LINKED_EX_RENT__cd34/source_RAW.csv'},
 {rel:'estat_jp_cpi/JP_CPI_2025base_CANONICAL_PRIVATE.csv'},
 {rel:'fed_h10_locked_2000/FED_H10_USDJPY__ef78/source_RAW.html'},
 {rel:'fed_h10_locked_2000/normalized-fed-h10.csv'}];
 for(const key of ['cpi_headline','cpi_ex_rent','cpi_canonical','fed','fx_canonical']){
  const requirement=REQUIREMENTS.find(x=>x.key===key);
  assert.equal(matchingRestoredPaths(all,requirement).length,1,key);
 }
 assert.equal(matchingRestoredPaths(all,REQUIREMENTS.find(x=>x.key==='shiller')).length,0);
});
test('e-Stat unrelated similarly named file not accepted',()=>{
 const requirement=REQUIREMENTS.find(x=>x.key==='cpi_headline');
 assert.equal(matchingRestoredPaths([{rel:'estat_jp_cpi/JP_CPI_HEADLINE_2025_LINKED__fake/source_RAW.csv'}],requirement).length,0);
});
test('CLI optional private plan input can be wired without defaults',()=>{
 const a=options(['--restore-dir','/private/recovered','--out-dir','/private/out','--plan','/private/pension_plan.json']);
 assert.equal(a['--plan'],'/private/pension_plan.json');
});
test('CLI inspect-only accepts missing optional sources and reports blockers',()=>{
 const a=options(['--restore-dir','/private/recovered','--inspect-only']);assert.equal(a['--inspect-only'],true);
 assert.equal(a['--shiller'],undefined);
});
test('CLI explicit output required for prepare mode',()=>assert.throws(()=>options(['--restore-dir','/private/recovered']),/out-dir required/));
test('CLI rejects repeated and unknown options',()=>{
 assert.throws(()=>options(['--restore-dir','/x','--restore-dir','/y','--inspect-only']),/repeated/);
 assert.throws(()=>options(['--restore-dir','/x','--unknown','/y']),/Unknown/);
});
test('missing restoration receipt cannot be bypassed',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'analytics-v12-test-'));
 try{assert.throws(()=>examineRestoredHandoff({restore_dir:root}),/Missing private restoration receipt/)}finally{fs.rmSync(root,{force:true,recursive:true})}
});
test('prepare cannot create fake private accepted data when restoration is missing',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'analytics-v12-test-'));
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'analytics-v12-output-'));
 try{assert.throws(()=>preparePrivateHandoff({restore_dir:root,out_dir:out}),/Missing private restoration receipt/);
 assert.equal(fs.readdirSync(out).length,0)}finally{fs.rmSync(root,{force:true,recursive:true});fs.rmSync(out,{force:true,recursive:true})}
});
test('Fed generated header always matches the private canonical observation contract',()=>{
 const {bytes}=build();assert.equal(bytes.toString('utf8').split('\n')[0],HEAD.join(','));
});
