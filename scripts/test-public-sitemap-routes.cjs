"use strict";
const assert = require("node:assert/strict");
const {MONO_BASE_CONTENT,isMonoBaseContentRoute,publicRouteToFile,readPublicSitemapUrl}=require("./public-sitemap-routes.cjs");
assert.equal(MONO_BASE_CONTENT.length,8);
assert.equal(publicRouteToFile("/"),"index.html");
assert.equal(publicRouteToFile("/projects/kidp/whynot/"),"projects/kidp/whynot/index.html");
assert.equal(publicRouteToFile("/mono-base/"),"mono-base/index.html");
for(const route of MONO_BASE_CONTENT){
  assert.ok(isMonoBaseContentRoute(route));
  assert.equal(readPublicSitemapUrl("https://k-aito.com"+route).file,publicRouteToFile(route));
}
for(const bad of [
  "/mono-base/cad-viewer.html","/mono-base/random.html","/mono-base/index.html",
  "/mono-base/../../secret","/mono-base//aircraft.html","/other.html",
  "/projects/../","//evil.com/","/mono-base/aircraft.html?x=1"
])assert.throws(()=>publicRouteToFile(bad));
for(const bad of [
 "http://k-aito.com/mono-base/","https://example.com/mono-base/",
 "https://k-aito.com/mono-base/aircraft.html?x=1",
 "https://k-aito.com/mono-base/aircraft.html#fragment",
 "https://k-aito.com/mono-base/%61ircraft.html"
])assert.throws(()=>readPublicSitemapUrl(bad));
console.log("PASS: KAITO directory routes and 8 exact MONO BASE .html/directory public routes");
