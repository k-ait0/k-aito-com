"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const {render,update,trail}=require("./sync-site-breadcrumbs.cjs");
const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const urls=[...sitemap.matchAll(/<loc>https:\/\/k-aito\.com(\/[^<]*)<\/loc>/g)].map(m=>m[1]);
assert.ok(urls.length>=24,"Unexpected reduction in public sitemap");
for(const route of urls){
  const src=fs.readFileSync(path.join(root,route.slice(1),"index.html"),"utf8");
  if(route==="/"){
    assert.ok(!src.includes('data-site-breadcrumbs'),"HOME must not have breadcrumb data");
    continue;
  }
  const generated=render(route);
  const matches=src.match(/<nav class="breadcrumb" aria-label="パンくずリスト">[\s\S]*?<\/nav>/g)||[];
  assert.equal(matches.length,1,"Canonical breadcrumb missing "+route);
  assert.equal(matches[0],generated.markup,"Breadcrumb drift "+route);
  assert.ok(src.includes(generated.json),"Breadcrumb JSON-LD drift "+route);
  assert.equal(update(src,route),src,"Breadcrumb sync must be idempotent "+route);
  const data=JSON.parse(generated.json.match(/>([\s\S]*?)<\/script>/)[1]);
  assert.equal(data["@type"],"BreadcrumbList");
  assert.deepEqual(data.itemListElement.map(x=>x.position),data.itemListElement.map((x,i)=>i+1));
  assert.deepEqual(data.itemListElement.map(x=>x.item),trail(route).map(x=>"https://k-aito.com"+x.url));
  assert.equal((generated.markup.match(/aria-current="page"/g)||[]).length,1);
  for(const parent of trail(route).slice(0,-1)){
    const local=parent.url==="/"?"index.html":path.join(parent.url.slice(1),"index.html");
    if(local!=="index.html")assert.ok(fs.existsSync(path.join(root,local)),"Missing breadcrumb parent "+local);
  }
}
console.log("PASS canonical breadcrumbs and JSON-LD: "+urls.length+" published routes, no drift");
