import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const text=readFileSync(new URL('../projects/kidp/life-design-lab/a05/reflection-d98.html',import.meta.url),'utf8');
const code=text.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const blob=()=>{const bytes=Buffer.from(text,'utf8');return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')};
function run(){
  const ids=['case-picker','case-name','case-text','case-question','case-announcement','reflection-progress','reflection-title','reflection-tip','prev','next','restart'];
  const nodes=new Map(),handlers=new Map();
  for(const id of ids)nodes.set(id,{value:id==='case-picker'?'0':'',textContent:'',disabled:false,focused:false,
    addEventListener(type,cb){handlers.set(id+':'+type,cb)},focus(){this.focused=true}});
  vm.runInNewContext(code,{document:{getElementById(id){assert.ok(nodes.has(id),id);return nodes.get(id)}}},{timeout:1000});
  return {node:id=>nodes.get(id),click:id=>handlers.get(id+':click')(),select:i=>{nodes.get('case-picker').value=String(i);handlers.get('case-picker:change')()}};
}
test('D98 exact Git source and no user data collection',()=>{
  assert.equal(blob(),'83a45c66f1847635d00f7add38913738964f1577');
  assert.match(text,/noindex,nofollow/);
  assert.doesNotMatch(text,/<input\b|<textarea\b|<form\b|<iframe\b/i);
  assert.doesNotMatch(text,/localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest|\bfetch\s*\(/);
  assert.ok(code);new vm.Script(code);
});
test('D98 landmarks, skip navigation, accessible headings and live status',()=>{
  assert.match(text,/<html lang="ja">/);
  assert.match(text,/<a href="#main-content" class="skip-link">本文へ移動<\/a>/);
  assert.match(text,/<main id="main-content" tabindex="-1">/);
  assert.match(text,/<h3 id="reflection-title" tabindex="-1" aria-describedby="reflection-progress"><\/h3>/);
  assert.match(text,/<p id="case-announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"><\/p>/);
  assert.match(text,/<label for="case-picker">/);
  assert.match(text,/<noscript>/);
  assert.match(text,/@media\(forced-colors:active\)/);
});
test('D98 all eight fictional scenarios produce one complete announced message',()=>{
  const x=run();assert.equal((text.match(/<option value="[0-7]">/g)||[]).length,8);
  for(let i=0;i<8;i++){
    x.select(i);
    assert.match(x.node('case-name').textContent,new RegExp('例'+(i+1)));
    assert.match(x.node('case-announcement').textContent,new RegExp('例'+(i+1)));
    assert.ok(x.node('case-announcement').textContent.includes(x.node('case-question').textContent));
  }
});
test('D98 step navigation and focus transfer are predictable',()=>{
  const x=run();assert.equal(x.node('prev').disabled,true);
  for(let step=2;step<=4;step++){
    x.click('next');assert.match(x.node('reflection-progress').textContent,new RegExp(step+' / 4'));
    assert.equal(x.node('reflection-title').focused,true);
  }
  assert.equal(x.node('next').disabled,true);
  x.click('prev');assert.match(x.node('reflection-progress').textContent,/3 \/ 4/);
  x.click('restart');assert.match(x.node('reflection-progress').textContent,/1 \/ 4/);
});
test('D98 draft wording and non-diagnostic release restrictions preserved',()=>{
  assert.match(text,/何かに取り組んでいる間の経験そのものを大切にしたい/);
  assert.match(text,/特別な出来事に限らず、日々の小さな経験/);
  assert.match(text,/構成概念も質問文も未承認/);
  assert.match(text,/得点を計算しません/);
  assert.doesNotMatch(code,/\btypeId\b|\bgroupId\b|\bscoreAssessment\b/);
});
