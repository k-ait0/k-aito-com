#!/usr/bin/env node
'use strict';
/* Fail-closed rights and series definition guard. Metadata only; no source value copies, no downloads.
 * Exit nonzero if a release gate is accidentally enabled or a source or series is dropped.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const load=name=>JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));
const REG=load('research/analytics/source_registry.v0.2.json');
const TRIAGE=load('research/analytics/worldbank_71_series_triage.v0.1.json');
const RIGHTS=load('research/analytics/commercial_data_rights_triage.v0.1.json');
const flags=(c)=>TRIAGE.series.filter(x=>x.flags.includes(c)).length;
function check(){
 assert.equal(REG.policy.no_auto_fallback,true);
 assert.equal(REG.policy.public_display_default,false);
 assert.equal(REG.assets.length,12);assert.equal(REG.auxiliary.length,8);
 const sourceItems=[...REG.assets,...REG.auxiliary];
 assert(sourceItems.every(x=>x.source_lock.startsWith('LOCKED_')&&x.site_use_approved===false),'Never release source data by default');
 assert.equal(TRIAGE.source,'WORLD_BANK_PINK');
 assert.equal(TRIAGE.series.length,71);
 assert.equal(TRIAGE.published_raw_workbook_sha256,'3c8d9d8dbb48342fdbf24777c39a8ce8964cc2fd0958f72f6779e6e4ad99cde2');
 const ids=new Set(),rows=new Set();
 for(let i=0;i<TRIAGE.series.length;i++){
   const x=TRIAGE.series[i];
   assert.equal(x.id,'PINK_COLUMN_'+String(i+2).padStart(2,'0'),'Columns correspond to workbook original column index');
   assert(!ids.has(x.id));ids.add(x.id);
   assert(Number.isInteger(x.description_row)&&x.description_row>=4&&x.description_row<=105);
   assert(!rows.has(x.description_row),'Every 1 of 71 columns maps to a distinct Description row');
   rows.add(x.description_row);
   assert(/^[FBETW]*$/.test(x.flags));
   assert('DITSAQU'.includes(x.reference_kind)&&x.reference_kind.length===1);
   assert.equal(x.site_approved,false);
   assert.equal(x.commercial_engine,'NOT_LICENSED');
   assert.equal(x.raw_redistribution,'NOT_APPROVED');
 }
 assert.deepEqual([flags('F'),flags('B'),flags('T'),flags('W')],[47,35,5,3]);
 assert.deepEqual(new Set(TRIAGE.series.filter(x=>x.flags.includes('T')).map(x=>x.name)),
                 new Set(['Coal, Australian','Cocoa','Sugar, US','Rubber, TSR20 **','Rubber, RSS3']));
 assert.equal(TRIAGE.summary.approved,0);
 assert.equal(TRIAGE.summary.non_world_bank_source_listed,68);
 assert.equal(TRIAGE.detailed_private_evidence.sha256,
  'a11fab3ab2ea68ec0e4423555cd101d848bc27f04a3c0a3837cd9fa269314d54');
 assert.equal(RIGHTS.entries.length,20);
 assert.equal(RIGHTS.summary.public_approved,0);
 assert.equal(RIGHTS.summary.licensed_index_assets_pending,8);
 assert.equal(RIGHTS.summary.commercial_engine_approved,0);
 for (const x of RIGHTS.entries){
   const registered=sourceItems.find(s=>(s.asset_id||s.aux_id)===x.id&&s.provider_id===x.provider);
   assert(registered,'Rights list must not contain unknown or changed-ownership series '+x.id);
   assert.equal(x.source_lock,registered.source_lock);
   assert.equal(x.explicit_release_approval,false,'Critical release gate should remain off');
   for(const k of RIGHTS.separate_use_cases)assert(x.permissions_by_use[k],k+' omitted for '+x.id);
   assert(Object.values(x.permissions_by_use).every(v=>v!=='APPROVED'),'No commercial use implicitly approved');
   assert.equal(x.permissions_by_use.commercial_server_processing,'BLOCKED_UNTIL_FORMAL_RIGHTS_AND_LICENSE_GATE');
   assert.equal(x.permissions_by_use.production_activation,'NOT_APPROVED');
 }
 const byId=Object.fromEntries(RIGHTS.entries.map(x=>[x.id,x]));
 assert.equal(byId.JP_BONDS.rights_class,'HISTORICAL_DATA_LICENSE_AND_POSSIBLE_SEPARATE_NAME_USE');
 assert.equal(byId.JP_EQUITY.rights_class,'PAID_INDEX_DATA_AND_REDISTRIBUTION_LICENSE');
 assert.equal(byId.GLOBAL_EQUITY.rights_class,'PRIOR_WRITTEN_LICENSE_REQUIRED_FOR_COMMERCIAL_AND_AI_USES');
 assert.equal(byId.GOLD.rights_class,'CC_BY_DEFAULT_WITH_THIRD_PARTY_DATA_EXCEPTIONS');
 assert.equal(byId.CASH_SHORT.rights_class,'COMMERCIAL_REPRODUCTION_REQUIRES_BOJ_PERMISSION_REVIEW');
 assert.equal(REG.acquisition.new_external_download_count,12,'Metadata review did not generate more official original downloads');
 assert.equal(REG.acquisition.fed_ddp_source_change_research_candidate_20261111.status,
              'TECHNICALLY_VALIDATED_ADR_DRAFT_NO_SOURCE_LOCK_CHANGE');
 console.log('PASS: 71 World Bank rows cross-referenced, 47 forecast markers, 35 definition markers, 5 futures quotes, 68 other providers, 0 approvals');
 console.log('PASS: 20 assets+aux rights use gates, NOMURA name license and MSCI AI permission blocked, source locks unchanged');
}
check();
