"use strict";
/* Synchronize the public KAITO chrome from the HOME markup.
 * Scope: sitemap-listed KAITO pages only; never beta tools or MONO BASE.
 * Copies static HTML so navigation/footer exist without JavaScript.
 * The HOME search is controlled by app.js; subpage search is added by site-search.js.
 */
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const origin="https://k-aito.com";
const xml=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const routes=[...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(match=>{
  const url=new URL(match[1].trim());
  if(url.origin!==origin||!/^\/[a-z0-9/-]*$/.test(url.pathname)||url.search||url.hash)
    throw Error("Invalid sitemap URL "+url);
  return url.pathname;
});
if(routes.length===0||new Set(routes).size!==routes.length||!routes.includes("/"))
  throw Error("Invalid public route list");
const home=fs.readFileSync(path.join(root,"index.html"),"utf8");
const headerRe=/<header class="site-header">[\s\S]*?<\/header>/g;
const footerRe=/<footer\b[^>]*>[\s\S]*?<\/footer>/g;
const unique=(source,re,label)=>{
  const found=[...source.matchAll(re)];
  if(found.length!==1)throw Error("Expected one "+label+", got "+found.length);
  return found[0][0];
};
const header=unique(home,headerRe,"HOME header");
const footer=unique(home,footerRe,"HOME footer");
const nav=[["/","HOME"],["/storage/","SHELVES"],["/projects/","PROJECTS"],
  ["/archive/","ARCHIVE"],["/about/","ABOUT"]];
const activeFor=(route,current)=>{
  const currentLink=current.match(/<a href="([^"]+)" aria-current="page"/);
  if(currentLink){
    const match=nav.find(([href])=>href===currentLink[1]);
    if(match)return match[0];
  }
  if(route==="/")return "/";
  if(["/travel/","/drink/","/money/","/study/","/works/"].includes(route))return "/storage/";
  if(route==="/business/"||route.startsWith("/projects/")||route==="/notes/kidp-002-whynot/")
    return "/projects/";
  if(route==="/archive/")return "/archive/";
  if(route==="/about/")return "/about/";
  return null;
};
let changed=0;
for(const route of routes){
  const file=path.join(root,route.replace(/^\/ /,"").replace(/^\//,""),"index.html");
  const previous=fs.readFileSync(file,"utf8");
  const oldHeader=unique(previous,headerRe,route+" header");
  const oldFooter=unique(previous,footerRe,route+" footer");
  let nextHeader=header;
  let nextFooter=footer;
  if(route!=="/"){
    const active=activeFor(route,oldHeader);
    nextHeader=nextHeader.replace(/<form id="search-form"[\s\S]*?<\/form>/,"")
      .replaceAll('href="#home"','href="/"')
      .replace('href="/" class="current"','href="/"');
    if(!nextHeader.includes('<nav class="main-nav"'))throw Error("Missing canonical nav");
    if(active){
      const needle='<a href="'+active+'">';
      if(!nextHeader.includes(needle))throw Error("Missing nav link "+active);
      nextHeader=nextHeader.replace(needle,'<a href="'+active+'" aria-current="page">');
    }
    nextFooter=nextFooter.replace('<footer id="about" class="site-footer">',
      '<footer class="site-footer">').replaceAll('href="#home"','href="/"');
    if(!previous.includes("/site-search.js"))throw Error("Subpage search script missing "+route);
  }
  const next=previous.replace(oldHeader,nextHeader).replace(oldFooter,nextFooter);
  if(next!==previous){
    fs.writeFileSync(file,next,"utf8");
    console.log("UPDATED shell "+route);
    changed++;
  }
}
console.log("PASS KAITO shell: "+routes.length+" public routes, "+changed+" changed");
