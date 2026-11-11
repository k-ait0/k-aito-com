#!/usr/bin/env node
'use strict';
/** Local only. Never transmit RSA private key or decrypted evidence. */
const {checkAllEncrypted,restorePrivateEvidence}=require('../lib/analytics/private-evidence-restore.cjs');
function options(args){
  const allow=new Set(['--artifact-dir','--private-key','--out-dir','--verify-only']);
  const out={};
  for(let i=0;i<args.length;i++){
    const arg=args[i];if(!allow.has(arg)||Object.prototype.hasOwnProperty.call(out,arg))throw Error('Invalid/duplicate option '+arg);
    if(arg==='--verify-only')out[arg]=true;
    else{if(i+1>=args.length)throw Error('Missing value after '+arg);out[arg]=args[++i];}
  }
  if(!out['--artifact-dir'])throw Error('Required: --artifact-dir /ABS/ARCHIVES');
  if(out['--verify-only']){
    if(out['--private-key']||out['--out-dir'])throw Error('Verify-only cannot read a key or write output');
  }else if(!out['--private-key']||!out['--out-dir'])throw Error('Restore requires --private-key and --out-dir');
  return out;
}
function main(argv=process.argv.slice(2)){
  const flags=options(argv);
  const result=flags['--verify-only']?checkAllEncrypted(flags['--artifact-dir']):restorePrivateEvidence({artifact_dir:flags['--artifact-dir'],private_key_path:flags['--private-key'],out_dir:flags['--out-dir']});
  // No plaintext, file entries, investment positions or key material in stdout.
  process.stdout.write(JSON.stringify(result)+'\n');return result;
}
if(require.main===module)try{main()}catch(e){console.error('ANALYTICS_PRIVATE_RESTORE_FAILED '+e.message);process.exitCode=1;}
module.exports={options,main};
