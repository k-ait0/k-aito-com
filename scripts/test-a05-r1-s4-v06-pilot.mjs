import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>JSON.parse(readFileSync(new URL("../docs/"+p,import.meta.url),"utf8"));
const source=read("A05_S4_V05_ALL112_CONTEXTUAL_ALTERNATES_20261030.json");
const pilot=read("A05_S4_V06_HIGH_REPEAT8_INDIVIDUAL_REWRITE_PILOT_20261030.json");
const baseline=new Map(source.proposals.map(x=>[x.pairId,x]));
const target=new Map(pilot.rows.map(x=>[x.pairId,x]));
test("eight separate non-approved drafts preserve canonical baseline",()=>{
 assert.equal(pilot.count,8);
 assert.equal(target.size,8);
 assert.equal(pilot.publicRelease,"NO_GO");
 assert.equal(new Set(pilot.rows.map(x=>x.proposedV06Description)).size,8);
 assert.equal(new Set(pilot.rows.flatMap(x=>x.proposedV06Prompts)).size,24);
 for(const row of pilot.rows){
  const original=baseline.get(row.pairId);
  assert.ok(original,row.pairId);
  assert.equal(row.baselineV05Description,original.candidateDescription);
  assert.deepEqual(row.baselineV05Prompts,original.candidatePrompts);
  assert.equal(row.baseline14gramCoverage>=.5,true);
  assert.equal(row.proposedV06Prompts.length,3);
  assert.equal(row.approved,false);
  assert.equal(row.publicationApproved,false);
  assert.equal(row.firstHumanReview,"PENDING");
  assert.equal(row.secondIndependentHumanReview,"PENDING");
 }
});
test("short 14-gram overlap heuristic decreases on all eight proposals",()=>{
 const texts=source.proposals.map(p=>target.has(p.pairId)?target.get(p.pairId).proposedV06Description:p.candidateDescription).map(s=>s.replace(/\s+/g,""));
 const counts=new Map(),k=14;
 for(const text of texts)for(const gram of new Set(Array.from({length:Math.max(0,text.length-k+1)},(_,i)=>text.slice(i,i+k))))
  counts.set(gram,(counts.get(gram)||0)+1);
 for(const row of pilot.rows){
  const t=row.proposedV06Description.replace(/\s+/g,"");
  const used=new Uint8Array(t.length);
  for(let i=0;i<=t.length-k;i++)if((counts.get(t.slice(i,i+k))||0)>=16)for(let j=i;j<i+k;j++)used[j]=1;
  const fraction=used.reduce((a,b)=>a+b,0)/t.length;
  assert.ok(fraction<row.baseline14gramCoverage,row.pairId);
 }
});
