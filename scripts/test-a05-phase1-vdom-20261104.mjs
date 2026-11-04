/**
 * A05: execute actual preview JavaScript in a virtual DOM adapter (no browser).
 * Run: node --test scripts/test-a05-phase1-vdom-20261104.mjs
 * Not Chromium / iOS Safari / VoiceOver / editorial QA.
 */
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const file='projects/kidp/life-design-lab/a05/phase1-short-report-preview-20261104.html';
const html=readFileSync(new URL(file,root),'utf8');
const a='const SELF=', b=';\nconst PAIRS=', c=';\nconst ids=';
const start=html.indexOf(a)+a.length,mid=html.indexOf(b,start),end=html.indexOf(c,mid);
assert.ok(start>0 && mid>start && end>mid,'data marker positions');
const types=JSON.parse(html.slice(start,mid));
const pairs=JSON.parse(html.slice(mid+b.length,end));
const byType=new Map(types.map(x=>[x.typeId,x]));
const byPair=new Map(pairs.map(x=>[x.pairId,x]));
const script=html.slice(html.indexOf('<script>')+8,html.indexOf('</script>'));

class Element {
 constructor(tag,id){this.tag=tag;this.id=id;this.children=[];this.attrs={};this.listeners={};this.value='';this.hidden=false;this.textContent='';this.className='';}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 setAttribute(k,v){this.attrs[k]=v;}
 getAttribute(k){return this.attrs[k];}
 addEventListener(k,fn){this.listeners[k]=fn;}
 click(){this.listeners.click?.();}
}
const keys=['first','second','result','tab-self','tab-pair','second-field','print'];
const elements=Object.fromEntries(keys.map(k=>[k,new Element('stub',k)]));
const document={getElementById:id=>elements[id],createElement:tag=>new Element(tag)};
const window={print(){}};
new Function('document','window',script)(document,window);
const walk=e=>[e,...e.children.flatMap(walk)];
const nodes=(tag,cls)=>walk(elements.result).filter(e=>e.tag===tag&&(!cls||e.className===cls));

test('16 self results: type, chapters, questions',()=>{
 assert.equal(types.length,16);
 for(const t of types){
  elements.first.value=t.typeId;elements.first.listeners.change();
  assert.equal(nodes('h2')[0]?.textContent,t.emoji+' '+t.typeId+'｜'+t.name,t.typeId);
  assert.equal(nodes('section','section').length,6,t.typeId);
  assert.equal(nodes('li').length,3,t.typeId);
 }
});
test('256 ordered pairs: selected-order heading, table headers, four correctly oriented axes',()=>{
 assert.equal(pairs.length,136);
 elements['tab-pair'].click();
 assert.equal(elements['second-field'].hidden,false);
 for(const [a,t1] of byType)for(const [b,t2] of byType){
  elements.first.value=a;elements.second.value=b;elements.second.listeners.change();
  const data=byPair.get([a,b].sort().join('-'));
  assert.ok(data,a+'x'+b);
  assert.equal(nodes('h2')[0]?.textContent,t1.name+' × '+t2.name,a+'x'+b);
  assert.deepEqual(nodes('th').map(x=>x.textContent),['観点',t1.name,t2.name],a+'x'+b);
  const rows=nodes('tr').filter(x=>x.children.length&&x.children[0].tag==='td');
  assert.equal(rows.length,4,a+'x'+b);
  const reversed=a!==data.typeIds[0];
  data.axisComparison.forEach((axis,i)=>{
   assert.deepEqual(rows[i].children.map(x=>x.textContent),[
    axis.label+'（'+(axis.relation==='shared'?'共通':'相違')+'）',
    reversed?axis.second:axis.first,
    reversed?axis.first:axis.second
   ],a+'x'+b+' '+axis.axis);
  });
  assert.equal(nodes('section','section').length,6,a+'x'+b);
  assert.equal(nodes('li').length,3,a+'x'+b);
 }
});
test('switch to self view hides pair selector and updates ARIA state',()=>{
 elements['tab-self'].click();
 assert.equal(elements['second-field'].hidden,true);
 assert.equal(elements['tab-self'].getAttribute('aria-selected'),'true');
 assert.equal(elements['tab-pair'].getAttribute('aria-selected'),'false');
 assert.equal(nodes('section','section').length,6);
});
