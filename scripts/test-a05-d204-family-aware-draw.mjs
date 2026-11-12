import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bank = JSON.parse(readFileSync(new URL("../research/a05/d204-editorial-50-question-bank-v1-1.json", import.meta.url), "utf8"));
const axes = ["A","B","C","D","E"];
const axisPool = {A:12,B:12,C:12,D:12,E:2};
const axisDraw = {A:7,B:7,C:7,D:7,E:2};
const B = ["B_CONSENSUS_DECISION","B_PERSONAL_DECISION","B_THOUGHT_PROCESS","B_TASK_OWNERSHIP","B_RELATIONAL_PRIORITY","B_FULFILLMENT_SHARING"];
const C = ["C_TIME_ALLOCATION","C_PROCESS_VS_OUTCOME","C_POST_GOAL","C_OPPORTUNITY_TIMING","C_FUTURE_UNCERTAINTY","C_LIFE_EVALUATION"];

function hash(seed){let h=2166136261;for(let i=0;i<seed.length;i++)h=Math.imul(h^seed.charCodeAt(i),16777619);return h>>>0;}
function rand(seed){let t=hash(seed);return ()=>{t+=0x6D2B79F5;let x=t;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return ((x^x>>>14)>>>0)/4294967296;};}
function shuffle(xs,r){const a=xs.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function grouped(axis,family){return bank.items.filter(x=>x.axis===axis&&x.proposed_semantic_family===family);}
function sampleB(r){
  const groups = Object.fromEntries(B.map(f=>[f,shuffle(grouped("B",f),r)]));
  const out=B.map(f=>groups[f][0]);
  out.push(groups[B[Math.floor(r()*B.length)]][1]);
  return out;
}
function sampleC(r){
  const groups=Object.fromEntries(C.map(f=>[f,shuffle(grouped("C",f),r)]));
  const timing="C_OPPORTUNITY_TIMING";
  const other=C.filter(f=>f!==timing);
  if(r()<7/12)return [...groups[timing],...other.map(f=>groups[f][0])];
  const extra=shuffle(other,r).slice(0,2);
  return [...other.map(f=>groups[f][0]),...extra.map(f=>groups[f][1])];
}
function mockDraw(seed){
  const r=rand(seed);
  return [
    ...shuffle(bank.items.filter(x=>x.axis==="A"),r).slice(0,7),
    ...sampleB(r),...sampleC(r),
    ...shuffle(bank.items.filter(x=>x.axis==="D"),r).slice(0,7),
    ...bank.items.filter(x=>x.axis==="E")
  ];
}

test("v1.1 has 50 unique wordings and proper A-D 12/E2 allocation",()=>{
  assert.equal(bank.items.length,50);
  assert.equal(new Set(bank.items.map(x=>x.bank_id)).size,50);
  assert.equal(new Set(bank.items.map(x=>[x.stem,x.left,x.right].join("|"))).size,50);
  for(const a of axes)assert.equal(bank.items.filter(x=>x.axis===a).length,axisPool[a]);
});
test("17 edits with preserved prior D202 text and no production scoring approval",()=>{
  assert.equal(bank.items.filter(x=>x.editorial_decision==="D204_REWRITE").length,17);
  for(const x of bank.items){
    if(x.axis==="B"||x.axis==="C")assert.ok(x.previous_D202?.stem && x.previous_D202?.left && x.previous_D202?.right,x.bank_id);
    assert.equal(x.production_scoring_approved,false);
  }
});
test("B and C have exactly 6 provisional subfacets containing two items each",()=>{
  for(const f of B)assert.equal(grouped("B",f).length,2,f);
  for(const f of C)assert.equal(grouped("C",f).length,2,f);
});
test("deterministic 10,000 mock draws satisfy 30-item quotas and facet sampling",()=>{
  for(let i=0;i<10000;i++){
    const rows=mockDraw("D204-"+i),ids=new Set(rows.map(x=>x.bank_id));
    assert.equal(rows.length,30);assert.equal(ids.size,30);
    for(const a of axes)assert.equal(rows.filter(x=>x.axis===a).length,axisDraw[a]);
    for(const f of B){const n=rows.filter(x=>x.proposed_semantic_family===f).length;assert.ok(n>=1&&n<=2,f);}
    for(const f of C)assert.ok(rows.filter(x=>x.proposed_semantic_family===f).length<=2,f);
    assert.ok([0,2].includes(rows.filter(x=>x.proposed_semantic_family==="C_OPPORTUNITY_TIMING").length));
  }
});
test("same seed yields same exact ID sequence",()=>{
  assert.deepEqual(mockDraw("stable").map(x=>x.bank_id),mockDraw("stable").map(x=>x.bank_id));
});
test("two E questions always selected",()=>{
  const want=bank.items.filter(x=>x.axis==="E").map(x=>x.bank_id).sort();
  for(let i=0;i<1000;i++)assert.deepEqual(mockDraw("E-"+i).filter(x=>x.axis==="E").map(x=>x.bank_id).sort(),want);
});
test("empirical inclusion rates stay within ±3pp of 7/12 or 1",()=>{
  const freq=Object.fromEntries(bank.items.map(x=>[x.bank_id,0]));
  for(let i=0;i<10000;i++)for(const x of mockDraw("D204-"+i))freq[x.bank_id]++;
  for(const a of axes)for(const x of bank.items.filter(x=>x.axis===a))
    assert.ok(Math.abs(freq[x.bank_id]/10000-axisDraw[a]/axisPool[a])<0.03,x.bank_id);
});
// This is a reproducible research simulation, NOT live A05 E2E, CI execution evidence,
// or proof that the proposed B/C subfacets are semantically independent.
