"use strict";
/* Regression: adding one article to the current catalogue should update the sitemap
   and both static fallback lists, with content cache invalidation and repeatable output. */
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
    "archive/index.html", "index.html", "app.js", "site-content.js",
    "notes/media-public-interest-sankei-building/index.html",
    "notes/nuclear-industrial-carrier/index.html",
    "notes/site-launch-trouble/index.html",
    "notes/kidp-002-whynot/index.html",
    "scripts/sync-published-content.cjs", "scripts/article-search-text.cjs"
  ]) copy(name);
  let index = fs.readFileSync(path.join(temp, "content-index.js"), "utf8");
  const anchor = "window.KAitoContent=Object.freeze({shelves,entries});";
  assert.ok(index.includes(anchor), "Catalogue export position changed");
  index = index.replace(anchor,
    'entries.push({id:"catalogue-regression",title:"追加記事の確認",state:"FOUND",' +
    'shelf:"sake",date:"2026.10.09",url:"/notes/catalogue-regression/",' +
    'tags:["確認"],summary:"新しい記事の表示",searchText:"本文テスト",body:[]});\n' + anchor
  );
  fs.writeFileSync(path.join(temp,"content-index.js"),index);
  fs.mkdirSync(path.join(temp,"notes/catalogue-regression"),{recursive:true});
  fs.writeFileSync(path.join(temp,"notes/catalogue-regression/index.html"),'<!doctype html><title>test</title><div class="article-copy essay-body"><p>更新された記事本文で公開検索の同期を検証するため、この記事には十分な文章を入力しています。</p></div>');
  const run=()=>cp.execFileSync(process.execPath,
    [path.join(temp,"scripts/sync-published-content.cjs")],
    {cwd:temp,encoding:"utf8"});
  // An edit to an existing published article should reindex automatically.
  const edited=path.join(temp,"notes/media-public-interest-sankei-building/index.html");
  let article=fs.readFileSync(edited,"utf8");
  article=article.replace('<div class="article-copy essay-body">','<div class="article-copy essay-body"><p>検索用本文の同期を検証する変更です。</p>');
  fs.writeFileSync(edited,article);
  const first=run();
  assert.match(first,/5 canonical articles/);
  const sitemap=fs.readFileSync(path.join(temp,"sitemap.xml"),"utf8");
  const storage=fs.readFileSync(path.join(temp,"storage/index.html"),"utf8");
  const archive=fs.readFileSync(path.join(temp,"archive/index.html"),"utf8");
  const home=fs.readFileSync(path.join(temp,"index.html"),"utf8");
  assert.match(sitemap,/https:\/\/k-aito\.com\/notes\/catalogue-regression\/<\/loc><lastmod>2026-10-09/);
  assert.match(sitemap,/https:\/\/k-aito\.com\/works\//);
  assert.equal((sitemap.match(/notes\/catalogue-regression\//g)||[]).length,1);
  assert.match(storage,/data-catalogue-count>5 NOTES/);
  assert.match(storage,/data-card-type="article"/);
  assert.match(storage,/class="card-kind">ARTICLE<\/span>/);

  assert.match(storage,/href="\/notes\/catalogue-regression\/"/);
  assert.match(archive,/data-catalogue-timeline/);
  assert.match(archive,/href="\/notes\/catalogue-regression\/"/);
  assert.match(home,/content-index\.js\?v=[a-f0-9]{12}/);
  const feature=home.split("<!-- HOME FEATURE START -->")[1]?.split("<!-- HOME FEATURE END -->")[0]||"";
  assert.ok(feature.includes('href="/notes/catalogue-regression/"'),"Newest note missing from HOME feature");
  assert.ok(feature.includes("追加記事の確認"),"Newest note title missing from HOME feature");
  assert.ok(home.includes('href="/notes/site-launch-trouble/"'),"FIRST NOTE hero should remain unchanged");

  const rebuilt=fs.readFileSync(path.join(temp,"content-index.js"),"utf8");
  assert.match(rebuilt,/BEGIN GENERATED ARTICLE SEARCH TEXT/);
  assert.ok(rebuilt.includes("更新された記事本文で公開検索の同期を検証するため"),"New article text not indexed");
  assert.ok(rebuilt.includes("検索用本文の同期"),"New changes to existing article not indexed");
  assert.match(archive,/<div class="archive-stats"><span><b>5<\/b> NOTES/);

  const second=run();
  assert.ok(!second.includes("UPDATED "), "Generator is not idempotent");
  console.log("PASS: added article -> sitemap, HTML fallbacks and cache; rerun unchanged");
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
