#!/usr/bin/env node
'use strict';
/** Offline CPI release-vintage QA. Never sends private data or writes into checkout. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {runRollingPortfolioCpiAsOf}=require('../lib/analytics/rolling-portfolio-cpi-asof.cjs');
const MAX_INPUT_BYTES=100*1024*1024;
function parse(argv){
 const o={};for(let i=0;i<argv.length;i++){
  const k=argv[i];if(!['--input','--out-dir','--inspect-only'].includes(k)||Object.prototype.hasOwnProperty.call(o,k))throw Error('Invalid or duplicate argument '+k);
  if(k==='--inspect-only'){o[k]=true;continue;}
  if(++i===argv.length)throw Error('Missing value after '+k);o[k]=argv[i];
 }
 if(!o['--input']||(!o['--inspect-only']&&!o['--out-dir'])||(o['--inspect-only']&&o['--out-dir']))throw Error('Usage: --input /PRIVATE/CONFIG.json [--inspect-only | --out-dir /PRIVATE/OUTPUT]');
 return o;
}
function outsideCheckout(p,label){
 if(!path.isAbsolute(p))throw Error('Absolute private path required for '+label);
 const real=fs.realpathSync(p),checkout=fs.realpathSync(path.resolve(__dirname,'..'));
 if(real===checkout||real.startsWith(checkout+path.sep)||checkout.startsWith(real+path.sep))throw Error('Private data path overlaps source checkout');
 return real;
}
function main(argv=process.argv.slice(2)){
 const o=parse(argv);
 const file=outsideCheckout(o['--input'],'input');
 const stat=fs.lstatSync(o['--input']);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_INPUT_BYTES)throw Error('Input must be non-symlink JSON file <=100MB');
 const raw=fs.readFileSync(file);
 if(raw.length>MAX_INPUT_BYTES)throw Error('Input too large');
 let input;try{input=JSON.parse(raw.toString('utf8'));}catch(e){throw Error('Invalid JSON config');}
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid top-level config');
 const allowed=new Set(['monthly_market_returns','cpi_vintage_snapshots','horizon_months','portfolio','cashflow_plan','market_mode','cashflow_timing']);
 for(const k of Object.keys(input))if(!allowed.has(k))throw Error('Unsupported top-level config key '+k);
 const r=runRollingPortfolioCpiAsOf(input);
 const safe={qa:'CPI_ASOF_V025_ALGORITHM_ONLY',input_sha256:crypto.createHash('sha256').update(raw).digest('hex'),
   status:r.status,market_mode:r.market_mode,cashflow_timing:r.cashflow_timing,
   published_vintage_count:input.cpi_vintage_snapshots.length,
   complete_market_windows:r.complete_market_windows,complete_windows:r.complete_windows,
   missing_published_cpi_windows:r.excluded_due_to_no_published_cpi,
   missing_base_month_windows:r.excluded_due_to_missing_baseline_in_vintage,
   verified_actual_release_dates:false,verified_archive_bytes:false,
   publication_approved:false};
 if(o['--inspect-only']){process.stdout.write(JSON.stringify(safe,null,2)+'\n');return safe;}
 const dest=path.resolve(o['--out-dir']);
 if(!path.isAbsolute(o['--out-dir']))throw Error('Output must use absolute private path');
 fs.mkdirSync(dest,{recursive:true,mode:0o700});
 const realOut=outsideCheckout(dest,'output');
 const name='cpi_asof_v025_'+safe.input_sha256.slice(0,12)+'_PRIVATE.json';
 const filename=path.join(realOut,name);
 // Full per-window results remain exclusively in the private directory, no raw level rows.
 fs.writeFileSync(filename,JSON.stringify({audit:safe,report:r},null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({...safe,private_report_path:filename},null,2)+'\n');
 return {...safe,private_report_path:filename};
}
if(require.main===module)try{main()}catch(e){console.error('ANALYTICS_CPI_ASOF_V025_BLOCKED: '+e.message);process.exitCode=2;}
module.exports={parse,outsideCheckout,main};
