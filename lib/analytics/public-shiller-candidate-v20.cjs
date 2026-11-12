'use strict';
/** v0.20: An isolated, observed upstream *candidate*, NOT the legacy pinned snapshot or official SPDJI TR. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const R=require('./private-shiller-recovery.cjs');
const {privateDir}=require('./private-evidence-restore.cjs');
const HORIZONS=[120,240,360];
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const round=n=>Number(n.toFixed(12));
function candidateReport(raw,{skipBlobPin=false}={}){
 if(!Buffer.isBuffer(raw))throw Error('Raw upstream bytes required');
 const blob=R.gitBlob(raw);
 if(!skipBlobPin&&blob!==R.UPSTREAM_GIT_BLOB)throw Error('Unapproved upstream source snapshot: Git blob mismatch');
 const values=R.parsedUpstream(raw);
 const returns=[];
 for(let i=1;i<values.length;i++){
   const prev=values[i-1],cur=values[i];
   const p0=Number(prev.price),p1=Number(cur.price),d1=Number(cur.dividend);
   const factor=p1/p0+d1/(12*p0);
   const cpiFactor=Number(cur.cpi)/Number(prev.cpi);
   const realFactor=factor/cpiFactor;
   if(!Number.isFinite(factor)||factor<=0||factor>10||!Number.isFinite(realFactor)||realFactor<=0||realFactor>10)throw Error('Unreasonable candidate return at '+cur.month);
   returns.push({month:cur.month,factor,realFactor});
 }
 const windows={},usCpiRealWindows={};
 for(const horizon of HORIZONS){
   const list=[],realList=[];
   for(let i=0;i+horizon<=returns.length;i++){
     let factor=1,realFactor=1;
     for(let j=i;j<i+horizon;j++){factor*=returns[j].factor;realFactor*=returns[j].realFactor;}
     const annualized=Math.pow(factor,12/horizon)-1;
     const realAnnualized=Math.pow(realFactor,12/horizon)-1;
     if(!Number.isFinite(annualized)||annualized<=-1||!Number.isFinite(realAnnualized)||realAnnualized<=-1)throw Error('Unreasonable compound return');
     list.push({start:returns[i].month,end:returns[i+horizon-1].month,annualized});
     realList.push({start:returns[i].month,end:returns[i+horizon-1].month,annualized:realAnnualized});
   }
   const ordered=[...list].sort((a,b)=>a.annualized-b.annualized);
   const mid=(ordered[Math.floor((ordered.length-1)/2)].annualized+ordered[Math.floor(ordered.length/2)].annualized)/2;
   windows[String(horizon)]={horizon_months:horizon,complete_overlapping_windows:list.length,
     first_start:list[0]?.start,last_start:list.at(-1)?.start,
     min_annualized:round(ordered[0].annualized),min_start:ordered[0].start,min_end:ordered[0].end,
     median_annualized:round(mid),max_annualized:round(ordered.at(-1).annualized),
     max_start:ordered.at(-1).start,max_end:ordered.at(-1).end,
     negative_nominal_usd_windows:list.filter(v=>v.annualized<0).length};
   realList.sort((a,b)=>a.annualized-b.annualized);
   usCpiRealWindows[String(horizon)]={horizon_months:horizon,complete_overlapping_windows:realList.length,
     min_annualized:round(realList[0].annualized),min_start:realList[0].start,min_end:realList[0].end,
     median_annualized:round((realList[Math.floor((realList.length-1)/2)].annualized+realList[Math.floor(realList.length/2)].annualized)/2),
     max_annualized:round(realList.at(-1).annualized),max_start:realList.at(-1).start,max_end:realList.at(-1).end,
     negative_us_cpi_real_windows:realList.filter(v=>v.annualized<0).length};
 }
 return {schema:'ANALYTICS_PUBLIC_SHILLER_CANDIDATE_V020',status:'REAL_UPSTREAM_CANDIDATE_ONLY_NOT_LEGACY_PINNED_QA',
   source:'datasets/s-and-p-500',commit:R.UPSTREAM_COMMIT,upstream_git_blob_sha1:blob,
   upstream_raw_sha256:sha256(raw),legacy_shiller_sha256:R.PINNED_SHILLER_SHA256,
   legacy_exact_bytes_recovered:false,source_original_months:values.length,
   source_first_month:values[0].month,source_last_month:values.at(-1).month,
   derived_nominal_usd_return_months:returns.length,
   methodology:'P_t / P_(t-1) - 1 + annualized_dividend_t / (12 * P_(t-1))',
   official_sp500_total_return:false,monthly_price_kind:'MONTHLY_AVERAGED_PRICE',dividends_reinvested_approximately:true,
   fx_adjusted_jpy:false,japan_cpi_adjusted:false,us_cpi_real_diagnostic_only:true,expenses_taxes_slippage_included:false,
   investment_backtest_withdrawals_included:false,
   source_rights_approved_for_distribution:false,publication_approved:false,private_research_only:true,
   note:'Overlapping historical windows are dependent and are not probabilities of future success.',windows,us_cpi_real_windows:usCpiRealWindows};
}
function inspectFile(p){
 if(typeof p!=='string'||!path.isAbsolute(p))throw Error('Upstream CSV requires an absolute path');
 const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>200000||s.size<100)throw Error('Invalid or unsafe upstream CSV');
 const code=fs.realpathSync(path.resolve(__dirname,'../..'));
 const resolved=fs.realpathSync(p);
 if(resolved===code||resolved.startsWith(code+path.sep))throw Error('Input CSV cannot be in Git checkout');
 return candidateReport(fs.readFileSync(resolved));
}
function writePrivateAggregate(report,outDir){
 if(!report||report.schema!=='ANALYTICS_PUBLIC_SHILLER_CANDIDATE_V020'||report.publication_approved!==false)throw Error('Not research aggregate');
 const folder=privateDir(outDir,{create:true}),out=path.join(folder,'SHILLER_PUBLIC_CANDIDATE_V020_AGGREGATE.json');
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 return {report_path:out,status:report.status,raw_source_stored:false};
}
module.exports={candidateReport,inspectFile,writePrivateAggregate};
