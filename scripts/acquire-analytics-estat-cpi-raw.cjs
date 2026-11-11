#!/usr/bin/env node
'use strict';
// Only fetch pinned official e-Stat CSV downloads, save privately, never publish raw values.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),https=require('node:https'),os=require('node:os');
const root=path.resolve(__dirname,'..');
const target=Object.freeze([
 {id:'CPI_JP_NATIONAL_2025_LINKED_HEADLINE',infid:'000040482943',expected_title:'中分類指数（1970年1月～最新月）',first_candidate:'1970-01'},
 {id:'CPI_JP_NATIONAL_2025_LINKED_EX_RENT',infid:'000040482944',expected_title:'持家の帰属家賃を除く総合指数（1946年8月～最新月）',first_candidate:'1946-08'}
]);
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
function privateDir(){
 const dest=path.resolve(process.env.ANALYTICS_PRIVATE_DATA_DIR||path.join(os.homedir(),'kaito-analytics-private'));
 fs.mkdirSync(dest,{recursive:true,mode:0o700});
 const r=fs.realpathSync(root),d=fs.realpathSync(dest);
 if(d===r||d.startsWith(r+path.sep)||r.startsWith(d+path.sep))throw Error('Cannot store CSV in repository');
 return d;
}
function verifyRegistry(){
 const r=JSON.parse(fs.readFileSync(path.join(root,'research/analytics/source_registry.v0.2.json'),'utf8'));
 const c=r.auxiliary.find(x=>x.aux_id==='CPI_JP');
 if(c?.provider_id!=='ESTAT'||!c.source_lock?.startsWith('LOCKED_')||c.site_use_approved!==false||r.policy.no_auto_fallback!==true||r.policy.no_scraping!==true)throw Error('Source lock/rights mismatch');
}
function fetchExact(url){return new Promise((resolve,reject)=>{
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||parsed.hostname!=='www.e-stat.go.jp'||parsed.pathname!=='/stat-search/file-download'||!/^statInfId=00004048294[34]&fileKind=1$/.test(parsed.search.slice(1)))return reject(Error('Official pinned URL mismatch'));
 const req=https.get(url,{headers:{'User-Agent':'Kaito-Analytics-Frozen-Official-CSV-Research/0.1','Accept':'text/csv,application/octet-stream,*/*'}},res=>{
  if(res.statusCode!==200){res.resume();return reject(Error('Official e-Stat HTTP '+res.statusCode+'; redirect prohibited'))}
  const chunks=[];let total=0;
  res.on('data',b=>{total+=b.length;if(total>8_000_000){req.destroy(Error('CSV over size cap'));return}chunks.push(b)});
  res.on('end',()=>resolve({buf:Buffer.concat(chunks),content_type:res.headers['content-type']||'',content_disposition:res.headers['content-disposition']||''}));
  res.on('error',reject);
 });
 req.on('error',reject);req.setTimeout(25000,()=>req.destroy(Error('e-Stat download timed out'))); 
 });}
async function main(){
 verifyRegistry();const outDir=privateDir();
 for(const t of target){
  const url='https://www.e-stat.go.jp/stat-search/file-download?statInfId='+t.infid+'&fileKind=1';
  const {buf,content_type,content_disposition}=await fetchExact(url);
  const head=buf.subarray(0,256).toString('utf8');
  if(buf.length<600||/^\s*(?:<!DOCTYPE|<html)/i.test(head)||(/<(?:title|html|body)\b/i.test(head)))throw Error('HTML/partial file, not CSV: '+t.id);
  const hash=sha256(buf),folder=path.join(outDir,t.id+'__'+hash.slice(0,12));
  fs.mkdirSync(folder,{mode:0o700});
  fs.writeFileSync(path.join(folder,'source_RAW.csv'),buf,{flag:'wx',mode:0o600});
  const metadata={source_id:'ESTAT',provider:'e-Stat / Statistics Bureau of Japan',dataset_id:t.id,stat_infid:t.infid,expected_title:t.expected_title,expected_first_month:t.first_candidate,source_url:url,ref_catalogue:'https://www.e-stat.go.jp/stat-search/files?cycle=0&layout=datalist&page=1&tclass1=000001243880&tclass2=000001243881&tclass3=000001243883&tclass4=000001243886&toukei=00200573&tstat=000001243876',retrieved_at:new Date().toISOString(),raw_sha256:hash,raw_bytes:buf.length,content_type,content_disposition,source_locked:true,observed_values_qa:'NOT_YET_PARSED',private_only:true,site_publication_approved:false,redistribution_approved:false};
  fs.writeFileSync(path.join(folder,'provenance.json'),JSON.stringify(metadata,null,2)+'\n',{flag:'wx',mode:0o600});
  const first=buf.subarray(0,3);
  console.log(JSON.stringify({status:'RAW_ACQUIRED_PRIVATE',dataset_id:t.id,stat_infid:t.infid,raw_bytes:buf.length,raw_sha256:hash,content_type,possible_utf8_bom:first.equals(Buffer.from([0xef,0xbb,0xbf])),first_four_bytes_hex:buf.subarray(0,4).toString('hex'),publication_approved:false}));
 }
}
if(require.main===module)main().catch(e=>{console.error('ESTAT_RAW_FAILED '+e.message);process.exitCode=1});
module.exports={target,fetchExact,sha256};
