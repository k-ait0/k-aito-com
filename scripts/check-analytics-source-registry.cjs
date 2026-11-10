#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const validateRegistry=function validateRegistry(r){
 const errors=[],frozen={JP_EQUITY:"JPX",US_EQUITY:"SPDJI",GLOBAL_EQUITY:"MSCI",JP_BONDS:"NOMURA_BPI",US_BONDS:"BLOOMBERG_INDEX",CASH_SHORT:"BOJ",GOLD:"WORLD_BANK_PINK",REIT:"JPX",EM_EQUITY:"MSCI",DEV_EXUS_BONDS:"FTSE_RUSSELL",EXGOLD_COMMODITY:"WORLD_BANK_PINK",INFLATION_LINKED:"US_TREASURY"};
 if(r.version!=="0.2.0")errors.push("Unsupported source registry version");
 if(r.policy?.no_auto_fallback!==true||r.policy?.public_display_default!==false)errors.push("Fail-closed and source fallback policy changed");
 if(!String(r.policy?.source_change).includes("SOURCE_CHANGE_ADR"))errors.push("Source change approval policy missing");
 if(!r.sources||Object.keys(r.sources).length<12)errors.push("Source provider catalog incomplete");
 if(!Array.isArray(r.assets)||r.assets.length!==12)errors.push("Expected 12 asset records");
 if(!Array.isArray(r.auxiliary)||r.auxiliary.length!==8)errors.push("Expected 8 auxiliary series records in 6 categories");
 const seen=new Set();
 for(const a of r.assets||[]){
  if(seen.has(a.asset_id))errors.push("Duplicate asset "+a.asset_id);seen.add(a.asset_id);
  if(frozen[a.asset_id]!==a.provider_id)errors.push("Source drift "+a.asset_id);
  if(!a.source_lock?.startsWith("LOCKED_"))errors.push("Missing source lock "+a.asset_id);
  if(!r.sources?.[a.provider_id])errors.push("Missing provider "+a.provider_id);
  if(a.site_use_approved===true&&(!a.public_approval_evidence?.reviewer||!a.public_approval_evidence?.license_review_url||!a.public_approval_evidence?.qa_report))errors.push("Missing publication evidence "+a.asset_id);
  if(a.site_use_approved===true&&!["OPEN_METADATA_GATE","PUBLIC_MODEL_INPUT_QA_PENDING"].includes(a.website_rights_state))errors.push("Restricted source published "+a.asset_id);
  if(["GOLD","EXGOLD_COMMODITY"].includes(a.asset_id)&&a.series_kind!=="COMMODITY_SPOT")errors.push("Commodity not classified as spot "+a.asset_id);
  if(a.asset_id==="INFLATION_LINKED"&&a.series_kind!=="REAL_YIELD_MODEL_NOT_TR")errors.push("TIPS real yield incorrectly labeled TR");
 }
 for(const id of Object.keys(frozen))if(!seen.has(id))errors.push("Missing asset "+id);
 const auxSeen=new Set();
 for(const a of r.auxiliary||[]){
  if(auxSeen.has(a.aux_id))errors.push("Duplicate auxiliary "+a.aux_id);auxSeen.add(a.aux_id);
  if(!r.sources?.[a.provider_id])errors.push("Missing aux provider "+a.aux_id);
  if(a.site_use_approved===true&&!a.public_approval_evidence?.reviewer)errors.push("Unapproved auxiliary "+a.aux_id);
 }
 for(const id of ["FX","CPI_JP","CPI_US","RATES_US","RATES_JP","DIVIDENDS","HEDGE_COST","CREDIT_SPREAD"])if(!auxSeen.has(id))errors.push("Missing auxiliary "+id);
 if(r.sources?.SHILLER_LEGACY?.rights!=="RESEARCH_ONLY")errors.push("Legacy Shiller restriction changed");
 if(r.acquisition?.new_external_download_count!==0&&!r.acquisition?.external_raw_acquisition_proof)errors.push("Unverified download increment");
 for(const [id,s] of Object.entries(r.sources||{})){
  if(!s.rights)errors.push("Source rights missing "+id);
  for(const u of [s.homepage,s.terms,s.api_terms])if(u&&(!u.startsWith("https://")||u.includes(" ")))errors.push("Invalid URL "+id);
 }
 return errors;
};
const file=path.join(__dirname,'../research/analytics/source_registry.v0.2.json');
let r;
try{r=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){console.error('READ ERROR:',String(e));process.exit(2);}
const errors=validateRegistry(r);
if(errors.length){for(const e of errors)console.error('FAIL: '+e);process.exit(1);}
console.log('PASS: 12 asset sources, 6 aux categories (8 series), no unapproved publication, locked sources');
