"use strict";
/* Exact allowlist for MONO BASE public content pages.
 * The embedded cad-viewer.html remains a noindex utility, never a sitemap URL.
 * Existing KAITO content keeps its /directory/ URL convention.
 */
const MONO_BASE_CONTENT = Object.freeze([
  "/mono-base/",
  "/mono-base/about.html",
  "/mono-base/aircraft.html",
  "/mono-base/robotics.html",
  "/mono-base/space.html",
  "/mono-base/design-lab.html",
  "/mono-base/technology.html",
  "/mono-base/journal.html"
]);
const set = new Set(MONO_BASE_CONTENT);
function isMonoBaseContentRoute(p) { return set.has(p); }
function isKaitoDirectoryRoute(p) { return /^\/(?:[a-z0-9-]+\/)*$/.test(p); }
function publicRouteToFile(p) {
  if (isMonoBaseContentRoute(p) && p.endsWith(".html")) return p.slice(1);
  if (isKaitoDirectoryRoute(p)) return p.slice(1) + "index.html";
  throw new Error("Unsupported public sitemap pathname: " + p);
}
function readPublicSitemapUrl(value, origin = "https://k-aito.com") {
  const u = new URL(value);
  if (u.origin !== origin || u.search || u.hash || u.href !== origin + u.pathname) {
    throw new Error("Unexpected public sitemap URL: " + value);
  }
  return { pathname: u.pathname, file: publicRouteToFile(u.pathname) };
}
module.exports = { MONO_BASE_CONTENT, isMonoBaseContentRoute, isKaitoDirectoryRoute, publicRouteToFile, readPublicSitemapUrl };
