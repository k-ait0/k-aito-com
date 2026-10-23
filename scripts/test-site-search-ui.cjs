"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const {isMonoBaseContentRoute}=require("./public-sitemap-routes.cjs");
const ui=require("../site-search-ui.js");
function fakeDoc(){
  const doc={
    createElement(tag){
      return {tagName:tag.toUpperCase(),ownerDocument:doc,dataset:{},children:[],
        append(...nodes){this.children.push(...nodes);},
        replaceChildren(...nodes){this.children=nodes;},
        set textContent(value){this._text=String(value);},
        get textContent(){return this._text??this.children.map(n=>n.textContent).join("");}
      };
    },
    createTextNode(value){return {textContent:String(value)};}
  };
  return doc;
}
const doc=fakeDoc();
const items=[
  {type:"ARTICLE",url:"/notes/kidp-002-whynot/",title:"WHYNOT <記事>",
    summary:"記事 & テスト",metadata:"THINK / 2026.10.08",tags:["内容"]},
  {type:"PROJECT",url:"/projects/kidp/whynot/",title:"WHYNOT",summary:"実装例",
    metadata:"TESTING",tags:[]}
];
const target=doc.createElement("div");
ui.render(target,items);
assert.equal(target.children.length,2);
assert.deepEqual(target.children.map(x=>x.dataset.cardType),["article","project"]);
assert.deepEqual(target.children.map(x=>x.dataset.searchType),["article","project"]);
assert.deepEqual(target.children.map(x=>x.href),items.map(x=>x.url));
assert.equal(target.children[0].children[1].textContent,"WHYNOT <記事>");
assert.equal(target.children[0].children[2].textContent,"記事 & テスト");
assert.equal(target.children[0].children[3].textContent,"#内容");
assert.equal(target.children[1].children.length,3,"Tags are optional");
assert.throws(()=>ui.card({type:"ARTICLE",url:"javascript:alert(1)"},doc),/Invalid/);
ui.render(target,[]);
assert.equal(target.children.length,1);
assert.equal(target.children[0].className,"site-search-empty");
const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const routes=[...sitemap.matchAll(/<loc>https:\/\/k-aito\.com(\/[^<]*)<\/loc>/g)].map(x=>x[1]).filter(route=>!isMonoBaseContentRoute(route));
assert.ok(routes.length>=24);
for(const route of routes){
  const html=fs.readFileSync(path.join(root,route.slice(1),"index.html"),"utf8");
  const core=html.indexOf('src="/site-search-core.js');
  const shared=html.indexOf('src="/site-search-ui.js');
  const consumer=html.indexOf('src="'+(route==="/"?"/app.js":"/site-search.js"));
  assert.ok(core>=0&&shared>core&&consumer>shared,"Search scripts ordered "+route);
  assert.equal((html.match(/src="\/site-search-ui\.js/g)||[]).length,1,"Shared search UI duplicated "+route);
  assert.equal((html.match(/href="\/site-search\.css/g)||[]).length,1,"Missing common result styles "+route);
}
console.log("PASS shared search-result cards: 2 public types, safe DOM, "+routes.length+" pages with ordered assets");
