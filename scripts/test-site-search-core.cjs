"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const load=(file,key)=>{
  const scope={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,file),"utf8"),scope,{timeout:4000});
  return scope.window[key];
};
const core=require("../site-search-core.js");
const items=core.sources(load("content-index.js","KAitoContent"),load("project-search-index.js","KAitoProjects"));
const hrefs=(q,options)=>core.search(items,q,options).map(x=>x.url);
const articleCount=items.filter(x=>x.type==="ARTICLE").length;
const projectCount=items.filter(x=>x.type==="PROJECT").length;
assert.ok(articleCount>=4&&projectCount>=8,"Unexpected shrinkage in public search index");
assert.equal(new Set(items.map(x=>x.url)).size,items.length,"Search URL duplicates");
assert.ok(items.every(x=>x.title&&x.url&&x.searchText&&x.metadata));
assert.ok(items.every(x=>x.type==="ARTICLE"||x.type==="PROJECT"));
assert.deepEqual(hrefs("ＷＨＹＮＯＴ"),hrefs("whynot"),"NFKC width normalization");
assert.deepEqual(hrefs("  XServer  GitHub "),["/notes/site-launch-trouble/"]);
assert.deepEqual(hrefs("原子炉"),["/notes/nuclear-industrial-carrier/"]);
assert.ok(hrefs("WHYNOT").includes("/notes/kidp-002-whynot/"));
assert.ok(hrefs("WHYNOT").includes("/projects/kidp/whynot/"));
assert.ok(hrefs("駅生活圏").includes("/projects/kidp/station-life/"));
assert.ok(hrefs("サンケイビル").includes("/notes/media-public-interest-sankei-building/"));
assert.ok(!items.some(x=>x.url.startsWith("/tools/")||x.url.includes("/mono-base/")));
assert.ok(core.search(items,"WHYNOT",{projectsOnly:true}).every(x=>x.type==="PROJECT"));
assert.equal(hrefs("存在しない語句kd921").length,0);
assert.equal(core.search(items,"").length,items.length,"Blank query shows all indexed public pages");
for(const q of ["WHYNOT","原子炉","駅生活圏","XServer GitHub","サンケイビル",""]){
  const actual=core.search(items,q);
  assert.deepEqual(actual.map(x=>x.url),core.search(items,q).map(x=>x.url),"Stable ranking "+q);
  assert.ok(actual.every(x=>x.relevance>=0),"Negative relevance "+q);
}
console.log("PASS shared KAITO search: "+articleCount+" articles, "+projectCount+
  " public projects, normalization, filters, canonical links and deterministic ranking");
