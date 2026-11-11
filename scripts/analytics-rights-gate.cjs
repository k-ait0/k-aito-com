#!/usr/bin/env node
'use strict';
/*
 * Research-only rights decision adapter. Fail closed; NEVER infer a license from public
 * website availability, data presence, a CC-BY headline, user-provided credentials,
 * historical full-coverage, or one provider's authorization for another provider.
 *
 * No network or raw observations. This is an input gate proposal, NOT an Analytics engine patch.
 */
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const load=path=>JSON.parse(fs.readFileSync(require('node:path').join(ROOT,path),'utf8'));
const RIGHTS=load('research/analytics/commercial_data_rights_triage.v0.1.json');
const COMMODITIES=load('research/analytics/worldbank_71_series_triage.v0.1.json');
const SOURCE_REGISTRY=load('research/analytics/source_registry.v0.2.json');
const ALLOWED_USAGE=new Set(RIGHTS.separate_use_cases);
const PERSONAL_SCOPE=load('research/analytics/personal_use_scope.v0.1.json');

function evaluateResearchDataUse(id,usage){
 if(typeof id!=='string'||typeof usage!=='string')return {allowed:false,reason:'INVALID_INPUT'};
 if(!ALLOWED_USAGE.has(usage))return {allowed:false,reason:'UNRECOGNIZED_USE_CASE',id,usage};
 const commodity=COMMODITIES.series.find(x=>x.id===id);
 if(commodity){
   const parent=SOURCE_REGISTRY.assets.find(x=>x.asset_id===(commodity.name==='Gold'?'GOLD':'EXGOLD_COMMODITY'));
   if(!parent||parent.provider_id!=='WORLD_BANK_PINK'||parent.site_use_approved!==true)
      return {allowed:false,reason:'NO_SERIES_SPECIFIC_THIRD_PARTY_RIGHTS',id,usage,required_evidence:'PER_SERIES_LICENSE_AND_PROJECT_RELEASE',provider:'WORLD_BANK_PINK'};
   return {allowed:false,reason:'COMMODITY_SERIES_LICENSE_NOT_SIGNED',id,usage,required_evidence:'LICENSE_SCOPE_PER_USE_CASE'};
 }
 const x=RIGHTS.entries.find(y=>y.id===id);
 if(!x)return {allowed:false,reason:'UNKNOWN_SERIES',id,usage};
 const source=[...SOURCE_REGISTRY.assets,...SOURCE_REGISTRY.auxiliary].find(y=>(y.asset_id||y.aux_id)===id);
 if(!source||source.provider_id!==x.provider||source.source_lock!==x.source_lock)
   return {allowed:false,reason:'PROVIDER_OR_SOURCE_LOCK_MISMATCH',id,usage};
 if(x.permissions_by_use[usage]!=='APPROVED')
   return {allowed:false,reason:'USE_CASE_NOT_APPROVED',id,usage,provider:x.provider,official_rights_url:x.primary_official_url,required_evidence:x.rights_class};
 // Never allow internal research-only approval to bypass the commercial/production distribution gate.
 if(usage!=='research_and_metadata'&&(x.permissions_by_use.production_activation!=='APPROVED'||source.site_use_approved!==true))
   return {allowed:false,reason:'RELEASE_OR_SOURCE_GATE_UNAPPROVED',id,usage};
 if(usage!=='research_and_metadata'&&(!x.license_evidence||!x.license_evidence.contract_id||!x.license_evidence.explicit_use_cases?.includes(usage)))
   return {allowed:false,reason:'MISSING_SIGNED_LICENSE_EVIDENCE',id,usage};
 if(id==='FX'&&SOURCE_REGISTRY.acquisition?.fed_ddp_source_change_research_candidate_20261111?.status==='TECHNICALLY_VALIDATED_ADR_DRAFT_NO_SOURCE_LOCK_CHANGE')
   return {allowed:false,reason:'FED_LONG_HISTORY_ADR_NOT_APPROVED',id,usage};
 return {allowed:true,reason:'EXPLICIT_USE_CASE_AND_SOURCE_RIGHTS_RELEASED',id,usage};
}

/*
 * Personal/noncommercial/local-only RESEARCH decision, independent of the commercial gate.
 * A pass is an application policy for offline exploration, NOT a representation that a
 * data vendor granted a new license. User-provided data still must be lawfully obtained.
 *
 * options: { environment:'LOCAL_SINGLE_USER', input_type:'SYNTHETIC'|
 *     'OFFICIAL_PRIVATE_CSV'|'PUBLISHED_EXPLORATORY'|'PERSONALLY_LAWFUL_INDEX_FILE',
 *     explicit_exploratory_opt_in:true|false, source_channel:'PINNED'|'DDP_CANDIDATE' }
 */
