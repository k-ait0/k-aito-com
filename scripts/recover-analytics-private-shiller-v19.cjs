#!/usr/bin/env node
'use strict';
/** Offline by default. Optional one-shot pinned download; NEVER publish market rows. */
const R=require('../lib/analytics/private-shiller-recovery.cjs');
function args(argv){
 const o={};for(let i=0;i<argv.length;i++){
  const k=argv[i];if(!['--search-dir','--source-file','--fetch-once','--inspect-only','--out-dir'].includes(k)||Object.hasOwn(o,k))throw Error('Invalid or duplicate option: '+k);
  if(k==='--fetch-once'||k==='--inspect-only'){o[k]=true;continue;}
  if(++i===argv.length)throw Error('Missing path for '+k);o[k]=argv[i];
 }
 if([o['--search-dir'],o['--source-file'],o['--fetch-once']].filter(Boolean).length!==1)throw Error('Choose exactly one of --search-dir / --source-file / --fetch-once');
 if(o['--search-dir']&&o['--out-dir'])throw Error('Scan mode never writes files');
 if(!o['--search-dir']&&!o['--inspect-only']&&!o['--out-dir'])throw Error('--out-dir required to write recovered source');
 return o;
}
async function main(argv=process.argv.slice(2)){
 const o=args(argv);
 if(o['--search-dir']){const r=R.locateExistingOriginal(o['--search-dir']);console.log(JSON.stringify(r,null,2));if(!r.matches.length)process.exitCode=2;return r;}
 const raw=o['--source-file']?R.strictInput(o['--source-file'],'upstream source'):await R.fetchPinnedOnce();
 // Re-identify bytes: the old Shiller snapshot must never be silently replaced.
 const result=R.analyzeUpstream(raw);
 const safe={...result,match:result.match?.format??null};
 if(result.match&&!o['--inspect-only'])safe.restored=R.writeMatchedPrivate(result,o['--out-dir']);
 console.log(JSON.stringify(safe,null,2));if(!result.match)process.exitCode=2;return safe;
}
if(require.main===module)main().catch(e=>{console.error('PRIVATE_SHILLER_V019_BLOCKED: '+e.message);process.exitCode=1});
module.exports={args,main};
