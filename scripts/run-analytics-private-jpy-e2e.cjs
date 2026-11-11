#!/usr/bin/env node
'use strict';
/** Offline private-data acceptance; never writes market data or credentials to public checkout. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {FILES,sha256,buildPrivateReport}=require('../lib/analytics/private-jpy-e2e.cjs');
const ROOT=fs.realpathSync(path.resolve(__dirname,'..'));
function isInside(target,ancestor){return target===ancestor||target.startsWith(ancestor+path.sep)}
function directory(given,{mustExist=false}={}){
 if(typeof given!=='string'||!path.isAbsolute(given))throw Error('Private paths must be absolute');
 if(isInside(path.resolve(given),ROOT)||isInside(ROOT,path.resolve(given)))throw Error('Private I/O folder must not overlap Git checkout');
 if(mustExist&&!fs.existsSync(given))throw Error('Missing private directory');
 if(fs.existsSync(given)){
  if(fs.lstatSync(given).isSymbolicLink())throw Error('Private directory symlink forbidden');
 }else fs.mkdirSync(given,{recursive:true,mode:0o700});
 const real=fs.realpathSync(given);
 if(isInside(real,ROOT)||isInside(ROOT,real))throw Error('Private I/O folder must not overlap Git checkout');
 if(!fs.statSync(real).isDirectory())throw Error('Private path is not a directory');
 return real;
}
function readPinned(file,label,maxBytes=16*1024*1024){
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.size>maxBytes)throw Error('Nonregular/oversized private file '+label);
 return fs.readFileSync(file);
}
function parseOptions(argv){
 const allowed=new Set(['--private-dir','--registry','--out-dir','--plan']);
 const found={};
 if(argv.length%2!==0||argv.length<6)throw Error('Usage: --private-dir /PRIVATE --registry /DATA_BRANCH/source_registry.v0.2.json --out-dir /PRIVATE/QA [--plan /PRIVATE/plan.json]');
 for(let i=0;i<argv.length;i+=2){
  if(!allowed.has(argv[i])||Object.prototype.hasOwnProperty.call(found,argv[i]))throw Error('Invalid or duplicate CLI option');
  found[argv[i]]=argv[i+1];
 }
 for(const k of ['--private-dir','--registry','--out-dir'])if(!found[k])throw Error('Missing required CLI option '+k);
 return found;
}
function main(argv=process.argv.slice(2)){
 const args=parseOptions(argv);
 const privateDir=directory(args['--private-dir'],{mustExist:true});
 const outDir=directory(args['--out-dir']);
 if(!path.isAbsolute(args['--registry']))throw Error('Registry path must be absolute');
 const registryBuffer=readPinned(args['--registry'],'canonical registry',2*1024*1024);
 const registry=JSON.parse(registryBuffer.toString('utf8'));
 const manifest=JSON.parse(readPinned(path.join(privateDir,'manifest.json'),'private handoff manifest',64*1024).toString('utf8'));
 const files=Object.fromEntries(Object.entries(FILES).map(([key,name])=>[key,readPinned(path.join(privateDir,name),name)]));
 let plan=null;
 if(args['--plan']){
  if(!path.isAbsolute(args['--plan']))throw Error('Plan path must be absolute');
  if(!isInside(fs.realpathSync(args['--plan']),privateDir))throw Error('Plan must stay in private directory');
  plan=JSON.parse(readPinned(args['--plan'],'private research plan',64*1024).toString('utf8'));
 }
 const report=buildPrivateReport({source_registry:registry,manifest,files,plan,registry_file_sha256:sha256(registryBuffer)});
 const id=sha256(Buffer.from(JSON.stringify({files:Object.fromEntries(Object.entries(FILES).map(([k])=>[k,sha256(files[k])])),plan,registry:report.pinned_registry_bytes_sha256}))).slice(0,18);
 const destination=path.join(outDir,'ANALYTICS_PRIVATE_JPY_QA_'+id+'.json');
 fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 // Do not print raw values or the input portfolio amounts to stdout.
 process.stdout.write(JSON.stringify({status:'PRIVATE_RESEARCH_QA_COMPLETE',report:destination,
  source_byte_checks:6,month_coverage:report.markets.complete_jpy_nominal_months,
  publication_approved:false,source_rights_approved:false})+'\n');
 return report;
}
if(require.main===module){try{main()}catch(e){console.error('PRIVATE_QA_FAILED: '+e.message);process.exitCode=1;}}
module.exports={main,parseOptions,directory,readPinned};