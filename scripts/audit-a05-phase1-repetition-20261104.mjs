/**
 * A05 Phase-1 contextual copy repetition metrics.
 * Local-only: node scripts/audit-a05-phase1-repetition-20261104.mjs
 *
 * Scope: all 136 unordered pair reports. For each chapter, remove
 * whitespace and find 14-character grams appearing in >=16 different
 * reports; flag a report when those grams cover >=50% of its characters.
 *
 * Caution: heuristic indicator of template repetition, NOT validation of
 * semantic originality, psychology, relationship quality, or release readiness.
 * Shared disclaimers and repeated axis explanations are intentionally counted.
 */
import { readFileSync } from 'node:fs';
const source = new URL('../docs/A05_PHASE1_PAIR136_SHORT_REPORTS_20261104.json', import.meta.url);
const data = JSON.parse(readFileSync(source,'utf8'));
const chapters = ['shared','different','scenario','dilemma'];
const N = 14, MIN_DOCS = 16, FLAGGED = .5;
if(data.reports.length!==136)throw Error('Expected 136 pair reports');
function repeatRate(sections){
 const docs=data.reports.map(r=>sections.map(id=>r.sections.find(s=>s.id===id)?.body||'').join('').replace(/\s+/g,''));
 const frequency=new Map;
 for(const text of docs){
  const grams=new Set;
  for(let i=0;i<=text.length-N;i++)grams.add(text.slice(i,i+N));
  for(const gram of grams)frequency.set(gram,(frequency.get(gram)||0)+1);
 }
 return docs.map(text=>{
  const mark=new Uint8Array(text.length);
  for(let i=0;i<=text.length-N;i++)if(frequency.get(text.slice(i,i+N))>=MIN_DOCS){
   for(let j=i;j<i+N;j++)mark[j]=1;
  }
  const ratio=text.length?mark.reduce((sum,x)=>sum+x,0)/text.length:0;
  return Math.round(ratio*1000)/1000;
 });
}
const results=Object.fromEntries([...chapters,'all'].map(id=>[id,repeatRate(id==='all'?chapters:[id])]));
const summary=Object.fromEntries(Object.entries(results).map(([k,values])=>[k,{
 flagged:values.filter(v=>v>=FLAGGED).length,
 mean:Math.round(values.reduce((a,b)=>a+b,0)/values.length*1000)/1000
}]));
const queue=data.reports.map((row,i)=>({
 pairId:row.pairId,source:row.sourceStoryOrigin,
 ...Object.fromEntries(Object.entries(results).map(([k,v])=>[k,v[i]])),
 humanApproved:row.humanReviewed===true
})).sort((a,b)=>b.all-a.all);
const result={source:'A05_PHASE1_PAIR136_SHORT_REPORTS_20261104.json',schema:'A05-COPY-REPETITION-RECURRENT-1.0',method:{gramSize:N,minDocumentFrequency:MIN_DOCS,flagThreshold:FLAGGED},summary,queue};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
