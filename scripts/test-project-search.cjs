"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const vm=require("node:vm"),cp=require("node:child_process"),os=require("node:os");
const root=path.resolve(__dirname,"..");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"kaito-project-search-"));
const xml=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const routes=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>new URL(x[1]).pathname);
try{
  for(const file of ["sitemap.xml","data/project-card-status.v1.json","scripts/sync-project-search.cjs","site-search-core.js","site-search.js","site-search.css"]){
    const out=path.join(tmp,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(path.join(root,file),out);
  }
  for(const route of routes){
    const name=route.slice(1)+"index.html",out=path.join(tmp,name);
    fs.mkdirSync(path.dirname(out),{recursive:true});
    fs.copyFileSync(path.join(root,name),out);
  }
  const run=()=>cp.execFileSync(process.execPath,[path.join(tmp,"scripts/sync-project-search.cjs")],{cwd:tmp,encoding:"utf8"});
  const first=run();
  assert.match(first,/8 public project detail pages, 24 pages linked/);
  const built=fs.readFileSync(path.join(tmp,"project-search-index.js"),"utf8");
  const globals={window:{}};
  vm.runInNewContext(built,globals,{timeout:1000});
  const projects=globals.window.KAitoProjects;
  assert.equal(projects.length,8);
  assert.equal(new Set(projects.map(p=>p.url)).size,8);
  assert.ok(projects.every(p=>p.title&&p.summary&&p.stage&&p.searchText.length>60));
  assert.ok(projects.some(p=>p.title==="WHYNOT"&&p.stage==="PROTOTYPE"));
  assert.ok(projects.some(p=>p.title.includes("駅生活圏")));
  assert.ok(!projects.some(p=>p.url.includes("/tools/")||p.url==="/projects/"));
  const main=fs.readFileSync(path.join(tmp,"index.html"),"utf8");
  assert.ok(main.indexOf("/project-search-index.js?")<main.indexOf("/app.js?"));
  assert.equal((main.match(/src="[/]site-search-core[.]js[?]v=/g)||[]).length,1);
  assert.ok(main.indexOf("/project-search-index.js?")<main.indexOf("/site-search-core.js?")&&
    main.indexOf("/site-search-core.js?")<main.indexOf("/app.js?"));
  for(const route of routes){
    const html=fs.readFileSync(path.join(tmp,route.slice(1),"index.html"),"utf8");
    assert.equal((html.match(/src="\/project-search-index\.js\?/g)||[]).length,1);
    assert.equal((html.match(/src="[/]site-search-core[.]js[?]v=/g)||[]).length,1);
    assert.ok(html.indexOf("/project-search-index.js?")<html.indexOf("/site-search-core.js?")&&
      html.indexOf("/site-search-core.js?")<html.indexOf(route==="/"?"/app.js?":"/site-search.js?"));
  }
  const second=run();
  assert.match(second,/0 HTML updates/);
  assert.equal(fs.readFileSync(path.join(tmp,"project-search-index.js"),"utf8"),built);
  // Changing the shared CSS must invalidate all public pages; a third run
  // without changes must again be a no-op.
  const firstCssHref=(fs.readFileSync(path.join(tmp,"index.html"),"utf8")
    .match(/\/site-search\.css\?v=([a-zA-Z0-9-]+)/)||[])[1];
  assert.ok(firstCssHref);
  fs.appendFileSync(path.join(tmp,"site-search.css"),"\n/* changed test fixture */\n");
  const cssChanged=run();
  assert.match(cssChanged,/24 HTML updates/);
  const nextCssHref=(fs.readFileSync(path.join(tmp,"index.html"),"utf8")
    .match(/\/site-search\.css\?v=([a-zA-Z0-9-]+)/)||[])[1];
  assert.ok(nextCssHref&&nextCssHref!==firstCssHref);
  assert.match(run(),/0 HTML updates/);
  console.log("PASS project search: 8 published projects, 24 search-enabled pages, no betas, no duplicate indexes, repeatable output");
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
