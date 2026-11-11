'use strict';
/**
 * K. Aito Analytics v0.7: PRIVATE monthly JPY portfolio research handoff.
 * Accepts only already normalized, authorized research return series. Never downloads or certifies rights.
 * No speculative FX, CPI, spot-to-total-return or missing-month interpolation.
 */
const {monthSerial}=require('./cashflow-core.cjs');
const MAX_MONTHS=1200,MAX_ASSETS=12;
const str=(x,name)=>{if(typeof x!=='string'||!x.trim())throw Error('Missing '+name);return x;};
const object=(x,name)=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Expected object '+name);return x;};
const sha=(x,name)=>{if(typeof x!=='string'||!/^[a-f0-9]{64}$/i.test(x))throw Error('Invalid SHA256 '+name);return x.toLowerCase();};
const SERIES_KINDS=new Set(['INDEX_TOTAL_RETURN','BOND_TOTAL_RETURN','RESEARCH_APPROX_RETURN']);
/** Source lock is an explicit versioned input from data team's canonical registry, not inferred from results. */
function preparePrivateMonthlyMarket({series,source_registry}={}){
 object(source_registry,'source_registry');
 if(!Array.isArray(source_registry.assets)||source_registry.assets.length<1)throw Error('Canonical source_registry.assets required');
 if(!Array.isArray(series)||series.length<1||series.length>MAX_ASSETS)throw Error('Expected 1..12 explicitly selected assets');
 const locked=new Map(source_registry.assets.map(a=>[a.asset_id,a]));
 const maps=new Map(),meta=[];
 for(const s of series){
   object(s,'series');
   const asset_id=str(s.asset_id,'asset_id');
   if(!/^[A-Z][A-Z0-9_]{0,31}$/.test(asset_id))throw Error('Invalid asset_id');
   if(maps.has(asset_id))throw Error('Duplicate asset_id '+asset_id);
   const lock=locked.get(asset_id);
   if(!lock)throw Error('Asset not present in source registry: '+asset_id);
   const m=object(s.metadata,'metadata');
   const sourceId=str(m.source_id,'source_id');
   const mode=m.source_mode??'LOCKED_SOURCE';
   if(!['LOCKED_SOURCE','EXPLICIT_RESEARCH_FALLBACK'].includes(mode))throw Error('Invalid source_mode');
   if(mode==='LOCKED_SOURCE'&&sourceId!==lock.provider_id)throw Error('Source lock mismatch for '+asset_id);
   if(mode==='EXPLICIT_RESEARCH_FALLBACK'&&(!lock.research_fallback||sourceId!==lock.research_fallback))
     throw Error('Unapproved explicit research fallback for '+asset_id);
   const return_kind=str(m.return_kind,'return_kind');
   if(!SERIES_KINDS.has(return_kind))throw Error('Non-investable price/rate is not total return: '+return_kind);
   if(mode==='LOCKED_SOURCE'&&return_kind!==lock.series_kind)throw Error('Return kind does not match canonical source registry for '+asset_id);
   if(mode==='EXPLICIT_RESEARCH_FALLBACK'&&return_kind!=='RESEARCH_APPROX_RETURN')throw Error('Research fallback requires explicit approximate-return kind');
   if(mode==='LOCKED_SOURCE'&&return_kind==='RESEARCH_APPROX_RETURN')throw Error('Locked provider cannot be relabeled as approximate research fallback');
   if(m.currency!=='JPY')throw Error('USD and other currencies must be explicitly converted to JPY upstream');
   if(m.return_unit!=='DECIMAL_MONTHLY')throw Error('Expected DECIMAL_MONTHLY return unit');
   str(m.source_url,'source_url');str(m.publisher,'publisher');str(m.retrieved_at,'retrieved_at');
   sha(m.raw_sha256,'raw_sha256');
   if(m.data_qa_passed!==true||m.private_research_authorized!==true)throw Error('Research QA and use-right declarations must be explicit');
   if(m.proxy===true||m.estimated===true||m.observed!==true)throw Error('Observed non-proxy research-only data required');
   if(!Array.isArray(s.monthly_returns)||s.monthly_returns.length<1||s.monthly_returns.length>MAX_MONTHS)throw Error('Expected 1..1200 monthly returns');
   const byMonth=new Map();let prev=null;
   for(const row of s.monthly_returns){
     object(row,'monthly return');const serial=monthSerial(row.month);
     if(prev!==null&&serial<=prev)throw Error('Unsorted or repeated return months for '+asset_id);
     prev=serial;
     if(row.origin!=='OBSERVED'||row.proxy===true||row.estimated===true)throw Error('Non-observed return row: '+asset_id);
     const r=row.monthly_return;
     if(typeof r!=='number'||!Number.isFinite(r)||r< -1||r>10)throw Error('Invalid monthly return for '+asset_id);
     byMonth.set(row.month,r);
   }
   maps.set(asset_id,byMonth);
   meta.push({asset_id,source_id:sourceId,source_mode:mode,return_kind,available_return_months:byMonth.size,
     publication_approved:false,raw_sha256:m.raw_sha256});
 }
 const ids=[...maps.keys()].sort();
 const candidates=new Set(maps.get(ids[0]).keys());
 for(const id of ids.slice(1))for(const k of [...candidates])if(!maps.get(id).has(k))candidates.delete(k);
 const common=[...candidates].sort();
 if(common.length===0)throw Error('No overlapping observed month among the selected assets');
 const market_rows=common.map(month=>({month,origin:'OBSERVED',asset_returns:Object.fromEntries(ids.map(id=>[id,maps.get(id).get(month)]))}));
 return {status:'PRIVATE_RESEARCH_INPUT_VALIDATED_NOT_INDEPENDENTLY_AUTHENTICATED',
  market_mode:'OBSERVED_RESEARCH',publication_approved:false,site_use_approved:false,source_rights_approved:false,
  upstream_claims_verified_here:false,no_raw_values_published:true,proxy_used:false,
  note:'The adapter checks shape, canonical provider ID/return kind and local series overlap. It does not independently verify source URL, raw-file SHA against original bytes, license grants, FX source data or market return methodology.',
  asset_ids:ids,source_registry_version:source_registry.version||'UNSPECIFIED',
  common_return_months:common.length,first_common_month:common[0],last_common_month:common.at(-1),
  series_metadata:meta.sort((a,b)=>a.asset_id.localeCompare(b.asset_id)),market_rows};
}
module.exports={preparePrivateMonthlyMarket};
