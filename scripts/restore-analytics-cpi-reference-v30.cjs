#!/usr/bin/env node
'use strict';
const path=require('node:path');const R=require('../lib/analytics/cpi-reference-restore-v030.cjs');
function flags(argv){const o={},allow=new Set(['--encrypted-json','--private-key','--out-dir']);
 for(let i=0;i<argv.length;i++){const k=argv[i];if(!allow.has(k)||Object.hasOwn(o,k)||i+1>=argv.length)throw Error('Invalid command flags');o[k]=argv[++i];}
 if(Object.keys(o).length!==3||Object.values(o).some(v=>!path.isAbsolute(v)))throw Error('All 3 absolute paths required');return o;}
function main(argv=process.argv.slice(2)){
 const o=flags(argv);const r=R.restore({encrypted_json:o['--encrypted-json'],private_key_path:o['--private-key'],out_dir:o['--out-dir']});
 process.stdout.write(JSON.stringify(r,null,2)+'\n');return r;
}
if(require.main===module)try{main();}catch{console.error('CPI_REFERENCE_V030_RESTORE_BLOCKED: package, private key, hash or output validation failed');process.exitCode=2;}
module.exports={flags,main};
