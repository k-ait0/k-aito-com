import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const html=readFileSync(new URL('../projects/kidp/life-design-lab/a05/reflection-d99.html',import.meta.url),'utf8');
const body=Buffer.from(html,'utf8');
const sha=createHash('sha1').update("blob "+body.length+"\0").update(body).digest('hex');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
function load(){
 const ids=['case-picker','case-name','case-text','case-question','case-announcement','reflection-progress','reflection-title','reflection-tip','prev','next','restart','print-worksheet'];
 const nodes=new Map(),events=new Map(),calls={print:0};
 for(const id of ids)nodes.set(id,{value:id==='case-picker'?'0':'',textContent:'',disabled:false,
   focus(){this.focused=true},addEventListener(event,fn){events.set(id+":"+event,fn)}});
 const document={getElementById(id){assert.ok(nodes.has(id),id);return nodes.get(id)}};
 vm.runInNewContext(js,{document,window:{print(){calls.print++}}},{filename:'D99-inline.js',timeout:1000});
 const trigger=(id,event='click')=>events.get(id+":"+event)();
 return {get:id=>nodes.get(id),trigger,calls};
}
test('D99 exact reviewed source, no user inputs, persistence or network',()=>{
 assert.equal(sha,'2e5dbd2de9fed346516892a5cad78310eab8f868');
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.doesNotMatch(html,/<input\b|<textarea\b|<form\b/i);
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest|\bfetch\s*\(/);
 new vm.Script(js);
});
test('D99 front-of-page explains non-diagnostic and unvalidated status clearly',()=>{
 assert.match(html,/これは診断ではなく、考えを整理するための練習です/);
 assert.match(html,/科学的な妥当性は未検証/);
 assert.match(html,/点数やタイプ判定は出ません/);
 assert.doesNotMatch(html,/3分間のセルフリフレクション/);
 assert.match(html,/4つの問いで振り返る/);
});
test('D99 eight synthetic cases and four guide steps remain usable',()=>{
 const app=load();
 assert.equal((html.match(/<option value="[0-7]">/g)||[]).length,8);
 for(let i=0;i<8;i++){
   app.get('case-picker').value=String(i);app.trigger('case-picker','change');
   assert.match(app.get('case-name').textContent,new RegExp('例'+(i+1)));
   assert.match(app.get('case-announcement').textContent,new RegExp('例'+(i+1)));
 }
 for(let i=2;i<=4;i++){
   app.trigger('next');assert.match(app.get('reflection-progress').textContent,new RegExp(i+' / 4'));
 }
 assert.equal(app.get('next').disabled,true);
 app.trigger('prev');assert.match(app.get('reflection-progress').textContent,/3 \/ 4/);
 app.trigger('restart');assert.match(app.get('reflection-progress').textContent,/1 \/ 4/);
});
test('D99 print action is explicit and does not capture any answer',()=>{
 const app=load();assert.equal(app.calls.print,0);
 app.trigger('print-worksheet');assert.equal(app.calls.print,1);
 assert.match(html,/<button id="print-worksheet" type="button">4つの問いを印刷<\/button>/);
 assert.match(html,/@media print\{/);
 assert.match(html,/<section id="print-worksheet-page" class="print-sheet"/);
 assert.equal((html.match(/class="writing-lines"/g)||[]).length,4);
 assert.match(html,/@page\{size:A4;margin:16mm\}/);
});
test('D99 retains skip navigation, accessible live-region and static fallback',()=>{
 assert.match(html,/<a href="#main-content" class="skip-link">本文へ移動<\/a>/);
 assert.match(html,/<h3 id="reflection-title" tabindex="-1" aria-describedby="reflection-progress"><\/h3>/);
 assert.match(html,/id="case-announcement" class="sr-only" role="status" aria-live="polite"/);
 assert.match(html,/<noscript>/);
 assert.match(html,/@media\(forced-colors:active\)/);
});
