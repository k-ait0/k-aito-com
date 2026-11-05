import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const html=readFileSync(new URL("../projects/kidp/life-design-lab/a05/reflection-d96.html",import.meta.url),"utf8");
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
function preview(){
 const ids=["case-picker","case-name","case-text","case-question",
   "reflection-progress","reflection-title","reflection-tip","prev","next","restart"];
 const controls=new Map(),handlers=new Map();
 for(const id of ids)controls.set(id,{
  value:id==="case-picker"?"0":"",textContent:"",disabled:false,
  addEventListener(kind,cb){handlers.set(id+":"+kind,cb)},
  focus(){this.focused=true}
 });
 vm.runInNewContext(js,{document:{getElementById(id){assert.ok(controls.has(id));return controls.get(id)}}},
   {filename:"D96-inline.js",timeout:1000});
 const click=id=>handlers.get(id+":click")();
 const select=n=>{controls.get("case-picker").value=String(n);handlers.get("case-picker:change")()};
 const get=id=>controls.get(id);
 return{get,click,select};
}
test("D96 never stores or sends a user's answers",()=>{
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/非診断/);
 assert.doesNotMatch(html,/<input\b|<textarea\b|<form\b|<iframe\b/i);
 assert.doesNotMatch(html,/localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest|\bfetch\s*\(/);
 assert.doesNotMatch(html,/<script[^>]+src=|https?:\/\//);
 assert.doesNotMatch(js,/\bscoreAssessment\b|\btypeId\b|\bgroupId\b/);
 new vm.Script(js);
});
test("D96 shows 8 fictional cases with accessible distinct examples",()=>{
 const a=preview();
 assert.equal((html.match(/<option value="\d">/g)||[]).length,8);
 for(let n=0;n<8;n++){
  a.select(n);
  assert.match(a.get("case-name").textContent,new RegExp("例"+(n+1)));
  assert.ok(a.get("case-text").textContent.length>10);
  assert.ok(a.get("case-question").textContent.length>10);
 }
});
test("D96 guide navigates all 4 steps with correct disabled boundaries",()=>{
 const a=preview();
 assert.match(a.get("reflection-progress").textContent,/1 \/ 4/);
 assert.equal(a.get("prev").disabled,true);
 for(let i=2;i<=4;i++){a.click("next");assert.match(a.get("reflection-progress").textContent,new RegExp(i+" / 4"))}
 assert.equal(a.get("next").disabled,true);
 a.click("prev");
 assert.match(a.get("reflection-progress").textContent,/3 \/ 4/);
 a.click("restart");
 assert.match(a.get("reflection-progress").textContent,/1 \/ 4/);
 assert.equal(a.get("prev").disabled,true);
});
test("D96 draft prompts remain visibly unapproved and non-scoring",()=>{
 assert.match(html,/何かに取り組んでいる間の経験そのものを大切にしたい/);
 assert.match(html,/特別な出来事に限らず、日々の小さな経験/);
 assert.match(html,/構成概念も質問文も未承認/);
 assert.match(html,/得点を計算しません/);
 assert.match(html,/回答欄、保存、送信、分析タグはありません/);
});
