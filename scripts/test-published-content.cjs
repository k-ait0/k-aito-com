"use strict";
/* Regression: a third article should appear in the sitemap and both static
   fallback lists, with content cache invalidation and repeatable output. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const cp = require("node:child_process");
const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kaito-index-test-"));
function copy(relative) {
  const target = path.join(temp, relative);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(path.join(root, relative), target);
  return target;
}
try {
  for(const name of [
    "content-index.js", "sitemap.xml", "storage/index.html",
    "archive/index.html", "index.html",
    "notes/nuclear-industrial-carrier/index.html",
    "notes/site-launch-trouble/index.html",
    "scripts/sync-published-content.cjs"
  ]) copy(name);
  let index = fs.readFileSync(path.join(temp, "content-index.js"), "utf8");
  const anchor = "window.KAitoContent=Object.freeze({shelves,entries});";
  assert.ok(index.includes(anchor), "Catalogue export position changed");
  index = index.replace(anchor,
    'entries.push({id:"catalogue-regression",title:"追加記事の確認",state:"FOUND",' +
    'shelf:"sake",date:"2026.09.24",url:"/notes/catalogue-regression/",' +
    'tags:["確認"],summary:"新しい記事の表示",searchText:"本文テスト",body:[]});\n' + anchor
  );
  fs.writeFileSync(path.join(temp,"content-index.js"),index);
  fs.mkdirSync(path.join(temp,"notes/catalogue-regression"),{recursive:true});
  fs.writeFileSync(path.join(temp,"notes/catalogue-regression/index.html"),"<!doctype html><title>test</title>");
  const run=()=>cp.execFileSync(process.execPath,
    [path.join(temp,"scripts/sync-published-content.cjs")],
    {cwd:temp,encoding:"utf8"});
  const first=run();
  assert.match(first,/3 canonical articles/);
  const sitemap=fs.readFileSync(path.join(temp,"sitemap.xml"),"utf8");
  const storage=fs.readFileSync(path.join(temp,"storage/index.html"),"utf8");
  const archive=fs.readFileSync(path.join(temp,"archive/index.html"),"utf8");
  const home=fs.readFileSync(path.join(temp,"index.html"),"utf8");
  assert.match(sitemap,/https:\/\/k-aito\.com\/notes\/catalogue-regression\/<\/loc><lastmod>2026-09-24/);
  assert.match(sitemap,/https:\/\/k-aito\.com\/works\//);
  assert.equal((sitemap.match(/notes\/catalogue-regression\//g)||[]).length,1);
  assert.match(storage,/data-catalogue-count>3 NOTES/);
  assert.match(storage,/href="\/notes\/catalogue-regression\/"/);
  assert.match(archive,/data-catalogue-timeline/);
  assert.match(archive,/href="\/notes\/catalogue-regression\/"/);
  assert.match(home,/content-index\.js\?v=[a-f0-9]{12}/);
  const second=run();
  assert.ok(!second.includes("UPDATED "), "Generator is not idempotent");
  console.log("PASS: third article -> sitemap, HTML fallbacks and cache; rerun unchanged");
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
