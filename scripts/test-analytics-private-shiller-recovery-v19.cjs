'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const R=require('../lib/analytics/private-shiller-recovery.cjs');
const CLI=require('./recover-analytics-private-shiller-v19.cjs');
const mk=()=>fs.mkdtempSync(path.join(os.tmpdir(),'analytics_shiller_v19_'));
function synthetic(n=522){
 const data=[R.HEADER];
 for(let i=0;i<n;i++){
  const year=1980+Math.floor(i/12),mon=i%12+1;
  const date=String(year)+'-'+String(mon).padStart(2,'0')+'-01';
  data.push([date,String(100+i/10),String(3+i/100),String(20+i/20),String(70+i/6),'5','1','1','1','10'].join(','));
 }
 // Later FRED extension must never be consumed as Shiller dividend observations.
 data.push('2023-07-01,4500,0,0,0,0,0,0,0,0');
 return Buffer.from(data.join('\n')+'\n');
}
const tmpTest=(fn)=>async(t)=>{const root=mk();try{await fn(t,root)}finally{fs.rmSync(root,{recursive:true,force:true})}};
test('v19: pinned historical Sha is 64 hex characters',()=>assert.match(R.PINNED_SHILLER_SHA256,/^[a-f0-9]{64}$/));
test('v19: upstream Git commit and blob are pinned',()=>{assert.match(R.UPSTREAM_COMMIT,/^[a-f0-9]{40}$/);assert.match(R.UPSTREAM_GIT_BLOB,/^[a-f0-9]{40}$/);assert.ok(R.UPSTREAM_PATH.includes(R.UPSTREAM_COMMIT));});
test('v19: snapshot identity is not a total-return license',()=>assert.equal(R.parsedUpstream(synthetic()).length,522));
test('v19: extra post-2023 FRED price-only rows excluded',()=>assert.equal(R.parsedUpstream(synthetic()).at(-1).month,'2023-06'));
test('v19: exact candidate from test fixture is found without writing',()=>{
 const s=synthetic(),rows=R.parsedUpstream(s);const candidate=R.buildCandidate(rows);
 const report=R.analyzeUpstream(s,{expected:R.sha(candidate),requireGitBlob:false});
 assert.equal(report.legacy_exact_bytes_recovered,true);assert.equal(report.match.format.price,'raw');
 assert.equal(report.match.candidate.equals(candidate),true);
});
test('v19: corrupted/unpinned downloaded snapshot blocked',()=>assert.throws(()=>R.analyzeUpstream(synthetic()),/Git blob/));
test('v19: missing historical rows blocked',()=>assert.throws(()=>R.parsedUpstream(synthetic(521)),/coverage/));
test('v19: changed CSV headers blocked',()=>assert.throws(()=>R.parsedUpstream(Buffer.from(synthetic().toString('utf8').replace('Dividend','Div'))),/columns/));
test('v19: duplicate dates blocked',()=>{
 const text=synthetic().toString('utf8').replace('1980-02-01','1980-01-01');assert.throws(()=>R.parsedUpstream(Buffer.from(text)),/Missing or repeated/);
});
test('v19: missing dates blocked',()=>{
 const text=synthetic().toString('utf8').replace('1980-02-01','1980-03-01');assert.throws(()=>R.parsedUpstream(Buffer.from(text)),/Missing or repeated/);
});
test('v19: zero CPI in in-range data blocked',()=>{
 const text=synthetic().toString('utf8').replace('1980-01-01,100,3,20,70','1980-01-01,100,3,20,0');assert.throws(()=>R.parsedUpstream(Buffer.from(text)),/Invalid Shiller/);
});
test('v19: any expected-pin mismatch cannot be saved',tmpTest((t,p)=>{
 const candidate=R.analyzeUpstream(synthetic(),{expected:R.PINNED_SHILLER_SHA256,requireGitBlob:false});
 assert.equal(candidate.legacy_exact_bytes_recovered,false);assert.throws(()=>R.writeMatchedPrivate(candidate,p),/PIN_MISMATCH/);
 assert.equal(fs.existsSync(path.join(p,'raw-shiller.csv')),false);
}));
test('v19: matching test fixture writes outside worktree, no overwrite',tmpTest((t,p)=>{
 const raw=synthetic(),candidate=R.buildCandidate(R.parsedUpstream(raw));
 const report=R.analyzeUpstream(raw,{expected:R.sha(candidate),requireGitBlob:false});
 const result=R.writeMatchedPrivate(report,p);assert.equal(result.sha256,R.sha(candidate));
 assert.equal(fs.readFileSync(result.path).equals(candidate),true);
 assert.throws(()=>R.writeMatchedPrivate(report,p),/overwrite/);
 if(process.platform!=='win32')assert.equal(fs.statSync(result.path).mode&0o077,0);
}));
test('v19: locate existing exact Shiller snapshot by bytes, not filename label',tmpTest((t,p)=>{
 const raw=synthetic(),candidate=R.buildCandidate(R.parsedUpstream(raw));
 fs.mkdirSync(path.join(p,'nested'));const f=path.join(p,'nested','my-export.csv');fs.writeFileSync(f,candidate);
 const result=R.locateExistingOriginal(p,{expected:R.sha(candidate)});
 assert.deepEqual(result.matches,[f]);assert.equal(result.status,'EXACT_LEGACY_ORIGINAL_FOUND');
}));
test('v19: locator does not accept different CSV contents',tmpTest((t,p)=>{
 fs.writeFileSync(path.join(p,'bad.csv'),'data\n');
 assert.equal(R.locateExistingOriginal(p).status,'EXACT_LEGACY_ORIGINAL_NOT_FOUND');
}));
test('v19: locator rejects symlink and does not follow it',tmpTest((t,p)=>{
 const raw=synthetic(),candidate=R.buildCandidate(R.parsedUpstream(raw));
 const f=path.join(p,'input.csv');fs.writeFileSync(f,candidate);
 fs.symlinkSync(f,path.join(p,'alias.csv'));
 const result=R.locateExistingOriginal(p,{expected:R.sha(candidate)});
 assert.equal(result.matches.length,1);assert.equal(result.skipped_nonmatching_or_unsafe>0,true);
}));
test('v19: path read refuses symlink',tmpTest((t,p)=>{
 const file=path.join(p,'original.csv'),link=path.join(p,'alias.csv');fs.writeFileSync(file,synthetic());fs.symlinkSync(file,link);
 assert.throws(()=>R.strictInput(link,'upstream source'),/Unsafe/);
}));
test('v19: CLI requires one explicit source mode',()=>{
 assert.throws(()=>CLI.args([]),/Choose exactly/);
 assert.throws(()=>CLI.args(['--source-file','x','--fetch-once']),/Choose exactly/);
 assert.throws(()=>CLI.args(['--search-dir','x','--out-dir','y']),/never writes/);
});
test('v19: CLI does not allow unstated output while recovering',()=>assert.throws(()=>CLI.args(['--fetch-once']),/out-dir required/));
test('v19: CLI can inspect entirely offline',()=>assert.equal(CLI.args(['--source-file','/tmp/data.csv','--inspect-only'])['--inspect-only'],true));
test('v19: candidate only includes 4 allowed market columns',()=>{
 const rows=R.parsedUpstream(synthetic());const file=R.buildCandidate(rows).toString('utf8');assert.equal(file.split('\n')[0],R.HEAD);assert.equal(file.trimEnd().split('\n').length,523);
});
test('v19: cannot treat extra optional column as Shiller observations',()=>{
 const modified=synthetic().toString('utf8').replace('1980-01-01,100','1980-01-01,999,100');assert.throws(()=>R.parsedUpstream(Buffer.from(modified)),/width/);
});
