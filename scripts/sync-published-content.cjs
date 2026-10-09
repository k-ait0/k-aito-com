"use strict";
/* Sync canonical article URLs, no-JS recent/archive lists and cache keys.
 * Run: node scripts/sync-published-content.cjs
 * Only catalogue entries with an existing /notes/<slug>/index.html are published.
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const {articleText,injectIndex} = require("./article-search-text.cjs");
const root = path.resolve(__dirname, "..");
const contentIndexPath = path.join(root, "content-index.js");
let source = fs.readFileSync(contentIndexPath, "utf8");
const sandbox = {window: {}};
vm.runInNewContext(source, sandbox, {filename: "content-index.js", timeout: 3000});
const catalogue = sandbox.window.KAitoContent;
if (!catalogue || !Array.isArray(catalogue.entries) || !Array.isArray(catalogue.shelves)) {
  throw new Error("content-index.js did not export the expected catalogue");
}
const shelfIds = new Set(catalogue.shelves.map(s => s.id));
const ids = new Set();
const urls = new Set();
const notes = [];
for (const item of catalogue.entries) {
  if (!item.url) continue;
  if (!/^\/notes\/[a-z0-9-]+\/$/.test(item.url)) throw new Error("Invalid published note URL: " + item.url);
  if (ids.has(item.id) || urls.has(item.url)) throw new Error("Duplicate published note: " + item.id);
  if (item.url !== "/notes/" + item.id + "/") throw new Error("Article ID and URL differ: " + item.id);
  if (!shelfIds.has(item.shelf)) throw new Error("Unknown shelf for " + item.id);
  if (!/^\d{4}\.\d{2}\.\d{2}$/.test(item.date || "")) throw new Error("Invalid date for " + item.id);
  const iso = item.date.replaceAll(".", "-");
  if (Number.isNaN(Date.parse(iso)) || new Date(iso + "T00:00:00Z").toISOString().slice(0, 10) !== iso) {
    throw new Error("Invalid calendar date for " + item.id);
  }
  const article = path.join(root, item.url.slice(1), "index.html");
  if (!fs.existsSync(article)) throw new Error("Published article is missing: " + article);
  if (!item.title || !item.summary || !Array.isArray(item.tags)) throw new Error("Incomplete metadata: " + item.id);
  ids.add(item.id);
  urls.add(item.url);
  notes.push(item);
}
notes.sort((a, b) => b.date.localeCompare(a.date));
/* Article HTML is the only text source: reindex after each article edit. */
const nextSource = injectIndex(source,notes.map(note=>{
  const file=path.join(root,note.url.slice(1),"index.html");
  return {id:note.id,text:articleText(fs.readFileSync(file,"utf8"),note.id)};
}));
if(nextSource!==source){
  fs.writeFileSync(contentIndexPath,nextSource,"utf8");
  console.log("UPDATED content-index.js (generated article search text)");
  source=nextSource;
}

