"use strict";
/* Read-only prepublication regression: simulate adding all eight MONO BASE
 * entries to the sitemap without writing any file or enabling indexing.
 * Verify the existing KAITO generators ignore the distinct design/URL scope.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const {MONO_BASE_CONTENT,isMonoBaseContentRoute,readPublicSitemapUrl}=require("./public-sitemap-routes.cjs");
const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const existing=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.ok(existing.length>=24);
assert.equal(new Set(existing).size,existing.length,"Duplicated existing public URL");
const simulated=[...new Set([...existing,...MONO_BASE_CONTENT.map(r=>"https://k-aito.com"+r)])];
assert.equal(new Set(simulated).size,simulated.length,"Duplicated public URL");
const selected=simulated.map(u=>readPublicSitemapUrl(u).pathname);
assert.equal(selected.filter(isMonoBaseContentRoute).length,8);
assert.equal(selected.filter(r=>!isMonoBaseContentRoute(r)).length,
  existing.filter(u=>!isMonoBaseContentRoute(readPublicSitemapUrl(u).pathname)).length);
assert.ok(!selected.includes("/mono-base/cad-viewer.html"));
for(const route of MONO_BASE_CONTENT){
  const file=route==="/mono-base/"?"mono-base/index.html":route.slice(1);
  const src=fs.readFileSync(path.join(root,file),"utf8");
  const head=src.split("</head>")[0];
  assert.ok(head.includes('<meta name="robots" content="noindex,follow">') ||
    !head.includes("noindex"),"Invalid robots syntax "+route);
  assert.ok(!head.includes("/white-surfaces-v1.css"),"KAITO reading-paper CSS leaked into MONO BASE "+route);
  assert.ok(head.includes('rel="canonical" href="https://k-aito.com'+route+'"'),"Missing canonical "+route);
}
const sources={
  "sync-site-shell.cjs":["isMonoBaseContentRoute(url.pathname)","readPublicSitemapUrl(url.href)"],
  "sync-site-breadcrumbs.cjs":[".filter(route=>!isMonoBaseContentRoute(route))"],
  "sync-white-surfaces.cjs":[".filter(u=>!isMonoBaseContentRoute(u.pathname))"],
  "sync-project-search.cjs":[".filter(route=>!isMonoBaseContentRoute(route))"],
  "test-site-shell.cjs":[".filter(route=>!isMonoBaseContentRoute(route))"],
  "test-site-breadcrumbs.cjs":[".filter(route=>!isMonoBaseContentRoute(route))"],
  "test-project-search.cjs":[".filter(route=>!isMonoBaseContentRoute(route))"],
  "test-site-search-ui.cjs":[".filter(route=>!isMonoBaseContentRoute(route))"]
};
for(const [file,needles] of Object.entries(sources)){
  const text=fs.readFileSync(path.join(root,"scripts",file),"utf8");
  for(const needle of needles)assert.ok(text.includes(needle),"Generator isolation missing: "+file+" "+needle);
}
console.log("PASS: simulated MONO BASE publication retains 8 dark-site URLs and isolates 8 KAITO generator/test scripts; no files changed");
