import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bank = JSON.parse(readFileSync(new URL("../research/a05/d202-editorial-50-question-bank.json", import.meta.url), "utf8"));
const questions = readFileSync(new URL("../projects/kidp/life-design-lab/a05/questions.mjs", import.meta.url), "utf8");
const engine = readFileSync(new URL("../projects/kidp/life-design-lab/a05/engine.mjs", import.meta.url), "utf8");
const axes = ["A", "B", "C", "D", "E"];
const pool = {A:12,B:12,C:12,D:12,E:2}, count = {A:7,B:7,C:7,D:7,E:2};
const clusters = {
  A_REPEATED_LIFE_SYSTEM:[4,7,10],
  B_JOINT_FINAL_DECISION:[13,15,17,20,23,24],
  B_RELATIONAL_ARRANGEMENT:[14,16,18,19,22],
  C_TIME_ALLOCATION:[25,26,27,28,29,30,31],
  D_STUDY_SCOPE:[38,39,44,47,48]
};
const norm = x => String(x ?? "").replace(/[\s。、，・？！『』「」]/g,"");
function valid(b) {
  const rows = b.items;
  return rows.length===50 && rows.every((x,i)=>x.slot===i+1) &&
    new Set(rows.map(x=>x.bank_id)).size===50 &&
    axes.every(a=>rows.filter(x=>x.axis===a).length===pool[a]) &&
    rows.every(x=>x.stem && x.left && x.right && x.selected_source_id && x.decision_reason && x.production_scoring_approved===false && norm(x.left)!==norm(x.right)) &&
    new Set(rows.map(x=>norm(x.stem+x.left+x.right))).size===50;
}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++) h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
function random(seed){let t=hash(seed);return ()=>{t+=0x6D2B79F5;let x=t;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return ((x^x>>>14)>>>0)/4294967296;};}
function mockDraw(seed) {
  const rand=random(seed), result=[];
  for(const a of axes) {
    const group=bank.items.filter(x=>x.axis===a);
    for(let i=group.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[group[i],group[j]]=[group[j],group[i]];}
    result.push(...group.slice(0,count[a]));
  }
  return result;
}

test("editorial 50 structural invariants",()=>assert.equal(valid(bank),true));
test("43 D146 revisions and seven source-grounded replacements",()=>{
  assert.equal(bank.items.filter(x=>x.editorial_decision==="SELECT_REVISED_TEXT").length,43);
  assert.equal(bank.items.filter(x=>x.editorial_decision==="REPLACE_AND_SELECT_TEXT").length,7);
});
test("D202 is not wired to live A05 questions or engine",()=>{
  for(const x of [questions,engine]){assert.equal(x.includes("d202-editorial-50"),false);assert.equal(x.includes("A05-V1-"),false);}
});
test("corrupted copies are detected",()=>{
  const cp=()=>JSON.parse(JSON.stringify(bank));
  let x=cp();x.items.pop();assert.equal(valid(x),false);
  x=cp();x.items[1].bank_id=x.items[0].bank_id;assert.equal(valid(x),false);
  x=cp();x.items[1].axis="E";assert.equal(valid(x),false);
  x=cp();x.items[1].right=x.items[1].left;assert.equal(valid(x),false);
  x=cp();x.items[1].selected_source_id="";assert.equal(valid(x),false);
  x=cp();x.items[1].production_scoring_approved=true;assert.equal(valid(x),false);
});
test("10,000 stratified mock draws have exactly 30 distinct questions",()=>{
  for(let i=0;i<10000;i++){
    const rows=mockDraw("A05-"+i);
    assert.equal(rows.length,30);
    assert.equal(new Set(rows.map(x=>x.bank_id)).size,30);
    for(const a of axes)assert.equal(rows.filter(x=>x.axis===a).length,count[a]);
  }
});
test("same seed yields same mock draw",()=>assert.deepEqual(mockDraw("same").map(x=>x.bank_id),mockDraw("same").map(x=>x.bank_id)));
test("E remains included on every draw",()=>{
  const expected=bank.items.filter(x=>x.axis==="E").map(x=>x.bank_id).sort();
  for(let i=0;i<1000;i++)assert.deepEqual(mockDraw("E-"+i).filter(x=>x.axis==="E").map(x=>x.bank_id).sort(),expected);
});
test("frequency is near expected rate in 10,000 synthetic draws",()=>{
  const freq=Object.fromEntries(bank.items.map(x=>[x.bank_id,0]));
  for(let i=0;i<10000;i++)for(const x of mockDraw("frequency-"+i))freq[x.bank_id]++;
  for(const a of axes)for(const x of bank.items.filter(x=>x.axis===a))
    assert.ok(Math.abs(freq[x.bank_id]/10000-count[a]/pool[a])<0.03,x.bank_id);
});
test("meaning-overlap warning clusters are present, not certified independent",()=>{
  for(const [name,slots] of Object.entries(clusters)){assert.ok(slots.length>2,name);for(const s of slots)assert.equal(bank.items[s-1].slot,s);}
  assert.ok(bank.items.every(x=>x.production_scoring_approved===false));
});
// These tests do not execute the live A05 engine or establish psychometric validity.
