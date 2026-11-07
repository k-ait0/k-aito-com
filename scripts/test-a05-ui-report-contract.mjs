import test from 'node:test';
import assert from 'node:assert/strict';

/** Native Node 22 smoke test using real A05 app.mjs with a mock DOM.
 * Not a substitute for Playwright Chromium or Safari/VoiceOver QA.
 * No user answers, browser database, external network, or persistence.
 */
const previous = {document:globalThis.document,window:globalThis.window};
const listeners={};
const root={
 innerHTML:'',setAttribute(){},contains(){return true},
 querySelector(){return null},querySelectorAll(){return []},
 addEventListener(type,callback){listeners['root:'+type]=callback}
};
const tabs={
 setAttribute(){},querySelectorAll(){return []},
 addEventListener(type,callback){listeners['tabs:'+type]=callback}
};
const notice={hidden:true,textContent:''};
globalThis.document={
 querySelector(selector){return {'#a05-content':root,'#a05-tabs':tabs,'#a05-notice':notice}[selector]??null},
 querySelectorAll(){return []}
};
let printCalls=0;
globalThis.window={print(){printCalls++}};
async function press(dataset){
 const button={dataset,disabled:false};
 await listeners['root:click']({target:{closest(sel){return sel==='button'?button:null}}});
}
try{
 await import('../projects/kidp/life-design-lab/a05/app.mjs');
 const deadline=Date.now()+5000;
 while(!root.innerHTML.includes('data-action="sample"')&&Date.now()<deadline)
   await new Promise(resolve=>setTimeout(resolve,10));
 assert.match(root.innerHTML,/data-action="sample"/,'A05 home view should initialize');
 await test('T11 sample navigates through real click handler to ten-page report',async()=>{
  await press({action:'sample',index:'10',wealth:'time'});
  assert.match(root.innerHTML,/T11/);
  assert.match(root.innerHTML,/data-view="report"/);
  await press({view:'report'});
  assert.equal((root.innerHTML.match(/class="report-sheet"/g)||[]).length,10);
  assert.equal((root.innerHTML.match(/href="#a05-report-p\d+"/g)||[]).length,10);
  assert.match(root.innerHTML,/自由な冒険者/);
 });
 await test('Print button is user-initiated, not automatic',async()=>{
  assert.equal(printCalls,0);
  await press({action:'print-report'});
  assert.equal(printCalls,1);
 });
 await test('Back to summary button reopens the result',async()=>{
  await press({view:'result'});
  assert.match(root.innerHTML,/10ページレポートを読む/);
 });
 await test('T14 alternative sample changes both type and ten-page report',async()=>{
  await press({view:'home'});
  await press({action:'sample',index:'13',wealth:'money'});
  await press({view:'report'});
  assert.match(root.innerHTML,/T14/);
  assert.match(root.innerHTML,/理想を育てる共創者/);
  assert.equal((root.innerHTML.match(/class="report-sheet"/g)||[]).length,10);
 });
}finally{
 globalThis.document=previous.document;
 globalThis.window=previous.window;
}
