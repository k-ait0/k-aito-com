"use strict";
/*
 * Safe release-mode integration test. ONLY a disposable OS temp directory is
 * changed; checked-out files, GitHub and XServer are never modified.
 * The explicit approval flag applies to that temporary fixture only.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const cp=require("node:child_process");
const root=path.resolve(__dirname,"..");
const {MONO_BASE_CONTENT,readPublicSitemapUrl}=require("./public-sitemap-routes.cjs");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mono-base-publication-"));
const copy=(relative)=>{
  const source=path.join(root,relative),destination=path.join(tmp,relative);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.cpSync(source,destination,{recursive:true});
};
const run=(name,args=[],env={})=>cp.execFileSync(process.execPath,
  [path.join(tmp,"scripts",name),...args],
  {cwd:tmp,encoding:"utf8",timeout:90000,maxBuffer:8*1024*1024,
   env:{...process.env,...env}});
const sha=(file)=>require("node:crypto").createHash("sha256")
  .update(fs.readFileSync(path.join(tmp,file))).digest("hex");
try{
  const xml=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
  const originalUrls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  assert.ok(originalUrls.length>=24,"Missing KAITO public pages");
  const routes=originalUrls.map(value=>readPublicSitemapUrl(value));
  assert.ok(routes.every(x=>!MONO_BASE_CONTENT.includes(x.pathname)),
    "This fixture expects MONO BASE to remain in preview mode");
  for(const {file} of routes)copy(file);
  copy("sitemap.xml");
  copy("mono-base");
  for(const rel of [
    "data/site-breadcrumbs.v1.json","data/project-card-status.v1.json",
    "site-search-core.js","site-search.js","site-search.css",
    "white-surfaces-v1.css",
    "scripts/public-sitemap-routes.cjs",
    "scripts/prepare-mono-base-publication.cjs",
    "scripts/sync-site-shell.cjs","scripts/sync-site-breadcrumbs.cjs",
    "scripts/sync-white-surfaces.cjs","scripts/sync-project-search.cjs",
    "scripts/test-site-shell.cjs","scripts/test-site-breadcrumbs.cjs",
    "scripts/test-mono-base-preview.cjs"
  ])copy(rel);
  const expected=MONO_BASE_CONTENT.map(route=>route==="/mono-base/"?
    "mono-base/index.html":route.slice(1));
  const before=expected.map(sha);
  assert.match(run("prepare-mono-base-publication.cjs",["--check"]),
    /PASS DRY RUN/);
  assert.deepEqual(expected.map(sha),before,
    "Read-only release check changed fixture files");
  // Applies ONLY to the isolated temporary tree.
  assert.match(run("prepare-mono-base-publication.cjs",["--apply"],
    {MONO_BASE_RELEASE_APPROVED:"YES"}),/PREPARED 8 content pages/);
  const publicXml=fs.readFileSync(path.join(tmp,"sitemap.xml"),"utf8");
  assert.equal([...publicXml.matchAll(/<loc>/g)].length,originalUrls.length+8,
    "Publication sitemap must add exactly eight URLs");
  const ready=expected.map(sha);
  for(let i=0;i<MONO_BASE_CONTENT.length;i++){
    const route=MONO_BASE_CONTENT[i];
    const html=fs.readFileSync(path.join(tmp,expected[i]),"utf8");
    assert.ok(!html.split("</head>")[0].includes('content="noindex,follow"'),
      "Released content must be indexable "+route);
    assert.ok(publicXml.includes("<loc>https://k-aito.com"+route+"</loc>"),
      "Released content must be indexed in sitemap "+route);
  }
  const viewerFile="mono-base/cad-viewer.html",viewerHash=sha(viewerFile);
  assert.match(run("prepare-mono-base-publication.cjs",["--check"]),
    /already in public mode/);
  assert.match(run("sync-site-shell.cjs"),/PASS canonical shell/);
  assert.match(run("sync-site-breadcrumbs.cjs"),/PASS canonical breadcrumbs/);
  assert.match(run("sync-white-surfaces.cjs"),/PASS white surface links/);
  assert.match(run("sync-project-search.cjs"),/PASS project search index/);
  assert.deepEqual(expected.map(sha),ready,
    "KAITO generator illegally changed one of eight MONO BASE dark-site pages");
  assert.equal(sha(viewerFile),viewerHash,"Generator touched noindex CAD utility");
  assert.match(run("test-site-shell.cjs"),/PASS/);
  assert.match(run("test-site-breadcrumbs.cjs"),/PASS/);
  assert.match(run("test-mono-base-preview.cjs"),/PASS: MONO BASE public mode/);
  console.log("PASS: real public-mode switch + four KAITO generators + shell/breadcrumb/MONO regression in isolated temp tree; original files untouched");
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
