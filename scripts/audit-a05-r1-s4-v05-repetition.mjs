/**
 * A05 R1 S4 draft-repetition audit. Not a substitute for human C1-C7 review.
 * node scripts/audit-a05-r1-s4-v05-repetition.mjs
 * node scripts/audit-a05-r1-s4-v05-repetition.mjs --check
 * No network, respondents or GitHub Actions.
 */
import {readFileSync,writeFileSync} from "node:fs";
import assert from "node:assert/strict";
const root=new URL("../",import.meta.url);
const inputPath="docs/A05_S4_V05_ALL112_CONTEXTUAL_ALTERNATES_20261030.json";
const reportPath="docs/A05_S4_V05_REPEAT_14GRAM_AUDIT_20261030.json";
const input=JSON.parse(readFileSync(new URL(inputPath,root),"utf8"));
function audit(input){
 const gramSize=14,minDocs=16,normalized=x=>x.replace(/\s+/g,"");
 const rows=input.proposals.map(p=>({pairId:p.pairId,priority:p.priority,origin:p.provenance==="PROGRAMMATIC_104_PAIR_EDITORIAL_DRAFT_NO_HUMAN_REVIEW"?"PROGRAMMATIC_104":"EARLIER_AI_8",text:normalized(p.candidateDescription)}));
 const frequencies=new Map();
 for(const r of rows)for(const g of new Set(Array.from({length:Math.max(0,r.text.length-gramSize+1)},(_,i)=>r.text.slice(i,i+gramSize))))
  frequencies.set(g,(frequencies.get(g)||0)+1);
 const examined=rows.map(r=>{
  const used=new Uint8Array(r.text.length);
  for(let i=0;i<=r.text.length-gramSize;i++)
   if((frequencies.get(r.text.slice(i,i+gramSize))||0)>=minDocs)
    for(let j=i;j<i+gramSize;j++)used[j]=1;
  const chars=used.reduce((n,v)=>n+v,0);
  const fraction=r.text.length?+(chars/r.text.length).toFixed(3):0;
  return {pairId:r.pairId,origin:r.origin,priority:r.priority,descriptionCharacters:r.text.length,repeatCoverage14gramAtLeast16:fraction,automatedReview:"REWRITE_PRIORITY_HIGH"+(fraction>=.5?"":"_NOT_FLAGGED")};
 });
 const stats=origin=>{
  const items=examined.filter(x=>x.origin===origin);
  const vals=items.map(x=>x.repeatCoverage14gramAtLeast16).sort((a,b)=>a-b);
  const n=vals.length;
  return {n,min:vals[0],median:vals[Math.floor(n/2)],mean:+(vals.reduce((a,b)=>a+b,0)/n).toFixed(3),max:vals[n-1],atLeast50Percent:vals.filter(x=>x>=.5).length};
 };
 const sorted=[...frequencies].filter(([,n])=>n>=minDocs).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,15).map(([gram,documents])=>({gram,documents}));
 return {
  schema:"A05-R1-S4-V05-CHARACTER_NGRAM_REPEAT_AUDIT-0.1.0",
  analyzedOn:"2026-10-30",
  sourceFile:"docs/A05_S4_V05_ALL112_CONTEXTUAL_ALTERNATES_20261030.json",
  method:{gramSize,minDocuments:minDocs,normalization:"remove whitespace",metric:"Fraction of each description covered by at least one 14-char sequence shared by >=16 of 112 descriptions.",meaning:"Mechanical formulaicity signal; not semantic/psychological validation, nor evidence of personal traits."},
  outcome:"BLOCKED_EDITORIAL_REVIEW_REQUIRED",
  counts:{source:rows.length,priorEight:stats("EARLIER_AI_8"),machineGenerated104:stats("PROGRAMMATIC_104")},
  frequentSegments:sorted,
  priorityPairs:examined.filter(x=>x.repeatCoverage14gramAtLeast16>=.5).sort((a,b)=>b.repeatCoverage14gramAtLeast16-a.repeatCoverage14gramAtLeast16).map(x=>x.pairId),
  rows:examined,
  approval:{humanPrimary:0,humanIndependent:0,publication:"NO_GO"}
 };
}
const result=audit(input);
const content=JSON.stringify(result,null,2)+"\n";
if(process.argv.includes("--check")){
 const current=readFileSync(new URL(reportPath,root),"utf8");
 assert.equal(current,content,"Report stale; regenerate locally then review diff");
 console.log("S4 repetition-audit snapshot PASS:",result.counts.machineGenerated104.atLeast50Percent,"template drafts flagged");
}else{
 writeFileSync(new URL(reportPath,root),content);
 console.log("S4 repetition audit:",result.counts.machineGenerated104.atLeast50Percent,"/104 machine drafts high-repeat. Human approval remains zero.");
}
