// A05 D207: deterministic research-only tests; not the production A05 engine.
// Run: node --test scripts/test-a05-d206-full50-coverage.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const bank=JSON.parse(readFileSync(new URL("../research/a05/d206-editorial-50-question-bank-v1-2.json",import.meta.url),"utf8"));
const rows=bank.items;
const axes=["A","B","C","D","E"];
const quota={A:7,B:7,C:7,D:7,E:2};
const pool={A:12,B:12,C:12,D:12,E:2};
const by={};
for(const a of axes)by[a]={};
for(const q of rows){const family=q.proposed_semantic_family||"E_AUX";(by[q.axis][family]??=[]).push(q);}
const families={};
for(const a of ["A","D"])families[a]={
  paired:Object.keys(by[a]).filter(f=>by[a][f].length===2),
  singleton:Object.keys(by[a]).filter(f=>by[a][f].length===1)
};
const B=Object.keys(by.B),C=Object.keys(by.C);
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
function rand(seed){let t=hash(seed);return()=>{t+=0x6D2B79F5;let x=t;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return ((x^x>>>14)>>>0)/4294967296;};}
function shuffled(xs,r){const a=xs.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function AD(a,r){
  const {paired,singleton}=families[a];
  const singles=singleton.filter(()=>r()<7/12);
  const groups=Object.fromEntries(paired.map(f=>[f,shuffled(by[a][f],r)]));
  return [...singles.flatMap(f=>by[a][f]),...paired.map(f=>groups[f][0]),...shuffled(paired,r).slice(0,2-singles.length).map(f=>groups[f][1])];
}
function chooseB(r){
 const groups=Object.fromEntries(B.map(f=>[f,shuffled(by.B[f],r)]));
 return [...B.map(f=>groups[f][0]),groups[B[Math.floor(r()*B.length)]][1]];
}
function chooseC(r){
 const groups=Object.fromEntries(C.map(f=>[f,shuffled(by.C[f],r)]));
 const timing="C_OPPORTUNITY_TIMING",others=C.filter(f=>f!==timing);
 if(r()<7/12)return [...groups[timing],...others.map(f=>groups[f][0])];
 return [...others.map(f=>groups[f][0]),...shuffled(others,r).slice(0,2).map(f=>groups[f][1])];
}
function draw(seed){const r=rand(seed);return [...AD("A",r),...chooseB(r),...chooseC(r),...AD("D",r),...by.E.E_AUX];}

test("50 source-grounded unique items and axis quotas",()=>{
 assert.equal(rows.length,50);
 assert.equal(new Set(rows.map(x=>x.bank_id)).size,50);
 assert.equal(new Set(rows.map(x=>[x.stem,x.left,x.right].join("|"))).size,50);
 for(const a of axes)assert.equal(rows.filter(x=>x.axis===a).length,pool[a]);
 assert.ok(rows.every(x=>x.stem&&x.left&&x.right&&x.selected_source_id&&x.decision_reason));
});
test("preserves 27 prior-revision/AD-revision historical records",()=>{
 assert.equal(rows.filter(x=>x.editorial_decision==="D204_REWRITE").length,17);
 assert.equal(rows.filter(x=>x.editorial_decision==="D206_REWRITE").length,10);
 assert.ok(rows.filter(x=>x.axis==="A"||x.axis==="D").every(x=>x.previous_D204?.stem&&x.previous_D204?.left&&x.previous_D204?.right));
 assert.ok(rows.every(x=>x.production_scoring_approved===false&&x.user_formally_approved===false));
});
test("A/D are five pairs and two singletons, B/C six pairs",()=>{
 for(const a of ["A","D"]){assert.equal(families[a].paired.length,5);assert.equal(families[a].singleton.length,2);}
 for(const a of ["B","C"]){assert.equal(Object.keys(by[a]).length,6);assert.ok(Object.values(by[a]).every(v=>v.length===2));}
});
test("10,000 simulation draws meet quotas, 30 distinct IDs, and family caps",()=>{
 for(let i=0;i<10000;i++){
  const x=draw("D206-"+i);
  assert.equal(x.length,30);
  assert.equal(new Set(x.map(q=>q.bank_id)).size,30);
  for(const a of axes)assert.equal(x.filter(q=>q.axis===a).length,quota[a]);
  for(const a of ["A","B","C","D"]){
    const count=Object.keys(by[a]).map(f=>x.filter(q=>q.axis===a&&q.proposed_semantic_family===f).length);
    assert.ok(count.every(n=>n<=2));
    assert.ok(count.filter(n=>n>0).length>=(a==="B"?6:5));
  }
  assert.ok([0,2].includes(x.filter(q=>q.proposed_semantic_family==="C_OPPORTUNITY_TIMING").length));
 }
});
test("C paired timing questions are always shown together or omitted together",()=>{
 const ids=by.C.C_OPPORTUNITY_TIMING.map(x=>x.bank_id);
 for(let i=0;i<1000;i++){const x=new Set(draw("CP-"+i).map(q=>q.bank_id));assert.equal(x.has(ids[0]),x.has(ids[1]));}
});
test("same seed yields identical result",()=>assert.deepEqual(draw("stable").map(q=>q.bank_id),draw("stable").map(q=>q.bank_id)));
test("all E items are always included",()=>{
 const e=rows.filter(q=>q.axis==="E").map(q=>q.bank_id).sort();
 for(let i=0;i<1000;i++)assert.deepEqual(draw("E-"+i).filter(q=>q.axis==="E").map(q=>q.bank_id).sort(),e);
});
test("item inclusion frequency is within ±3 percentage points of theoretical rate",()=>{
 const frequency=Object.fromEntries(rows.map(q=>[q.bank_id,0]));
 for(let i=0;i<10000;i++)for(const q of draw("D206-"+i))frequency[q.bank_id]++;
 for(const a of axes)for(const q of rows.filter(q=>q.axis===a))
  assert.ok(Math.abs(frequency[q.bank_id]/10000-quota[a]/pool[a])<0.03,q.bank_id);
});
// This suite tests a mock draw, not production A05 UI, scoring, or psychological validity.
