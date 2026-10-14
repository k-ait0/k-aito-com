"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const get=file=>fs.readFileSync(path.join(root,file),"utf8");
const routes=[...get("sitemap.xml").matchAll(/<loc>https:\/\/k-aito\.com([^<]+)<\/loc>/g)].map(m=>m[1]);
const home=get("index.html");
const hdr=home.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0];
const footer=home.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0];
assert.ok(hdr&&footer&&footer.includes('class="site-footer"'));
assert.equal((home.match(/<footer\b/g)||[]).length,1);
for(const route of routes){
  const page=get(route.slice(1)+"index.html");
  const actualHeader=page.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0];
  const actualFooter=page.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0];
  assert.ok(actualHeader&&actualFooter,"Missing public chrome "+route);
  assert.equal((page.match(/<header class="site-header">/g)||[]).length,1,"Duplicated header "+route);
  assert.equal((page.match(/<footer\b/g)||[]).length,1,"Duplicated footer "+route);
  assert.ok(actualFooter.includes('class="site-footer"'),"Legacy footer "+route);
  assert.ok(actualHeader.includes('class="main-nav"'),"Missing main navigation "+route);
  for(const link of ["/storage/","/projects/","/archive/","/about/"])
    assert.ok(actualHeader.includes('href="'+link+'"'),"Missing "+link+" on "+route);
  if(route!=="/"){
    assert.equal(actualFooter,
      footer.replace('<footer id="about" class="site-footer">','<footer class="site-footer">')
        .replaceAll('href="#home"','href="/"'),"Footer differs from HOME "+route);
    assert.ok(!actualHeader.includes('id="search-form"'),"Duplicate HOME search "+route);
    assert.ok(page.includes("/site-search.js"),"Missing subpage search "+route);
  }else{
    assert.equal(actualHeader,hdr,"HOME source unexpectedly changed");
    assert.equal(actualFooter,footer,"HOME source unexpectedly changed");
    assert.ok(actualHeader.includes('id="search-form"'),"HOME search missing");
  }
}
const storage=get("storage/index.html");
assert.equal((storage.match(/<a class="storage-shelf"/g)||[]).length,7);
assert.equal((storage.match(/<div class="storage-shelf-copy"/g)||[]).length,7);
assert.equal((storage.match(/<div class="storage-shelf-bottom"/g)||[]).length,7);
for(const path of ["storage-v2.css","subpages.css","white-surfaces-v1.css"]){
  const css=get(path);
  assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,"CSS brace balance "+path);
}
assert.ok(get("scripts/sync-white-surfaces.cjs").includes("Preserve a page's explicit cache version"),
  "PR #34 CSS-version protection missing");
console.log("PASS "+routes.length+" public headers and footers, 7 shelf cards, PR #34 guard");
