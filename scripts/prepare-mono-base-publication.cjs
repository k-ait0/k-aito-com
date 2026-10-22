"use strict";
/* Read-only by default. This does NOT deploy or merge any PR.
 * --check: verify release readiness without changing the working tree.
 * --apply: prepare all eight content HTML files and sitemap together; gated by
 *          MONO_BASE_RELEASE_APPROVED=YES. The cad-viewer.html stays noindex.
 * The publication commit must undergo PR review, CI and live XServer QA.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const {MONO_BASE_CONTENT,publicRouteToFile}=require("./public-sitemap-routes.cjs");
const args=process.argv.slice(2);
if(args.some(a=>!["--check","--apply"].includes(a))||args.includes("--check")&&args.includes("--apply"))
  throw Error("Usage: node scripts/prepare-mono-base-publication.cjs [--check | --apply]");
const apply=args.includes("--apply");
if(apply&&process.env.MONO_BASE_RELEASE_APPROVED!=="YES")
  throw Error("Refusing publication changes: explicit release approval is required");
const robots='<meta name="robots" content="noindex,follow">';
const sitemapPath=path.join(root,"sitemap.xml");
const sitemap=fs.readFileSync(sitemapPath,"utf8");
const has=(url)=>sitemap.includes("<loc>"+url+"</loc>");
const paths=MONO_BASE_CONTENT.map(route=>({
  route,url:"https://k-aito.com"+route,file:path.join(root,publicRouteToFile(route))
}));
const staged=paths.map(({route,url,file})=>{
  const src=fs.readFileSync(file,"utf8");
  const head=src.split("</head>")[0];
  assert.ok(head.includes('rel="canonical" href="'+url+'"'),"Missing approved canonical "+route);
  assert.ok(head.includes('property="og:url" content="'+url+'"'),"Missing OG URL "+route);
  assert.ok(head.includes('property="og:image" content="https://k-aito.com/mono-base/assets/hero_final.jpg"'),"Missing sharing image "+route);
  assert.ok(head.includes('name="twitter:card" content="summary_large_image"'),"Missing social card "+route);
  assert.ok(head.includes('<meta name="description" content="'),"Missing description "+route);
  return {route,url,file,src,preview:head.includes(robots)};
});
const viewer=fs.readFileSync(path.join(root,"mono-base/cad-viewer.html"),"utf8").split("</head>")[0];
assert.ok(viewer.includes(robots),"Standalone CAD viewer must remain noindex");
assert.ok(!has("https://k-aito.com/mono-base/cad-viewer.html"),"CAD utility must not be indexed");
const existing=staged.filter(x=>has(x.url));
const allPreview=staged.every(x=>x.preview)&&existing.length===0;
const allPublic=staged.every(x=>!x.preview)&&existing.length===8;
assert.ok(allPreview||allPublic,"Mixed/partial MONO BASE indexing state — manual review required");
if(allPublic){
  console.log("PASS: MONO BASE already in public mode (8 indexed content pages, CAD viewer noindex); no files changed");
  process.exit(0);
}
assert.ok(sitemap.includes("</urlset>"),"Sitemap XML closing tag missing");
const additions=staged.map(x=>"  <url><loc>"+x.url+"</loc></url>").join("\n")+"\n";
const nextSitemap=sitemap.replace("</urlset>",additions+"</urlset>");
if(!apply){
  console.log("PASS DRY RUN: 8 content pages and sitemap can be switched together; no files changed");
  console.log("CAD utility remains noindex; final release still requires review, merge, deployment and live verification");
  process.exit(0);
}
// Preflight above verifies every source before writing anything.
for(const x of staged){
  const next=x.src.replace(robots,"");
  assert.notEqual(next,x.src,"Unexpected robots meta state "+x.route);
  fs.writeFileSync(x.file,next,"utf8");
}
fs.writeFileSync(sitemapPath,nextSitemap,"utf8");
console.log("PREPARED 8 content pages + sitemap for public review. NOT DEPLOYED. Keep viewer noindex.");
