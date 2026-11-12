#!/usr/bin/env node
'use strict';
const {inspectReadiness}=require('../lib/analytics/private-readiness-v20.cjs');
function parse(argv){
 const allowed=new Set(['--backup-zip','--private-key','--shiller','--search-dir']);const o={};
 for(let i=0;i<argv.length;i++){
  const k=argv[i];if(!allowed.has(k)||Object.hasOwn(o,k))throw Error('Unknown or duplicate option '+k);
  if(++i>=argv.length)throw Error('Missing absolute path after '+k);o[k]=argv[i];
 }
 if(!o['--backup-zip'])throw Error('Required: --backup-zip ABS_ENCRYPTED_BACKUP.zip');
 return o;
}
function main(argv=process.argv.slice(2)){
 const p=parse(argv);const out=inspectReadiness({backup_zip:p['--backup-zip'],private_key:p['--private-key'],
  shiller_file:p['--shiller'],search_dir:p['--search-dir']});
 console.log(JSON.stringify(out,null,2));if(out.status!=='READY_FOR_LOCAL_DECRYPTION_AND_SOURCE_QA')process.exitCode=2;return out;
}
if(require.main===module)try{main()}catch(e){console.error('PRIVATE_READINESS_V20_FAILED: '+e.message);process.exitCode=1;}
module.exports={parse,main};
