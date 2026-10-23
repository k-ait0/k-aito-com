"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const dir = path.join(root, "mono-base");
const pages = ["index","about","aircraft","robotics","space","design-lab","technology","journal"];
const sitemap = fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const projects=fs.readFileSync(path.join(root,"projects/index.html"),"utf8");
assert.equal((projects.match(/href="\/mono-base\/"/g)||[]).length,1,
  "KAITO PROJECTS must provide one discoverable MONO BASE link");
const releaseMode = sitemap.includes("<loc>https://k-aito.com/mono-base/</loc>");
const homePreview=fs.readFileSync(path.join(dir,"index.html"),"utf8");
assert.ok(homePreview.includes('href="design-lab.html">OPEN 3D VIEWER'),
  "Homepage must link to the available interactive 3D exhibit");
assert.ok(!homePreview.includes("3D INTERACTION IN DEVELOPMENT"),
  "Homepage must not describe an implemented 3D viewer as future work");

for (const page of pages) {
  const file = path.join(dir,page+".html");
  assert.ok(fs.existsSync(file),"Missing MONO BASE page "+page);
  const html = fs.readFileSync(file,"utf8");
  const head = html.split("</head>")[0];
  assert.match(head,/<title>[^<]+<\/title>/,"Missing title "+page);
  assert.match(head,/<meta name="description" content="[^"]+"/,"Missing description "+page);
  const noindex=/<meta\s+name="robots"\s+content="[^"]*\bnoindex\b/i.test(head);
  assert.equal(noindex,!releaseMode, "Indexing state mismatch "+page);
  const canonical = page === "index" ? "https://k-aito.com/mono-base/" : "https://k-aito.com/mono-base/"+page+".html";
  assert.ok(head.includes('rel="canonical" href="'+canonical+'"'),"Missing canonical "+page);
  assert.ok(head.includes('property="og:url" content="'+canonical+'"'),"Missing OG URL "+page);
  assert.ok(head.includes('property="og:image" content="https://k-aito.com/mono-base/assets/hero_final.jpg"'),"Missing branded OG image "+page);
  assert.ok(head.includes('name="twitter:card" content="summary_large_image"'),"Missing Twitter card "+page);
  assert.equal(sitemap.includes("<loc>"+canonical+"</loc>"),releaseMode,"Sitemap/indexing mismatch "+page);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref = match[1].split(/[?#]/)[0];
    if (!ref || /^(?:https?:|mailto:|tel:|data:|\/\/)/.test(ref) || ref.startsWith("#")) continue;
    const local = ref.startsWith("/") ? path.resolve(root,"."+ref) : path.resolve(dir,ref);
    assert.ok(local === root || local.startsWith(root+path.sep),"Link escapes root "+page+" "+ref);
    const target = ref.endsWith("/") ? path.join(local,"index.html") : local;
    assert.ok(fs.existsSync(target),"Broken local link "+page+" "+ref);
  }
}
const viewer = fs.readFileSync(path.join(dir,"cad-viewer.html"),"utf8");
const viewerHead=viewer.split("</head>")[0];
assert.match(viewerHead,/<meta name="robots" content="noindex,follow">/,"Standalone CAD viewer must remain noindex");
assert.ok(!sitemap.includes("https://k-aito.com/mono-base/cad-viewer.html"),"CAD utility must not be in sitemap");
if(!releaseMode) assert.ok(!sitemap.includes("https://k-aito.com/mono-base/"),"Preview URLs cannot be in sitemap");
console.log("PASS: MONO BASE "+(releaseMode?"public":"preview")+" mode: 8 pages, metadata, indexing, sitemap, local links");
