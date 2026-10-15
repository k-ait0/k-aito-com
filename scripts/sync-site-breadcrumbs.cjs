"use strict";
/* Canonical KAITO breadcrumb generator. Read-only imports for regression tests.
 * Source labels/parents are data/site-breadcrumbs.v1.json; sitemap is public scope.
 * MONO BASE, noindex betas, and article body markup are outside this generator.
 */
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const master=JSON.parse(fs.readFileSync(path.join(root,"data/site-breadcrumbs.v1.json"),"utf8"));
const publicOrigin="https://k-aito.com";
const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const routes=[...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>{
  const u=new URL(m[1].trim());
  if(u.origin!==publicOrigin||u.search||u.hash)throw Error("Unexpected sitemap route "+u);
  return u.pathname;
});
if(master.version!==1||!master.pages||!routes.includes("/")||
  new Set(routes).size!==routes.length||
  routes.length!==Object.keys(master.pages).length||
  routes.some(route=>!master.pages[route])||
  Object.keys(master.pages).some(route=>!routes.includes(route)))
  throw Error("Breadcrumb master and public sitemap do not match");
const escape=value=>String(value).replace(/[&<>"']/g,ch=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[ch]);
function trail(route){
  const seen=new Set(),steps=[];
  let current=route;
  while(current!==null){
    if(seen.has(current)||!master.pages[current])throw Error("Invalid breadcrumb parent chain "+route+" at "+current);
    seen.add(current);
    const item=master.pages[current];
    if(!item.label||!item.label.trim())throw Error("Missing label for "+current);
    steps.unshift({url:current,label:item.label});
    current=item.parent;
  }
  if(steps[0]?.url!=="/"||steps.at(-1)?.url!==route)throw Error("Breadcrumb does not lead home to page "+route);
  return steps;
}
function render(route){
  const steps=trail(route);
  if(route==="/")return null;
  const markup='<nav class="breadcrumb" aria-label="パンくずリスト">'+steps.map((item,i)=>{
    const last=i===steps.length-1;
    const part=last?'<span aria-current="page">'+escape(item.label)+'</span>':
      '<a href="'+escape(item.url)+'">'+escape(item.label)+'</a>';
    return (i?'<span aria-hidden="true">/</span>':'')+part;
  }).join("")+'</nav>';
  const ld={
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    itemListElement:steps.map((item,i)=>({
      "@type":"ListItem",position:i+1,name:item.label,item:publicOrigin+item.url
    }))
  };
  const json='<script type="application/ld+json" data-site-breadcrumbs>'+JSON.stringify(ld).replace(/</g,"\\u003c")+'</script>';
  return {markup,json,steps};
}
function update(src,route){
  if(route==="/")return src;
  const old=src.match(/<(?:div|nav)\b[^>]*class="breadcrumb"[^>]*>[\s\S]*?<\/(?:div|nav)>/g)||[];
  if(old.length!==1)throw Error("Expected exactly one breadcrumb for "+route);
  if(!src.includes("</head>"))throw Error("Missing </head> on "+route);
  const replacement=render(route);
  let next=src.replace(old[0],replacement.markup);
  const scripts=next.match(/<script type="application\/ld\+json" data-site-breadcrumbs>[\s\S]*?<\/script>/g)||[];
  if(scripts.length>1)throw Error("Duplicate breadcrumb JSON-LD "+route);
  next=scripts.length?next.replace(scripts[0],replacement.json):
    next.replace("</head>",replacement.json+"</head>");
  return next;
}
function sync(){
  let changed=0;
  for(const route of routes){
    if(route==="/")continue;
    const file=path.join(root,route.slice(1),"index.html");
    const before=fs.readFileSync(file,"utf8");
    const after=update(before,route);
    if(before!==after){fs.writeFileSync(file,after,"utf8");changed++;console.log("UPDATED "+route);}
  }
  console.log("PASS canonical breadcrumbs: "+routes.length+" public pages; "+changed+" changed");
}
if(require.main===module)sync();
module.exports={render,update,trail,sync};
