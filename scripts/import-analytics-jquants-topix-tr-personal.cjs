#!/usr/bin/env node
'use strict';
// OFFLINE importer: user may export JSON from their authorized J-Quants V2 API account.
// Does NOT fetch, authenticate, scrape, or bypass the user's subscription restrictions.
// Index code 6000 = 配当込みTOPIX (gross dividends); not TOPIX price / not after-tax TR.
// --selftest: synthetic source data; --import RAW.json YYYY-MM OUT_PRIVATE_DIR --personal-use
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path'),assert=require('node:assert/strict');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function parseIndex(records,throughMonth){
 if(!Array.isArray(records)||records.length<5||!/^\d{4}-(0[1-9]|1[0-2])$/.test(throughMonth))throw Error('Invalid index records or YYYY-MM boundary');
 const dates=new Map(),months=new Map();
 for(const r of records){
   if(!r||r.Code!=='6000')throw Error('Only exact TOPIX gross total return code 6000 accepted');
   if(typeof r.Date!=='string'||!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(r.Date)||
      new Date(r.Date+'T00:00:00Z').toISOString().slice(0,10)!==r.Date)throw Error('Invalid daily date');
   if(dates.has(r.Date))throw Error('Duplicate daily date');
   if(typeof r.C!=='number'||!Number.isFinite(r.C)||r.C<=0)throw Error('Invalid TOPIX TR closing level');
   dates.set(r.Date,r.C);
   const month=r.Date.slice(0,7),previous=months.get(month);
   if(!previous||r.Date>previous.date)months.set(month,{month,date:r.Date,value:r.C});
 }
 if(![...months.keys()].some(x=>x>throughMonth))throw Error('Cannot prove selected final month is complete; provide data from the following month');
 const rows=[...months.values()].filter(x=>x.month<=throughMonth).sort((a,b)=>a.month.localeCompare(b.month));
 if(rows.length<2||rows.at(-1).month!==throughMonth)throw Error('Selected final month not covered');
 const serial=m=>Number(m.slice(0,4))*12+Number(m.slice(5))-1;
 for(let i=1;i<rows.length;i++)if(serial(rows[i].month)!==serial(rows[i-1].month)+1)throw Error('Missing complete index month '+rows[i-1].month);
 return rows;
}
function canonical(rows,rawSha){
 const headers=['month','series_id','value','unit','currency','series_kind','origin','source_id','raw_response_sha256'];
 const values=rows.map(r=>[r.month,'JPX_TOPIX_GROSS_TR_6000',r.value.toString(),'INDEX_TR','JPY','INDEX_TOTAL_RETURN','OBSERVED','JPX',rawSha]);
 return [headers.join(','),...values.map(r=>r.join(','))].join('\n')+'\n';
}
function selftest(){
 const d=[];
 for(let y=2020;y<=2021;y++)for(let m=1;m<=12;m++)for(const day of [1,15,27])
  d.push({Date:y+'-'+String(m).padStart(2,'0')+'-'+String(day).padStart(2,'0'),Code:'6000',C:1000+Number((y-2020)*36+m*3+day)});
 const res=parseIndex(d,'2021-11');
 assert.equal(res.length,23);assert.equal(res.at(-1).date,'2021-11-27');
 assert.match(canonical(res,'a'.repeat(64)),/JPX_TOPIX_GROSS_TR_6000/);
 assert.throws(()=>parseIndex(d,'2021-12'),/following month/);
 assert.throws(()=>parseIndex([...d,d[1]],'2021-11'),/Duplicate/);
 assert.throws(()=>parseIndex(d.map((x,i)=>i===1?{...x,Code:'0000'}:x),'2021-11'),/6000/);
 assert.throws(()=>parseIndex(d.filter(x=>!x.Date.startsWith('2020-05')),'2021-11'),/Missing/);
 assert.throws(()=>parseIndex(d.map((x,i)=>i===1?{...x,C:-20}:x),'2021-11'),/closing/);
 console.log('PASS J-Quants 6000 private daily-into-monthly EOM, exact gross TR label, no missing/duplicate/unfinished months, synthetic only');
}
function main(a){
 if(a.length===1&&a[0]==='--selftest')return selftest();
 if(a.length!==5||a[0]!=='--import'||a[4]!=='--personal-use')
   throw Error('Usage: --import RAW_JQUANTS_V2.json YYYY-MM NEW_PRIVATE_OUTPUT_DIR --personal-use');
 const [_,file,cutoff,output]=a,privateDir=path.resolve(output),repo=path.resolve(__dirname,'..');
 if(fs.existsSync(privateDir)||privateDir===repo||privateDir.startsWith(repo+path.sep)||repo.startsWith(privateDir+path.sep))
   throw Error('Out path must be new outside Git checkout');
 const raw=fs.readFileSync(file);
 if(raw.length>100e6)throw Error('Source file too large');
 const j=JSON.parse(raw.toString('utf8'));
 if(!Array.isArray(j.data)||j.pagination_key)throw Error('J-Quants response must have all pagination pages merged without next key');
 const rows=parseIndex(j.data,cutoff);
 fs.mkdirSync(privateDir,{recursive:true,mode:0o700});
 const csv=Buffer.from(canonical(rows,sha(raw)));
 const qa={status:'PRIVATE_PERSONAL_JPX_INDEX_6000_MONTHLY_QA',source_id:'JPX',source_channel:'JQUANTS_V2_AUTHORIZED_USER_EXPORT',
  official_api:'https://api.jquants.com/v2/indices/bars/daily',
  api_code:'6000',price_definition:'TOPIX_GROSS_DIVIDEND_INCLUSIVE_TR_CLOSE_ONLY',
  first_month:rows[0].month,last_month:rows.at(-1).month,months:rows.length,
  source_raw_sha256:sha(raw),canonical_sha256:sha(csv),
  no_data_before_2010_invented:true,no_missing_month_interpolation:true,
  issuer_authenticity_independently_verified:false,private_self_use_terms_user_responsibility:true,
  site_approved:false,redistribution_approved:false,annual_30y_windows:0};
 fs.writeFileSync(path.join(privateDir,'JPX_TOPIX_GROSS_TR_6000_PERSONAL_MONTHLY.csv'),csv,{mode:0o600,flag:'wx'});
 fs.writeFileSync(path.join(privateDir,'JPX_TOPIX_GROSS_TR_6000_PERSONAL_QA.json'),JSON.stringify(qa,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log('PASS_JPX_PRIVATE_INDEX_6000 '+JSON.stringify({months:rows.length,from:rows[0].month,to:rows.at(-1).month,siteApproved:false}));
}
if(require.main===module)try{main(process.argv.slice(2))}catch(e){console.error('PRIVATE_JPX_IMPORT_FAILED '+e.message);process.exitCode=1}
module.exports={parseIndex,canonical};
