"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const dir = path.join(root, "mono-base");
const pages = ["index","about","aircraft","robotics","space","design-lab","technology","journal"];
const sitemap = fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
for (const page of pages) {
  const file = path.join(dir,page+".html");
  assert.ok(fs.existsSync(file),"Missing MONO BASE page "+page);
  const html = fs.readFileSync(file,"utf8");
  const head = html.split("</head>")[0];
  assert.match(head,/<title>[^<]+<\/title>/,"Missing title "+page);
  assert.match(head,/<meta name="description" content="[^"]+"/,"Missing description "+page);
  assert.match(head,/<meta name="robots" content="noindex,follow">/,"Concept preview must be noindex "+page);
  assert.ok(!sitemap.includes("https://k-aito.com/mono-base/"+page+".html"),"Noindex page in sitemap "+page);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref = match[1].split(/[?#]/)[0];
    if (!ref || /^(?:https?:|mailto:|tel:|data:|\/\/)/.test(ref) || ref.startsWith("#")) continue;
    const local = ref.startsWith("/") ? path.resolve(root,"."+ref) : path.resolve(dir,ref);
    assert.ok(local.startsWith(root+path.sep),"Link escapes root "+page+" "+ref);
    assert.ok(fs.existsSync(local),"Broken local link "+page+" "+ref);
  }
}
assert.ok(!sitemap.includes("https://k-aito.com/mono-base/"),"Noindex preview must not be in sitemap");
console.log("PASS: MONO BASE concept preview: 8 pages, metadata, sitemap, local links");
