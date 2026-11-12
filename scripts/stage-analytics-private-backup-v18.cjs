#!/usr/bin/env node
'use strict';
/** Offline entry point for the existing user-held backup ZIP; never requires secrets. */
const {stageBackup}=require('../lib/analytics/private-backup-bridge.cjs');
function parse(argv){
 const valid=new Set(['--backup-zip','--out-dir','--inspect-only']);
 const o={};
 for(let i=0;i<argv.length;i++){
  const k=argv[i];if(!valid.has(k)||Object.hasOwn(o,k))throw Error('Unknown/repeated argument '+k);
  if(k==='--inspect-only'){o[k]=true;continue;}
  if(++i>=argv.length)throw Error('Missing path after '+k);
  o[k]=argv[i];
 }
 if(!o['--backup-zip']||(!o['--inspect-only']&&!o['--out-dir']))throw Error('Usage: --backup-zip ABS_PATH [--inspect-only | --out-dir ABS_PRIVATE_DIR]');
 return o;
}
function main(args=process.argv.slice(2)){
 const x=parse(args),r=stageBackup({backup_zip:x['--backup-zip'],out_dir:x['--out-dir'],inspect_only:!!x['--inspect-only']});
 console.log(JSON.stringify(r,null,2));return r;
}
if(require.main===module)try{main()}catch(e){console.error('PRIVATE_BACKUP_V018_BLOCKED: '+e.message);process.exitCode=2;}
module.exports={parse,main};
