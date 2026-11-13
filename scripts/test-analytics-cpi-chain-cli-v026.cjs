'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const cli=require('./run-analytics-private-cpi-chain-v26.cjs');
const script=path.resolve(__dirname,'run-analytics-private-cpi-chain-v26.cjs');
const sample=path.resolve(__dirname,'../examples/cpi-chain-v026-SYNTHETIC.json');
function setup(){const d=fs.mkdtempSync(path.join(os.tmpdir(),'analytics-cpi-v026-'));const input=path.join(d,'private-input.json');fs.copyFileSync(sample,input);return {d,input,out:path.join(d,'out')};}
function call(...args){return cp.spawnSync(process.execPath,[script,...args],{encoding:'utf8'});}
test('CLI parser rejects both inspect and output, and repeated flags',()=>{
 assert.throws(()=>cli.parse(['--input','a','--inspect-only','--out-dir','b']),/Usage/);
 assert.throws(()=>cli.parse(['--input','a','--input','b','--inspect-only']),/duplicate/);
});
test('offline inspection leaves private directory untouched',()=>{
 const x=setup();try{const r=call('--input',x.input,'--inspect-only');assert.equal(r.status,0,r.stderr);const j=JSON.parse(r.stdout);assert.equal(j.qa,'CPI_ASOF_CHAIN_V026_ALGORITHM_ONLY');assert.equal(j.windows_with_base_transitions,1);assert.equal(j.verified_archive_bytes,false);assert.equal(fs.existsSync(x.out),false);assert.doesNotMatch(r.stdout,/"levels"\s*:/);}finally{fs.rmSync(x.d,{recursive:true,force:true});}
});
test('private report is written once and duplicate immutable output is rejected',()=>{
 const x=setup();try{const first=call('--input',x.input,'--out-dir',x.out);assert.equal(first.status,0,first.stderr);const p=JSON.parse(first.stdout).private_report_path;assert.ok(fs.existsSync(p));const j=JSON.parse(fs.readFileSync(p,'utf8'));assert.equal(j.report.windows[0].ending_assets_yen,6790);const repeated=call('--input',x.input,'--out-dir',x.out);assert.notEqual(repeated.status,0);assert.match(repeated.stderr,/EEXIST/);}finally{fs.rmSync(x.d,{recursive:true,force:true});}
});
test('input symlink is forbidden even if it points to a valid file',()=>{
 const x=setup();try{const alias=path.join(x.d,'alias.json');fs.symlinkSync(x.input,alias);const r=call('--input',alias,'--inspect-only');assert.notEqual(r.status,0);assert.match(r.stderr,/non-symlink/);}finally{fs.rmSync(x.d,{recursive:true,force:true});}
});
test('absolute private path required and code checkout cannot be output folder',()=>{
 const x=setup();try{assert.notEqual(call('--input','relative.json','--inspect-only').status,0);
 const r=call('--input',x.input,'--out-dir',path.resolve(__dirname,'..'));assert.notEqual(r.status,0);assert.match(r.stderr,/overlaps/);
 }finally{fs.rmSync(x.d,{recursive:true,force:true});}
});
