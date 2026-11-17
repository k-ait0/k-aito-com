import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { AXES } from '../projects/kidp/life-design-lab/a05/questions.mjs';
import { TYPES, GROUPS } from '../projects/kidp/life-design-lab/a05/types.mjs';
import { renderVisualPreview } from '../projects/kidp/life-design-lab/a05/visual-preview.mjs';
import { resolveVisualDisplay } from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';

const rootPath = resolve(dirname(fileURLToPath(import.meta.url)), '../projects/kidp/life-design-lab/a05/');
const moduleSource = readFileSync(resolve(rootPath,'app.mjs'),'utf8');
const stripImports = text => text.replace(/import[\s\S]*?from ["'][^"']+["'];?\s*/g, '');
function makeHarness(){
 const handlers = {};
 let focused = 0;
 const root = {
  innerHTML:'', setAttribute(){}, addEventListener(type,fn){handlers[type]=fn;},
  querySelector(){return {focus(){focused++}};}, querySelectorAll(){return[];},
  contains(){return true;}
 };
 const tabs = { setAttribute(){}, querySelectorAll(){return[];}, addEventListener(){} };
 const notice = {hidden:true,textContent:''};
 const document = {
  querySelector(s){return ({'#a05-content':root,'#a05-tabs':tabs,'#a05-notice':notice})[s]??null;},
  querySelectorAll(){return[];},body:{},createElement(){return{};}
 };
 const prefix = stripImports(moduleSource);
 assert.ok(prefix.endsWith('initialize();\n'), 'unexpected app footer; review harness before updating');
 const code = prefix.slice(0,-'initialize();\n'.length)+'\nreturn {state, renderResult, render, renderReportView};';
 const getApp = new Function('document','AXES','QUESTIONS','TYPES','GROUPS','renderVisualPreview','resolveVisualDisplay','renderReport',code);
 const app = getApp(document,AXES,[],TYPES,GROUPS,renderVisualPreview,resolveVisualDisplay,()=>'<section>report intact</section>');
 return {app,handlers,root,focused:()=>focused};
}
function sample(){
 return {
  id:'qa-sample', result:{
   classification:'classified',typeId:'T03',wealth:'time',
   axes:AXES.map((a,i)=>({id:a.id,value:i===0?-65:35,n:6,status:'classified',direction:i===0?-1:1}))
  },
  presentation:{group:'G1',name:'旧分類テスト',summary:'試験中の文章',emoji:'📘',action:'次の行動'}
 };
}
test('existing result remains intact; visual preview is marked independent',()=>{
 const {app}=makeHarness();
 const snapshot=sample(),before=JSON.stringify(snapshot);
 app.state.sample=snapshot;app.state.view='result';
 const html=app.renderResult();
 for(const fragment of ['あなたの価値観の現在地','T03','旧分類テスト','5軸のスコア',
  '診断判定とは未連動','src="./crests/world-tree.svg"','--a05-vp-color:#FF3B5C',
  'data-view="report"']){
  assert.ok(html.includes(fragment),fragment);
 }
 for(const axis of AXES)assert.ok(html.includes(axis.name),axis.name);
 assert.equal(JSON.stringify(snapshot),before);
});
test('manual visual controls update only preview state, never the assessment',async()=>{
 const {app,handlers,root,focused}=makeHarness();
 const snapshot=sample(),before=JSON.stringify(snapshot);
 app.state.sample=snapshot;app.state.view='result';
 for(const [field,raw] of [['motif','pegasus'],['accent','B'],['eAxis','money'],['motion','on']]){
  const select={dataset:{visualSetting:field},value:raw,closest(){return this;}};
  await handlers.change({target:select});
 }
 assert.deepEqual(app.state.visualPreview,{motif:'pegasus',accent:'B',eAxis:'money',motion:true});
 assert.match(root.innerHTML,/crests\/pegasus\.svg/);
 assert.match(root.innerHTML,/--a05-vp-color:#29B6FF/);
 assert.match(root.innerHTML,/a05-vp-moving/);
 assert.equal(JSON.stringify(snapshot),before,'the stored snapshot must not change');
 assert.equal(focused(),4);
 app.state.view='report';
 assert.match(app.renderReportView(),/report intact/);
});
test('legacy type ids and invalid RGBY cannot be assigned to motifs',()=>{
 assert.throws(()=>resolveVisualDisplay({motif:'T01',accent:'R'}),TypeError);
 assert.throws(()=>resolveVisualDisplay({motif:'world-tree',accent:'Q'}),TypeError);
});
