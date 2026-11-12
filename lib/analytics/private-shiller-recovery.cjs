'use strict';
/** Re-identify a pinned, historical, research-only Shiller snapshot. Never substitute upstream data silently. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const https=require('node:https');
const {privateDir}=require('./private-evidence-restore.cjs');
const {deriveShillerApproxUsdReturns}=require('./private-shiller-raw-reader.cjs');
const PINNED_SHILLER_SHA256='0cdb8a04bd14d104e53acbb982cf205eb4733371bb9140191b8c4b6e433bc55d';
const UPSTREAM_COMMIT='87a2284276f79d75041c71c8f6d9f2aa1c965e84';
const UPSTREAM_GIT_BLOB='1c5f64a1cb8377fde80d339fbf0051e5e0e94566';
const UPSTREAM_PATH=`/datasets/s-and-p-500/${UPSTREAM_COMMIT}/data/data.csv`;
const UPSTREAM_HOST='raw.githubusercontent.com';
const HEADER='Date,SP500,Dividend,Earnings,Consumer Price Index,Long Interest Rate,Real Price,Real Dividend,Real Earnings,PE10';
const HEAD='month,sp500_price_index,annualized_dividend_index_points,us_cpi_index';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const gitBlob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const sourceCap=200000;
const eachMode=['raw','number',...Array.from({length:7},(_,i)=>'fixed'+i)];
function strictInput(p,label,cap=sourceCap){
 if(typeof p!=='string'||!path.isAbsolute(p))throw Error(label+' must be an absolute file path');
 const stat=fs.lstatSync(p);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<10||stat.size>cap)throw Error('Unsafe '+label);
 const code=fs.realpathSync(path.resolve(__dirname,'../..'));
 const resolved=fs.realpathSync(p);
 if(resolved===code||resolved.startsWith(code+path.sep))throw Error(label+' must be outside repo');
 return fs.readFileSync(resolved);
}
function parsedUpstream(raw,expectedRows=522){
 if(!Buffer.isBuffer(raw)||raw.length>sourceCap||raw.length<100)throw Error('Invalid source bytes');
 const utf8=raw.toString('utf8');
 if(utf8.includes('\ufffd')||utf8.includes('\r')||!utf8.endsWith('\n'))throw Error('Source encoding or newline mismatch');
 const lines=utf8.trimEnd().split('\n');
 if(lines.shift()!==HEADER)throw Error('Unexpected upstream columns');
 const chosen=[];let previous=null;
 for(const line of lines){
  const r=line.split(',');if(r.length!==10)throw Error('Unexpected upstream CSV width');
  const date=r[0];if(!/^\d{4}-(?:0[1-9]|1[0-2])-01$/.test(date))throw Error('Invalid first-of-month date');
  const ym=date.slice(0,7);
  if(ym<'1980-01'||ym>'2023-06')continue;
  const serial=Number(ym.slice(0,4))*12+Number(ym.slice(5))-1;
  if(previous!==null&&serial!==previous+1)throw Error('Missing or repeated Shiller month');
  previous=serial;
  for(const field of [r[1],r[2],r[4]])if(!/^\d+(?:\.\d+)?$/.test(field)||!Number.isFinite(Number(field))||Number(field)<=0)throw Error('Invalid Shiller price/dividend/CPI');
  chosen.push({month:ym,price:r[1],dividend:r[2],cpi:r[4]});
 }
 if(chosen.length!==expectedRows||chosen[0]?.month!=='1980-01'||chosen.at(-1)?.month!=='2023-06')throw Error('Wrong historical source coverage');
 return chosen;
}
function format(raw,mode){
 if(mode==='raw')return raw;
 const n=Number(raw);
 if(mode==='number')return String(n);
 if(/^fixed[0-6]$/.test(mode))return n.toFixed(Number(mode.slice(-1)));
 throw Error('Unknown number format');
}
function buildCandidate(rows,{price='raw',dividend='raw',cpi='raw',lineEnding='\n',finalNewline=true}={}){
 const content=[HEAD,...rows.map(row=>[row.month,format(row.price,price),format(row.dividend,dividend),format(row.cpi,cpi)].join(','))].join(lineEnding)+(finalNewline?lineEnding:'');
 return Buffer.from(content,'utf8');
}
function analyzeUpstream(raw,{expected=PINNED_SHILLER_SHA256,expectedRows=522,requireGitBlob=true}={}){
 const blob=gitBlob(raw);
 if(requireGitBlob&&blob!==UPSTREAM_GIT_BLOB)throw Error('Upstream commit blob does not match pinned Git blob');
 const rows=parsedUpstream(raw,expectedRows);let examined=0,match=null;
 search:for(const price of eachMode)for(const dividend of eachMode)for(const cpi of eachMode){
  for(const lineEnding of ['\n','\r\n'])for(const finalNewline of [true,false]){
    const candidate=buildCandidate(rows,{price,dividend,cpi,lineEnding,finalNewline});examined++;
    if(sha(candidate)===expected){deriveShillerApproxUsdReturns(candidate,expectedRows);match={candidate,format:{price,dividend,cpi,lineEnding:lineEnding==='\n'?'LF':'CRLF',finalNewline}};break search;}
  }
 }
 return {source:'DATASETS_SHILLER_REPUBLICATION_2026_11_COMMIT',upstream_git_blob_sha1:blob,legacy_pinned_sha256:expected,
  rows:rows.length,range:'1980-01/2023-06',candidate_formattings_checked:examined,
  legacy_exact_bytes_recovered:!!match,match};
}
function locateExistingOriginal(root,{limit=60000,maxDepth=8,expected=PINNED_SHILLER_SHA256,expectedRows=522}={}){
 const dir=privateDir(root);const hits=[];let filesScanned=0,skipped=0,dirsScanned=0;
 function walk(folder,depth){
  if(depth>maxDepth)return;
  if(dirsScanned++>limit)throw Error('Scan directory limit exceeded');
  for(const name of fs.readdirSync(folder).sort()){
    const p=path.join(folder,name),stat=fs.lstatSync(p);
    if(stat.isSymbolicLink()){skipped++;continue;}
    if(stat.isDirectory()){walk(p,depth+1);continue;}
    if(!stat.isFile()||!name.toLowerCase().endsWith('.csv')||stat.size<=0||stat.size>1024*1024){skipped++;continue;}
    if(++filesScanned>limit)throw Error('Scan file count cap exceeded');
    if(sha(fs.readFileSync(p))===expected){deriveShillerApproxUsdReturns(fs.readFileSync(p),expectedRows);hits.push(p);}
  }
 }
 walk(dir,0);
 return {status:hits.length?'EXACT_LEGACY_ORIGINAL_FOUND':'EXACT_LEGACY_ORIGINAL_NOT_FOUND',matches:hits,
   files_scanned:filesScanned,skipped_nonmatching_or_unsafe:skipped,dirs_scanned:dirsScanned,private_only:true};
}
async function fetchPinnedOnce(){
 return await new Promise((resolve,reject)=>{
  const req=https.get({hostname:UPSTREAM_HOST,path:UPSTREAM_PATH,port:443,protocol:'https:',headers:{'User-Agent':'Kaito-Analytics-Private-Legacy-Shiller-Research/0.19','Accept':'text/csv'},timeout:15000},res=>{
   if(res.statusCode!==200){res.resume();return reject(Error('Pinned GitHub source HTTP '+res.statusCode));}
   let size=0;const chunks=[];
   res.on('data',b=>{size+=b.length;if(size>sourceCap){req.destroy(Error('Upstream source exceeds byte cap'));return;}chunks.push(b)});
   res.on('end',()=>{const raw=Buffer.concat(chunks);if(gitBlob(raw)!==UPSTREAM_GIT_BLOB)return reject(Error('Upstream Git blob SHA1 pin mismatch'));resolve(raw)});
   res.on('error',reject);
  });req.on('timeout',()=>req.destroy(Error('Pinned fetch timed out')));req.on('error',reject);
 });
}
function writeMatchedPrivate(report,outDir){
 if(!report.legacy_exact_bytes_recovered||!report.match?.candidate)throw Error('LEGACY_SHILLER_PIN_MISMATCH: no output is permitted');
 const out=privateDir(outDir,{create:true}),file=path.join(out,'raw-shiller.csv');
 if(fs.existsSync(file))throw Error('Refusing to overwrite existing Shiller research file');
 fs.writeFileSync(file,report.match.candidate,{flag:'wx',mode:0o600});
 return {status:'PINNED_LEGACY_SHILLER_RECOVERED_PRIVATE_ONLY',path:file,sha256:sha(report.match.candidate)};
}
module.exports={PINNED_SHILLER_SHA256,UPSTREAM_COMMIT,UPSTREAM_GIT_BLOB,UPSTREAM_PATH,HEADER,HEAD,
  sha,gitBlob,strictInput,parsedUpstream,buildCandidate,analyzeUpstream,locateExistingOriginal,fetchPinnedOnce,writeMatchedPrivate};
