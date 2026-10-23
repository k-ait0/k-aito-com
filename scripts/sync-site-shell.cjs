"use strict";
/* Canonical header/footer generator. HOME markup is the only design source.
 * Subpage search remains injected by site-search.js, not duplicated in HTML.
 * Run after publishing/sitemap updates; subsequent runs must be no-ops.
 */
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const {isMonoBaseContentRoute,readPublicSitemapUrl}=require("./public-sitemap-routes.cjs");
const home=fs.readFileSync(path.join(root,"index.html"),"utf8");
const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const urls=[...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(x=>new URL(x[1].trim()));
const header=home.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0];
const footer=home.match(/<footer\b[^>]*class="site-footer"[^>]*>[\s\S]*?<\/footer>/)?.[0];
if(!header||!footer||!header.includes('<form id="search-form"')||
  !footer.includes('class="footer-inner"'))throw Error("HOME canonical shell missing");
const links=["HOME","SHELVES","PROJECTS","ARCHIVE","ABOUT"];
const subHeader=header.replace(/<form id="search-form"[\s\S]*?<\/form>/,"");
if(subHeader===header)throw Error("HOME search form not identified");
function current(pathname){
  if(pathname==="/about/")return "ABOUT";
  if(pathname==="/archive/"||pathname.startsWith("/notes/"))return "ARCHIVE";
  if(pathname.startsWith("/projects/"))return "PROJECTS";
  if(pathname==="/storage/"||["/travel/","/drink/","/money/","/study/","/works/","/business/"].includes(pathname))return "SHELVES";
  return null;
}
function render(pathname){
  let h=subHeader.replace(/href="#home"/g,'href="/"').replace('class="current"',"");
  const active=current(pathname);
  if(active){
    const pattern=new RegExp('(<a href="[^"]+")(>)'+active+'(<\/a>)');
    if(!pattern.test(h))throw Error("Missing current nav "+active+" "+pathname);
    h=h.replace(pattern,'$1 aria-current="page"$2'+active+'$3');
  }
  const f=footer.replace('<footer id="about" class="site-footer">','<footer class="site-footer">')
    .replace(/href="#home"/g,'href="/"');
  if(!links.every(x=>h.includes(">"+x+"</a>"))||
    !["HOME","SHELVES","PROJECTS","ARCHIVE","LINKS","ABOUT"].every(x=>f.includes(">"+x+"</a>")))
    throw Error("Canonical shell nav incomplete");
  return {header:h,footer:f};
}
function sync(){
let changed=0;
for(const url of urls){
  readPublicSitemapUrl(url.href);
  if(isMonoBaseContentRoute(url.pathname))continue; // MONO BASE owns its separate dark shell
  if(url.origin!=="https://k-aito.com"||url.search||url.hash||!/^\/[a-z0-9/-]*$/.test(url.pathname))throw Error("Invalid sitemap URL "+url.href);
  if(url.pathname==="/")continue;
  const file=path.join(root,url.pathname.slice(1),"index.html");
  let src=fs.readFileSync(file,"utf8");
  if(!src.includes('site-search.js')||!src.includes('site-search.css'))throw Error("Missing shared search "+file);
  const existingHeader=src.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0];
  const existingFooter=src.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0];
  if(!existingHeader||!existingFooter)throw Error("Missing old shell "+file);
  const shell=render(url.pathname);
  src=src.replace(existingHeader,shell.header).replace(existingFooter,shell.footer);
  const previous=fs.readFileSync(file,"utf8");
  if(src!==previous){fs.writeFileSync(file,src,"utf8");changed++;console.log("UPDATED "+url.pathname);}
}
console.log("PASS canonical shell: "+urls.filter(u=>!isMonoBaseContentRoute(u.pathname)).length+" KAITO pages; "+changed+" changed");
}
if(require.main===module)sync();
module.exports={render,current,sync};
