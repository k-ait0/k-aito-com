#!/usr/bin/env node
'use strict';
const path=require('node:path');
const {capture}=require('../lib/analytics/cpi-reference-capture-v030.cjs');
const ALLOWED=new Set(['--input','--public-key','--out-dir']);
function args(argv){
 const o={};for(let i=0;i<argv.length;i++){
  const k=argv[i];if(!ALLOWED.has(k)||Object.hasOwn(o,k)||i+1>=argv.length)throw Error('Invalid or duplicate command argument');o[k]=argv[++i];
 }
 if(Object.keys(o).length!==3)throw Error('Required --input ABS.csv --public-key ABS.pem --out-dir ABS_PRIVATE_DIR');
 for(const k of ALLOWED)if(!path.isAbsolute(o[k]))throw Error('All paths must be absolute');
 return o;
}
function main(argv=process.argv.slice(2)){
 const o=args(argv);const result=capture({input_path:o['--input'],public_key_path:o['--public-key'],out_dir:o['--out-dir']});
 process.stdout.write(JSON.stringify(result,null,2)+'\n');return result;
}
if(require.main===module)try{main();}catch(e){console.error('CPI_REFERENCE_V030_BLOCKED: '+e.message);process.exitCode=2;}
module.exports={args,main};