function evaluatePersonalLocalUse(id,options={}){
 const deny=(reason,extra={})=>({allowed:false,mode:'PERSONAL_SINGLE_USER_LOCAL_RESEARCH',reason,id,...extra});
 if(typeof id!=='string'||!options||typeof options!=='object'||Array.isArray(options))
   return deny('INVALID_INPUT');
 if(options.environment!=='LOCAL_SINGLE_USER')
   return deny('NOT_SINGLE_USER_LOCAL');
 if(options.public_server||options.shared_link||options.network_export||options.third_party_access||options.trains_ai_model)
   return deny('PERSONAL_SCOPE_VIOLATION');
 const x=RIGHTS.entries.find(e=>e.id===id),c=COMMODITIES.series.find(e=>e.id===id);
 if(!x&&!c)return deny('UNKNOWN_SERIES');
 const rights=x||RIGHTS.entries.find(e=>e.id===(c.name==='Gold'?'GOLD':'EXGOLD_COMMODITY'));
 const registered=[...SOURCE_REGISTRY.assets,...SOURCE_REGISTRY.auxiliary].find(e=>(e.asset_id||e.aux_id)===rights?.id);
 if(!rights||!registered||registered.provider_id!==rights.provider||registered.source_lock!==rights.source_lock)
   return deny('PROVIDER_OR_SOURCE_LOCK_MISMATCH');
 const allowed=(reason,warnings,dataQuality)=>({allowed:true,mode:'PERSONAL_SINGLE_USER_LOCAL_RESEARCH',
     reason,id,provider:rights.provider,local_only:true,commercial_approved:false,public_display_approved:false,
     source_lock_unchanged:true,quality:dataQuality,warnings});
 if(options.input_type==='SYNTHETIC')
   return allowed('SIMULATED_DATA_ONLY',['Do not mislabel simulated observations as official history'],'SYNTHETIC');
 if(c){
   if(options.input_type!=='PUBLISHED_EXPLORATORY'||options.explicit_exploratory_opt_in!==true)
     return deny('COMMODITY_ORIGIN_AND_LICENSE_REVIEW_REQUIRED');
   return allowed('PUBLISHED_COMMODITY_EXPLORATION_ONLY',[
      'PUBLISHED_LEVEL_STATUS_UNVERIFIED: forecast/estimated months not classified',
      'Commodity quote is not an investable total-return asset',
      'Third-party source terms are unverified; do not redistribute or scrape',
      'Exclude from validated OBSERVED results and commercial engine'
   ],'PUBLISHED_UNVERIFIED_QUARANTINED');
 }
 if(PERSONAL_SCOPE.research_data_policy.official_public_source_ids.includes(id)&&options.input_type==='OFFICIAL_PRIVATE_CSV'){
   if(id==='FX'&&options.source_channel==='DDP_CANDIDATE')
     return allowed('OFFICIAL_FED_DDP_CANDIDATE_PRIVATE_RESEARCH',[
       'Fed SOURCE_CHANGE_ADR-0001 remains DRAFT and live source is unchanged',
       'Use pinned validated DDP candidate for exploration only, not active publication'
     ],'OFFICIAL_OBSERVED_CANDIDATE');
   if(id==='FX'&&options.source_channel!=='PINNED')
     return deny('FED_SOURCE_CHANNEL_UNRECOGNIZED');
   return allowed('OFFICIAL_PERSONAL_LOCAL_ANALYSIS',[
      'Not an investment total-return series',
      'No raw data sharing or public hosting'
   ],'OBSERVED_OFFICIAL_PRIVATE');
 }
 if(id==='GOLD'&&options.input_type==='PUBLISHED_EXPLORATORY'&&options.explicit_exploratory_opt_in===true)
   return allowed('GOLD_EXPLORATORY_QUARANTINE_ONLY',[
     'PUBLISHED_LEVEL_STATUS_UNVERIFIED: individual forecast status unverified',
     '2025-06 price source break and upstream third-party rights unresolved',
     'Spot reference, not an investable total-return product; never validated OBSERVED'
   ],'PUBLISHED_UNVERIFIED_QUARANTINED');
 if(PERSONAL_SCOPE.research_data_policy.manual_lawful_self_use_index_ids.includes(id)
    &&options.input_type==='PERSONALLY_LAWFUL_INDEX_FILE'
    &&options.automated_collection!==true)
   return allowed('MANUAL_LAWFUL_INDEX_SELF_USE_ONLY',[
      'JPX permits own-use as a market indicator, not public display or unlicensed scraping',
      'Obtain the input via a lawful personal channel; any AI/bulk use may have extra terms',
      'Total-return and price-return definitions must be verified before simulation'
   ],'SOURCE_TERMS_DEPENDENT');
 return deny('REAL_DATA_SOURCE_TERMS_OR_PROVENANCE_NOT_CLEARED_FOR_AUTOMATION',
       {official_rights_url:rights.primary_official_url});
}

function assertApproved(id,usage){
 const result=evaluateResearchDataUse(id,usage);
 if(!result.allowed){const e=new Error('DATA_RIGHTS_BLOCKED: '+JSON.stringify(result));e.code='DATA_RIGHTS_BLOCKED';throw e}
 return result;
}
if(require.main===module){
 const [id,usage]=process.argv.slice(2);
 const result=evaluateResearchDataUse(id,usage);
 console.log(JSON.stringify(result,null,2));
 if(!result.allowed)process.exitCode=2;
}
module.exports={evaluateResearchDataUse,assertApproved,evaluatePersonalLocalUse,ALLOWED_USAGE};
