'use strict';
/** Inventory of privately decrypted evidence. Never copy rows or guess missing returns. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {privateDir}=require('./private-evidence-restore.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const PINNED=Object.freeze({
  shiller:'0cdb8a04bd14d104e53acbb982cf205eb4733371bb9140191b8c4b6e433bc55d',
  fed:'a21e31f9d9c9e71f28a396a9a9d447b92347653e7e22446566ecaae05391f257',
  cpi_headline:'29b63b7aa5cba598b6ab9d7fff839094a5068004bcd571afd20344e14e847c41',
  cpi_ex_rent:'42b396d0e71fa2105de064de167bd09f3a878bda542648cca816f03402a1e57f',
  fx_canonical:'da0f6244ab22c86d54a569f1288e82780d5d14d8c92f3f246b53f63126f880cd',
  cpi_canonical:'18da76e236057e1f59b2e7b224bfb7b0f2186d5586139d14b26c701ba74c36cc'
});
const REQUIREMENTS=Object.freeze([
  {key:'fed',folder:'fed_h10_locked_2000',name:'source_RAW.html',prefix:'FED_H10_USDJPY__'},
  {key:'cpi_headline',folder:'estat_jp_cpi',name:'source_RAW.csv',prefix:'CPI_JP_NATIONAL_2025_LINKED_HEADLINE__'},
  {key:'cpi_ex_rent',folder:'estat_jp_cpi',name:'source_RAW.csv',prefix:'CPI_JP_NATIONAL_2025_LINKED_EX_RENT__'},
  {key:'cpi_canonical',folder:'estat_jp_cpi',name:'JP_CPI_2025base_CANONICAL_PRIVATE.csv',prefix:null},
  // The original Fed workflow only archived usdjpy_monthly.csv, not the v0.10 canonical transfer CSV.
  {key:'fx_canonical',folder:'fed_h10_locked_2000',name:'normalized-fed-h10.csv',prefix:null},
  // Old Shiller research snapshot is NOT included in any of the five acquired encrypted artifacts.
  {key:'shiller',folder:null,name:'raw-shiller.csv',prefix:null}
]);
function scan(root){
  const found=[];
  function walk(d,rel=''){
    if(found.length>5000)throw Error('Too many private restored files');
    for(const name of fs.readdirSync(d)){
      const nextRel=rel?rel+'/'+name:name,absolute=path.join(d,name),stat=fs.lstatSync(absolute);
      if(stat.isSymbolicLink())throw Error('Restored evidence contains unexpected symlink');
      if(stat.isDirectory()){walk(absolute,nextRel);continue;}
      if(!stat.isFile()||stat.size>50*1024*1024)throw Error('Restored evidence contains nonregular/oversized file');
      found.push({rel:nextRel,absolute,bytes:stat.size});
    }
  }walk(root);return found;
}
function matchingRestoredPaths(files,requirement){
  return files.filter(x=>{
    if(path.posix.basename(x.rel)!==requirement.name)return false;
    if(requirement.folder===null)return x.rel===requirement.name;
    if(!x.rel.startsWith(requirement.folder+'/'))return false;
    if(requirement.prefix===null)return x.rel===requirement.folder+'/'+requirement.name;
    const after=x.rel.slice(requirement.folder.length+1).split('/');
    return after.length===2&&after[0].startsWith(requirement.prefix);
  });
}
function classify(files,requirement,root){
  const candidates=matchingRestoredPaths(files,requirement);
  if(candidates.length>1)throw Error('Ambiguous private original for '+requirement.key);
  if(candidates.length===0)return {source:requirement.key,status:'MISSING',reason:requirement.key==='shiller'?'NOT_INCLUDED_IN_ENCRYPTED_ARTIFACTS':requirement.key==='fx_canonical'?'NOT_GENERATED_BY_FED_SOURCE_WORKFLOW':'NOT_FOUND_IN_RESTORED_EVIDENCE'};
  const file=candidates[0],digest=sha(fs.readFileSync(file.absolute));
  if(digest!==PINNED[requirement.key])throw Error('Restored raw SHA differs from acquisition registry: '+requirement.key);
  return {source:requirement.key,status:'SOURCE_PIN_VERIFIED',relative_path:file.rel,bytes:file.bytes,raw_sha256:digest};
}
function inventoryRestoredEvidence(restoredDir){
  const root=privateDir(restoredDir);
  const reportPath=path.join(root,'PRIVATE_RESTORE_REPORT.json');
  if(!fs.existsSync(reportPath)||fs.lstatSync(reportPath).isSymbolicLink()||fs.statSync(reportPath).size>32*1024)
    throw Error('Missing private restoration receipt');
  const receipt=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  if(receipt.schema!=='ANALYTICS_PRIVATE_EVIDENCE_RESTORED_V11'||receipt.status!=='OFFLINE_DECRYPTION_AND_TAR_VALIDATION_COMPLETE'||receipt.results?.length!==5)
    throw Error('Restored archive proof is incomplete or unrecognized');
  for(const dataset of ['bls_cpi_us','estat_jp_cpi','fed_h10_locked_2000','world_bank_quarantine','fed_ddp_candidate_QUARANTINE']){
    const p=path.join(root,dataset);if(!fs.existsSync(p)||!fs.statSync(p).isDirectory())throw Error('Missing restored evidence group '+dataset);
  }
  const files=scan(root),inputs=REQUIREMENTS.map(r=>classify(files,r,root));
  return {status:'PRIVATE_EVIDENCE_INVENTORY_RESEARCH_ONLY',source_file_count:files.length,actual_market_values_not_loaded_into_portfolio:true,
    public_display_approved:false,raw_redistribution_approved:false,source_change_adr_approved:false,
    expected_v10_inputs:inputs,matched:inputs.filter(x=>x.status==='SOURCE_PIN_VERIFIED').length,required:inputs.length,
    ready_for_v10:inputs.every(x=>x.status==='SOURCE_PIN_VERIFIED'),
    note:'Two artifacts (World Bank spot and Fed DDP candidate) are quarantined. Missing source files are not synthesized or auto-replaced.'};
}
module.exports={PINNED,REQUIREMENTS,matchingRestoredPaths,inventoryRestoredEvidence};
