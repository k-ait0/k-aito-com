'use strict';
/** v0.12. Offline, private-only bridge from verified restoration to pinned v0.10 QA.
 * No new market data, imputation, implicit FX channel switch, or network access.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {parseFedHistoricalRaw,csvRecords,buildPrivateV10Report}=require('./private-normalization-parity.cjs');
const {canonicalRows,HEAD}=require('./private-canonical-csv.cjs');
const {inventoryRestoredEvidence,PINNED}=require('./restored-evidence-inventory.cjs');
const {privateDir}=require('./private-evidence-restore.cjs');
const {FILES,sha256}=require('./private-jpy-e2e.cjs');
const {gitBlobSha,PINNED_REGISTRY_BLOB_SHA}=require('../../scripts/run-analytics-private-jpy-e2e-v10.cjs');
const CHARS=/^[0-9a-f]{64}$/;
const FED_MONTHLY_HEAD='month,observation_date,usd_jpy,month_status';
function assertPrivateFile(p,label,limit=16*1024*1024){
 if(typeof p!=='string'||!path.isAbsolute(p))throw Error(label+' must be an absolute private file path');
 const real=fs.realpathSync(p),stat=fs.lstatSync(p);
 if(stat.isSymbolicLink()||!stat.isFile()||stat.size<=0||stat.size>limit)throw Error(label+' is a symlink, non-file, empty, or oversized');
 // The private-directory gate is inherited from the offline v0.10 verifier.
 const repo=path.resolve(__dirname,'../..');
 if(real===repo||real.startsWith(repo+path.sep))throw Error(label+' must be outside repository');
 return fs.readFileSync(real);
}
function compareHash(raw,expected,label){
 if(!CHARS.test(expected||''))throw Error('Missing pinned checksum '+label);
 const actual=sha256(raw);
 if(actual!==expected)throw Error('Pinned SHA256 mismatch: '+label);
 return actual;
}
/** Reproduce a *candidate* canonical CSV. It becomes accepted only if its byte SHA is pinned. */
function reconstructFedCanonical({html,monthly_csv,raw_sha256,expected_canonical_sha256}={}){
 if(!Buffer.isBuffer(html)||!Buffer.isBuffer(monthly_csv))throw Error('Fed raw HTML and acquisition monthly CSV bytes required');
 compareHash(html,raw_sha256,'Fed H10 raw');
 const original=parseFedHistoricalRaw(html);
 const txt=monthly_csv.toString('utf8');
 if(txt.includes('\ufffd')||txt.includes('\r')||!txt.endsWith('\n'))throw Error('Fed acquisition monthly CSV must be UTF-8 LF');
 const lines=txt.slice(0,-1).split('\n');
 if(lines.shift()!==FED_MONTHLY_HEAD)throw Error('Fed acquisition monthly CSV header mismatch');
 const selected=[];
 let previous='';
 for(const line of lines){
  const v=csvRecords(line+'\n');
  if(v.length!==1||v[0].length!==4)throw Error('Bad Fed acquisition row width');
  const [month,date,rate,status]=v[0];
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month<=previous)throw Error('Invalid/unsorted Fed acquisition month');
  previous=month;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!date.startsWith(month)||!/^\d+(?:\.\d+)?$/.test(rate)||!(Number(rate)>0))throw Error('Invalid Fed date or rate');
  if(status==='LATEST_MONTH_PROVISIONAL'){
    if(month!==original.last_month_provisional||line!==lines.at(-1))throw Error('Fed provisional month must be last');
    continue;
  }
  if(status!=='COMPLETE_OBSERVED')throw Error('Unknown Fed month status');
  if(!original.finalMonths.has(month)||Number(original.finalMonths.get(month))!==Number(rate))throw Error('Fed raw-to-acquisition monthly value mismatch: '+month);
  selected.push([month,rate]);
 }
 if(selected.length!==original.finalMonths.size||lines.length!==original.finalMonths.size+1)throw Error('Fed daily and monthly coverage mismatch');
 const originalMonths=[...original.finalMonths.keys()];
 if(selected.some(([month],i)=>month!==originalMonths[i]))throw Error('Fed raw-to-acquisition month ordering mismatch');
 const rows=selected.map(([month,value])=>[month,'FED_H10_USDJPY_MONTH_END',value,'JPY_PER_USD','JPY','FX_RATE','OBSERVED','FED_BOARD','NOT_APPLICABLE',raw_sha256,''].join(','));
 const bytes=Buffer.from([HEAD.join(','),...rows].join('\n')+'\n','utf8');
 // Parsing is still useful when the byte fingerprint differs; it detects format drift.
 canonicalRows(bytes,{label:'rebuilt Fed H10',allowedSeries:new Set(['FED_H10_USDJPY_MONTH_END'])});
 const actualSha=sha256(bytes),matches=actualSha===expected_canonical_sha256;
 return {bytes,proof:{status:matches?'PINNED_BYTE_MATCH':'RECONSTRUCTED_CANDIDATE_HASH_MISMATCH',
    expected_canonical_sha256,computed_canonical_sha256:actualSha,
    complete_months:selected.length,first_month:selected[0]?.[0],last_month:selected.at(-1)?.[0],
    provisional_month_excluded:original.last_month_provisional}};
}
function listedInput(inventory,key,root){
 const entry=inventory.expected_v10_inputs.find(x=>x.source===key);
 if(!entry||entry.status!=='SOURCE_PIN_VERIFIED')throw Error('Verified restored original missing: '+key);
 const p=path.resolve(root,entry.relative_path);
 if(!p.startsWith(root+path.sep))throw Error('Unsafe inventory relative path');
 const bytes=assertPrivateFile(p,key);
 compareHash(bytes,PINNED[key],key);
 return {path:p,bytes};
}
function fedMonthlyPath(fedSource){
 const p=path.join(path.dirname(fedSource),'usdjpy_monthly.csv');
 return assertPrivateFile(p,'Fed acquisition monthly CSV');
}
function validRegistry(p){
 const buf=assertPrivateFile(p,'canonical source registry',2*1024*1024);
 if(gitBlobSha(buf)!==PINNED_REGISTRY_BLOB_SHA)throw Error('Unreviewed source registry Git blob');
 return JSON.parse(buf.toString('utf8'));
}
function examineRestoredHandoff({restore_dir,shiller_file,manifest_file,registry_file,fed_canonical_file}={}){
 const root=privateDir(restore_dir);
 const inventory=inventoryRestoredEvidence(root);
 const blockers=[];
 const resolved={};
 for(const key of ['fed','cpi_headline','cpi_ex_rent','cpi_canonical']){
   const entry=inventory.expected_v10_inputs.find(x=>x.source===key);
   if(entry?.status!=='SOURCE_PIN_VERIFIED')blockers.push('MISSING_VERIFIED_'+key.toUpperCase());
   else resolved[key]=listedInput(inventory,key,root);
 }
 let reconstructed=null;
 if(resolved.fed){
  const canonicalRaw=inventory.expected_v10_inputs.find(x=>x.source==='fx_canonical');
  if(canonicalRaw?.status==='SOURCE_PIN_VERIFIED'){
    resolved.fx_canonical=listedInput(inventory,'fx_canonical',root);
  }else {
    try{
     reconstructed=reconstructFedCanonical({html:resolved.fed.bytes,monthly_csv:fedMonthlyPath(resolved.fed.path),
       raw_sha256:PINNED.fed,expected_canonical_sha256:PINNED.fx_canonical});
     if(reconstructed.proof.status==='PINNED_BYTE_MATCH')resolved.fx_canonical={bytes:reconstructed.bytes,derived:true};
     else blockers.push('FED_CANONICAL_GENERATED_HASH_DIFFERS_FROM_SOURCE_REGISTRY');
    }catch(e){blockers.push('FED_CANONICAL_RECONSTRUCTION_FAILED: '+e.message)}
    if(!resolved.fx_canonical&&fed_canonical_file){
     const bytes=assertPrivateFile(fed_canonical_file,'user-provided Fed canonical');
     compareHash(bytes,PINNED.fx_canonical,'Fed canonical');
     resolved.fx_canonical={bytes,derived:false};
     // Authorized pinned canonical replaces the candidate-hash blocker only.
     for(let i=blockers.length-1;i>=0;i--)if(blockers[i].startsWith('FED_CANONICAL_'))blockers.splice(i,1);
    }
  }
 }
 if(shiller_file){
   const bytes=assertPrivateFile(shiller_file,'legacy Shiller private original');
   compareHash(bytes,PINNED.shiller,'legacy Shiller raw');
   resolved.shiller={bytes};
 }else blockers.push('SHILLER_PRIVATE_ORIGINAL_NOT_SUPPLIED');
 let manifest=null,registry=null;
 if(manifest_file){
   manifest=JSON.parse(assertPrivateFile(manifest_file,'authorized private manifest',64*1024).toString('utf8'));
 }else blockers.push('SOURCE_PROVENANCE_MANIFEST_NOT_SUPPLIED');
 if(registry_file){registry=validRegistry(registry_file);}
 else blockers.push('PINNED_SOURCE_REGISTRY_NOT_SUPPLIED');
 return {status:blockers.length?'BLOCKED_PRIVATE_INPUTS':'READY_FOR_FULL_PRIVATE_QA',
   blockers,inventory:{matched:inventory.matched,required:inventory.required},
   fed_reconstruction:reconstructed?.proof??null,
   ready:!blockers.length,resolved,manifest,registry};
}
function preparePrivateHandoff({restore_dir,shiller_file,manifest_file,registry_file,fed_canonical_file,plan_file,out_dir}={}){
 const check=examineRestoredHandoff({restore_dir,shiller_file,manifest_file,registry_file,fed_canonical_file});
 if(!check.ready)throw Error('PRIVATE_HANDOFF_BLOCKED: '+check.blockers.join('; '));
 const out=privateDir(out_dir,{create:true}),source=privateDir(restore_dir);
 if(out===source||out.startsWith(source+path.sep)||source.startsWith(out+path.sep))throw Error('Private output and restored evidence may not overlap');
 const files=Object.fromEntries(Object.keys(FILES).map(key=>[key,check.resolved[key].bytes]));
 const plan=plan_file?JSON.parse(assertPrivateFile(plan_file,'private research plan',64*1024).toString('utf8')):null;
 // Must pass the existing pinned-byte QA and independent raw normalization BEFORE writing files.
 const proof=buildPrivateV10Report({source_registry:check.registry,manifest:check.manifest,files,plan});
 if(!proof.raw_to_canonical_normalization_independently_recomputed||!proof.source_raw_value_matches_canonical||proof.publication_approved!==false)throw Error('Core QA proof incomplete');
 const final=path.join(out,'analytics_private_handoff_v12');
 if(fs.existsSync(final))throw Error('Refusing to overwrite existing private handoff');
 const stage=fs.mkdtempSync(path.join(out,'.analytics_handoff_staging_'));
 let done=false;
 try{
   fs.chmodSync(stage,0o700);
   for(const [key,name] of Object.entries(FILES))fs.writeFileSync(path.join(stage,name),files[key],{mode:0o600,flag:'wx'});
   fs.writeFileSync(path.join(stage,'manifest.json'),JSON.stringify(check.manifest,null,2)+'\n',{mode:0o600,flag:'wx'});
   fs.writeFileSync(path.join(stage,'ANALYTICS_PRIVATE_JPY_QA_V10.json'),JSON.stringify(proof,null,2)+'\n',{mode:0o600,flag:'wx'});
   const receipt={schema:'ANALYTICS_PRIVATE_HANDOFF_V12',private_only:true,publication_approved:false,
     data_qa_passed:true,source_origin_authenticated_at_provider:false,
     verified_input_bytes:Object.fromEntries(Object.entries(files).map(([key,buf])=>[key,sha256(buf)])),
     fed_canonical_generated_and_byte_pinned:check.resolved.fx_canonical.derived===true,
     market:{first_month:proof.markets.first_return_month,last_month:proof.markets.last_return_month,
       complete_jpy_months:proof.markets.complete_jpy_nominal_months},
     model_tests_executed:plan!==null,model_horizons:proof.model_tests.map(x=>x.horizon_months),raw_and_canonical_parity:true,
     source_rights_approved:false,description:'Local private research transfer only; no original observations included in receipt.'};
   fs.writeFileSync(path.join(stage,'PRIVATE_HANDOFF_RECEIPT.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
   fs.renameSync(stage,final);done=true;
   return {status:'PRIVATE_HANDOFF_PREPARED_AND_RAW_QA_PASSED',private_output_dir:final,
     fed_canonical_byte_pin_matched:true,verified_files:6,market:receipt.market,
     publication_approved:false,source_rights_approved:false,model_tests_executed:plan!==null};
 }finally{if(!done)fs.rmSync(stage,{recursive:true,force:true});}
}
module.exports={reconstructFedCanonical,examineRestoredHandoff,preparePrivateHandoff};
