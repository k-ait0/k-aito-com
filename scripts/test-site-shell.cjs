"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const {isMonoBaseContentRoute}=require("./public-sitemap-routes.cjs");
const home=fs.readFileSync(path.join(root,"index.html"),"utf8");
const {render}=require("./sync-site-shell.cjs");
const paths=[...fs.readFileSync(path.join(root,"sitemap.xml"),"utf8")
 .matchAll(/<loc>https:\/\/k-aito\.com(\/[^<]*)<\/loc>/g)].map(m=>m[1]).filter(route=>!isMonoBaseContentRoute(route));
assert.ok(paths.length>=24,"Unexpected loss of published pages");
const homeHeader=home.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0];
const homeFooter=home.match(/<footer\b[^>]*class="site-footer"[^>]*>[\s\S]*?<\/footer>/)?.[0];
assert.ok(homeHeader&&homeFooter,"Missing canonical homepage shell");
for(const route of paths){
 const src=fs.readFileSync(path.join(root,route.slice(1),"index.html"),"utf8");
 const headers=[...src.matchAll(/<header class="site-header">[\s\S]*?<\/header>/g)];
 const footers=[...src.matchAll(/<footer\b[^>]*>[\s\S]*?<\/footer>/g)];
 assert.equal(headers.length,1,"Header count "+route);
 assert.equal(footers.length,1,"Footer count "+route);
 assert.match(footers[0][0],/class="site-footer"/,"Footer design not unified "+route);
 assert.doesNotMatch(src,/class="page-footer"/,"Legacy footer "+route);
 if(route==="/"){
  assert.equal(headers[0][0],homeHeader);
  assert.equal(footers[0][0],homeFooter);
 }else{
  const shell=render(route);
  assert.equal(headers[0][0],shell.header,"Header out of sync "+route);
  assert.equal(footers[0][0],shell.footer,"Footer out of sync "+route);
  assert.match(src,/site-search\.js/,"Subpage search missing "+route);
 }
}
const white=fs.readFileSync(path.join(root,"white-surfaces-v1.css"),"utf8");
assert.doesNotMatch(white,/\.site-footer[^\n]*background-color:#fff!important/,
  "White reading-paper styles must not make global footer white");
const shelves=fs.readFileSync(path.join(root,"storage/index.html"),"utf8");
assert.equal((shelves.match(/class="storage-shelf"/g)||[]).length,7);
console.log("PASS "+paths.length+" canonical site shells, search references and 7 shelf cards");
