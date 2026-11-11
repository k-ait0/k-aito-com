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
module.exports={evaluateResearchDataUse,assertApproved,ALLOWED_USAGE};