const escapeHtml = value => String(value || "").replace(/[&<>"']/g, ch => (
  {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[ch]
));
const count = n => n + " NOTE" + (n === 1 ? "" : "S");
const noteCard = note =>
  '<a class="note-link" data-card-type="article" href="' + escapeHtml(note.url) + '"><div class="note-meta"><span>' +
  escapeHtml(note.state) + '</span><time datetime="' + note.date.replaceAll(".", "-") + '">' +
  escapeHtml(note.date) + '</time><span class="card-kind">ARTICLE</span></div><h3>' + escapeHtml(note.title) +
  '</h3><p>' + escapeHtml(note.summary) + '</p><small>' +
  note.tags.map(t => "#" + escapeHtml(t)).join(" ") + "</small></a>";
const writeIfChanged = (file, result) => {
  const previous = fs.readFileSync(file, "utf8");
  if (previous !== result) {
    fs.writeFileSync(file, result, "utf8");
    console.log("UPDATED " + path.relative(root, file));
  }
};
const sitemapPath = path.join(root, "sitemap.xml");
const existing = fs.readFileSync(sitemapPath, "utf8");
const staticUrls = [...existing.matchAll(/<url>[\s\S]*?<\/url>/g)].map(m => m[0].trim())
  .filter(block => !/<loc>\s*https:\/\/k-aito\.com\/notes\//.test(block));
const noteUrls = notes.map(note => "<url><loc>https://k-aito.com" + escapeHtml(note.url) +
  "</loc><lastmod>" + note.date.replaceAll(".", "-") + "</lastmod></url>");
writeIfChanged(sitemapPath, '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  [...staticUrls, ...noteUrls].map(line => "  " + line).join("\n") +
  "\n</urlset>\n");

/* Keep existing HTML meaningful with JavaScript disabled. Dynamic renderers
   replace these sections when JS is enabled; guard their exact boundaries. */
/* Keep the featured HOME note current even if JavaScript is disabled.
   FIRST NOTE in the hero is intentional and is not replaced by this feature. */
const homePath=path.join(root,"index.html");
let home=fs.readFileSync(homePath,"utf8");
const featureBegin="<!-- HOME FEATURE START -->";
const featureEnd="<!-- HOME FEATURE END -->";
const fi=home.indexOf(featureBegin),fj=home.indexOf(featureEnd);
if(fi<0||fj<=fi)throw new Error("HOME feature markers missing or reversed");
const current=notes[0];
const featured=current
 ? '<a class="home-feature-note" href="'+escapeHtml(current.url)+'"><span class="home-feature-copy">'+
   '<span class="home-feature-meta"><span class="home-feature-label">'+
   escapeHtml(current.state)+' / NEW IN STORAGE</span><time datetime="'+current.date.replaceAll(".","-")+'">'+
   escapeHtml(current.date)+'</time></span><strong class="home-feature-title">'+
   escapeHtml(current.title)+'</strong><span class="home-feature-summary">'+
   escapeHtml(current.summary)+'</span></span><span class="home-feature-action">READ NOTE <b aria-hidden="true">→</b></span></a>'
 : '<p class="home-feature-empty">公開記事は準備中です。<a href="/projects/">プロジェクトを見る →</a></p>';
home=home.slice(0,fi+featureBegin.length)+"\n"+featured+"\n"+home.slice(fj);
writeIfChanged(homePath,home);

const storagePath = path.join(root, "storage", "index.html");
let storage = fs.readFileSync(storagePath, "utf8");
const recentStart = '<div class="notes-grid" data-catalogue-recent>';
const recentEnd = '</div></section><section class="related-band">';
const a = storage.indexOf(recentStart), b = storage.indexOf(recentEnd, a + recentStart.length);
if (a < 0 || b < 0) throw new Error("Storage fallback markup has changed");
storage = storage.slice(0, a + recentStart.length) + notes.slice(0, 6).map(noteCard).join("") +
  storage.slice(b);
storage = storage.replace(/(<span data-catalogue-count>)[^<]*(<\/span>)/,
  (_, start, end) => start + count(notes.length) + end);
writeIfChanged(storagePath, storage);

const archivePath = path.join(root, "archive", "index.html");
let archive = fs.readFileSync(archivePath, "utf8");
const timelineStart = '<section class="archive-timeline"';
const timelineEnd = '</section><section class="related-band">';
const c = archive.indexOf(timelineStart), d = archive.indexOf(timelineEnd, c);
if (c < 0 || d < 0) throw new Error("Archive fallback markup has changed");
const firstMonth = notes[0] ? notes[0].date.slice(0, 7).replace(".", "-") : "empty";
let timeline = "";
let year = "", date = "", dayNotes = [];
const flushDay = () => {
  if (!dayNotes.length) return;
  const n = dayNotes[0];
  timeline += '<section class="archive-period"><header><time datetime="' +
    n.date.replaceAll(".", "-") + '">' + n.date + '</time><span>' +
    count(dayNotes.length) + '</span></header><div class="notes-grid">' +
    dayNotes.map(noteCard).join("") + "</div></section>";
  dayNotes = [];
};
for (const note of notes) {
  if (note.date !== date) {flushDay();date = note.date;}
  const noteYear = note.date.slice(0, 4);
  if (noteYear !== year) {year = noteYear;timeline += '<h2 class="archive-year">' + year + "</h2>";}
  dayNotes.push(note);
}
flushDay();
if (!notes.length) timeline = '<p class="shelf-empty">公開済みの記事はまだありません。</p>';
archive = archive.slice(0, c) + '<section class="archive-timeline" id="archive-' +
  firstMonth + '" data-catalogue-timeline>' + timeline + archive.slice(d);
if (notes.length) {
  archive = archive.replace(/(<a href="#archive-)[^"]+(">)\s*[A-Z]{3}\s*<span>[^<]*<\/span>/,
    (_, begin, end) => begin + firstMonth + end +
      ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]
        [Number(notes[0].date.slice(5,7)) - 1] +
      " <span>" + count(notes.filter(n => n.date.slice(0,7) === notes[0].date.slice(0,7)).length) + "</span>");
}
// Keep the no-JavaScript archive summary consistent with generated cards.
const latestMonthLabel=notes[0]
  ? ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][Number(notes[0].date.slice(5,7))-1]
  : "—";
const summaryMarkup='<div class="archive-stats"><span><b>'+notes.length+'</b> NOTES</span>'+
  '<span><b>'+new Set(notes.map(note=>note.state)).size+'</b> TYPES</span>'+
  '<span><b>'+latestMonthLabel+'</b> LATEST</span></div>';
if(!/<div class="archive-stats">[\s\S]*?<\/div>/.test(archive))throw new Error("Archive stats markup has changed");
archive=archive.replace(/<div class="archive-stats">[\s\S]*?<\/div>/,summaryMarkup);
writeIfChanged(archivePath, archive);

/* Cache bust the shared catalogue in every HTML page on catalogue changes. */
const catalogueVersion = crypto.createHash("sha256").update(source).digest("hex").slice(0, 12);
const frontendVersions=["app.js","site-content.js"].map(file=>({
  file,version:crypto.createHash("sha256").update(fs.readFileSync(path.join(root,file))).digest("hex").slice(0,12)
}));

const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
  if (entry.isDirectory()) {
    if (entry.name === ".git" || entry.name === "node_modules") return [];
    return walk(path.join(dir, entry.name));
  }
  return entry.isFile() && entry.name.endsWith(".html") ? [path.join(dir, entry.name)] : [];
});
for (const htmlPath of walk(root)) {
  const html = fs.readFileSync(htmlPath, "utf8");
  let updated = html.replace(/\/content-index\.js\?v=[a-zA-Z0-9]+/g,
    "/content-index.js?v=" + catalogueVersion);
  for(const asset of frontendVersions){
    updated=updated.replace(new RegExp("/"+asset.file.replace(".","\\.")+"\\?v=[a-zA-Z0-9]+","g"),
      "/"+asset.file+"?v="+asset.version);
  }
  if (updated !== html) writeIfChanged(htmlPath, updated);
}
console.log("OK: " + notes.length + " canonical articles; index " + catalogueVersion);
