"use strict";
/* Sync canonical article URLs, no-JS recent/archive lists and cache keys.
 * Run: node scripts/sync-published-content.cjs
 * Only catalogue entries with an existing /notes/<slug>/index.html are published.
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "content-index.js"), "utf8");
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
const escapeHtml = value => String(value || "").replace(/[&<>"']/g, ch => (
  {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[ch]
));
const count = n => n + " NOTE" + (n === 1 ? "" : "S");
const noteCard = note =>
  '<a class="note-link" href="' + escapeHtml(note.url) + '"><div class="note-meta"><span>' +
  escapeHtml(note.state) + '</span><time datetime="' + note.date.replaceAll(".", "-") + '">' +
  escapeHtml(note.date) + '</time></div><h3>' + escapeHtml(note.title) +
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
writeIfChanged(archivePath, archive);

/* Cache bust the shared catalogue in every HTML page on catalogue changes. */
const catalogueVersion = crypto.createHash("sha256").update(source).digest("hex").slice(0, 12);
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
  if (entry.isDirectory()) {
    if (entry.name === ".git" || entry.name === "node_modules") return [];
    return walk(path.join(dir, entry.name));
  }
  return entry.isFile() && entry.name.endsWith(".html") ? [path.join(dir, entry.name)] : [];
});
for (const htmlPath of walk(root)) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const updated = html.replace(/\/content-index\.js\?v=[a-zA-Z0-9]+/g,
    "/content-index.js?v=" + catalogueVersion);
  if (updated !== html) writeIfChanged(htmlPath, updated);
}
console.log("OK: " + notes.length + " canonical articles; index " + catalogueVersion);
