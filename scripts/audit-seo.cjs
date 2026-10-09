"use strict";
/* Read-only SEO audit for every URL in sitemap.xml.
 * Usage: node scripts/audit-seo.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const failures = [];
const warnings = [];
if (!urls.length) failures.push("sitemap.xml: no URLs found");
const seen = new Set();
for (const url of urls) {
  let pathname;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== "https://k-aito.com") throw new Error("unexpected origin");
    pathname = decodeURIComponent(parsed.pathname);
  } catch (e) {
    failures.push(url + ": invalid URL (" + e.message + ")");
    continue;
  }
  if (seen.has(pathname)) failures.push(pathname + ": duplicate sitemap URL");
  seen.add(pathname);
  if (!pathname.startsWith("/") || pathname.includes("..") || !pathname.endsWith("/")) {
    failures.push(pathname + ": unsafe or noncanonical path");
    continue;
  }
  const file = path.join(root, pathname.slice(1), "index.html");
  if (!fs.existsSync(file)) {
    failures.push(pathname + ": missing index.html");
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  const head = (html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i) || [,""])[1];
  const title = (head.match(/<title>([\s\S]*?)<\/title>/i) || [,""])[1].trim();
  if (!title) failures.push(pathname + ": missing title");
  if (!/<meta\s+name="description"\s+content="[^"]+"/i.test(head)) failures.push(pathname + ": missing meta description");
  const canonical = (head.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i) || [,""])[1];
  if (canonical !== url) failures.push(pathname + ": canonical mismatch (" + canonical + ")");
  if (!/<meta\s+property="og:title"/i.test(head)) warnings.push(pathname + ": missing og:title");
  if (!/<meta\s+property="og:description"/i.test(head)) warnings.push(pathname + ": missing og:description");
  if (!/<meta\s+property="og:image"/i.test(head)) warnings.push(pathname + ": missing og:image");
  if (!/<h1\b/i.test(html)) warnings.push(pathname + ": missing h1");
  const ldScripts = [...head.matchAll(new RegExp("<script\\b[^>]*type=[\\\"\']application/ld\\+json[\\\"\'][^>]*>([\\s\\S]*?)</script>", "gi"))];
  if (!ldScripts.length) warnings.push(pathname + ": no JSON-LD structured data");
  for (const match of ldScripts) {
    try {
      const data = JSON.parse(match[1]);
      const nodes = Array.isArray(data) ? data : (Array.isArray(data["@graph"]) ? data["@graph"] : [data]);
      if (!nodes.some(node => node && node["@context"] && node["@type"])) {
        failures.push(pathname + ": JSON-LD missing @context or @type");
      }
      if (pathname.startsWith("/notes/") && !nodes.some(node => {
        const types = node && node["@type"];
        return (Array.isArray(types) ? types : [types]).some(t => ["Article", "BlogPosting", "NewsArticle"].includes(t));
      })) warnings.push(pathname + ": article page lacks Article JSON-LD");
    } catch (e) {
      failures.push(pathname + ": malformed JSON-LD (" + e.message + ")");
    }
  }
  if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(head)) failures.push(pathname + ": noindex page included in sitemap");
}
const robots = path.join(root, "robots.txt");
if (!fs.existsSync(robots) || !fs.readFileSync(robots, "utf8").includes("Sitemap: https://k-aito.com/sitemap.xml")) {
  failures.push("robots.txt: missing sitemap directive");
}
console.log("SEO audit: " + urls.length + " URLs; " + failures.length + " errors; " + warnings.length + " warnings");
for (const item of failures) console.error("ERROR " + item);
for (const item of warnings) console.warn("WARN " + item);
if (failures.length) process.exitCode = 1;
