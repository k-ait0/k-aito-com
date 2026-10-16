"use strict";
/* Build a same-origin searchable index from sitemap-listed public project pages.
 * Projects are not hand-copied into article catalogue. No external network use. */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const escText=text=>String(text||"").replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|hellip|mdash|ndash);/gi,(whole,key)=>{
  const k=key.toLowerCase();
  if(k.startsWith("#x"))return String.fromCodePoint(parseInt(k.slice(2),16));
  if(k.startsWith("#"))return String.fromCodePoint(parseInt(k.slice(1),10));
  return {amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",hellip:"…",mdash:"—",ndash:"–"}[k]||whole;
});
const plain=html=>escText(String(html||"").replace(/<!--[\s\S]*?-->/g," ")
  .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi," ")
  .replace(/<[^>]*>/g," ").replace(/\s+/g," ")).replace(/\s+/g," ").trim();
const capture=(html,re)=>re.exec(html)?.[1]||"";
const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const routes=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map(x=>new URL(x[1].trim())).filter(u=>u.origin==="https://k-aito.com"&&
    /^\/projects\/(?:[^/]+\/)+$/.test(u.pathname)).map(u=>u.pathname);
const registry=JSON.parse(fs.readFileSync(path.join(root,"data/project-card-status.v1.json"),"utf8"));
if(!routes.length||new Set(routes).size!==routes.length)throw Error("Missing or duplicate published projects");
const projects=routes.map(url=>{
  const file=path.join(root,url.slice(1),"index.html");
  const source=fs.readFileSync(file,"utf8");
  if(/<meta\s+name="robots"[^>]*\bnoindex\b/i.test(source))throw Error("Sitemap contains noindex project "+url);
  const title=plain(capture(source,/<h1\b[^>]*>([\s\S]*?)<\/h1>/i));
  const summary=escText(capture(source,/<meta\s+name="description"\s+content="([^"]+)"/i));
  const main=source.slice(source.indexOf("<main"),source.indexOf("</main>")+7);
  const status=plain(capture(main,/<div class="project-status">\s*<strong>([\s\S]*?)<\/strong>/i));
  const id=url.slice(1,-1).replaceAll("/","-");
  const registered=registry.projects.find(p=>p.id===url.split("/")[2] && url.split("/").length===4);
  if(!title||!summary||!main||title.length>140||!(status||registered?.stage)||!/^\/projects\//.test(url))throw Error("Incomplete project "+url);
  return {id,type:"PROJECT",title,summary,url,stage:registered?.stage||status,
    access:registered?.accessJa||"公開中の紹介ページ",searchText:plain(main).slice(0,7000)};
});
const output='"use strict";\n/* GENERATED from public sitemap project pages; do not edit. */\nwindow.KAitoProjects=Object.freeze('+JSON.stringify(projects,null,2)+');\n';
const outFile=path.join(root,"project-search-index.js");
if(!fs.existsSync(outFile)||fs.readFileSync(outFile,"utf8")!==output){
  fs.writeFileSync(outFile,output);console.log("UPDATED project-search-index.js");
}
const hash=crypto.createHash("sha256").update(output).digest("hex").slice(0,12);
const scriptTag='<script src="/project-search-index.js?v='+hash+'" defer></script>';
const coreSource=fs.readFileSync(path.join(root,"site-search-core.js"),"utf8");
const coreHash=crypto.createHash("sha1").update("blob "+Buffer.byteLength(coreSource)+"\0")
  .update(coreSource).digest("hex").slice(0,12);
const coreTag='<script src="/site-search-core.js?v='+coreHash+'" defer></script>';
const searchSource=fs.readFileSync(path.join(root,"site-search.js"),"utf8");
const searchHash=crypto.createHash("sha1").update("blob "+Buffer.byteLength(searchSource)+"\0")
  .update(searchSource).digest("hex").slice(0,12);
// The stylesheet is shared across HOME and subpages. Never roll its cache
// version back to a fixed dated tag when the browser-facing CSS changes.
const cssHash=crypto.createHash("sha256")
  .update(fs.readFileSync(path.join(root,"site-search.css"))).digest("hex").slice(0,12);

const pages=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>new URL(x[1].trim()).pathname);
let changed=0;
for(const route of pages){
  const htmlPath=path.join(root,route.slice(1),"index.html");
  let html=fs.readFileSync(htmlPath,"utf8"),old=html;
  const oldTags=[...html.matchAll(/<script src="\/project-search-index\.js\?v=[^"]+" defer><\/script>/g)];
  if(oldTags.length>1)throw Error("Duplicate search index script "+route);
  if(oldTags.length===1)html=html.replace(oldTags[0][0],scriptTag);
  else{
    const anchor=route==="/"?'<script src="/app.js?':'<script src="/site-search.js?';
    const i=html.indexOf(anchor);
    if(i<0)throw Error("Search script anchor missing on "+route);
    html=html.slice(0,i)+scriptTag+html.slice(i);
  }
  const coreTags=[...html.matchAll(/<script src="[/]site-search-core[.]js(?:[?]v=[^"]+)?" defer><[/]script>/g)];
  if(coreTags.length>1)throw Error("Duplicate shared search core "+route);
  if(coreTags.length===1)html=html.replace(coreTags[0][0],coreTag);
  else html=html.replace(scriptTag,scriptTag+coreTag);
  const projectPosition=html.indexOf('src="/project-search-index.js?');
  const corePosition=html.indexOf('src="/site-search-core.js?');
  const uiPosition=html.indexOf(route==="/"?'/app.js?':'/site-search.js?');
  if(projectPosition<0||corePosition<projectPosition||uiPosition<corePosition)
    throw Error("Shared search dependencies out of order "+route);
  // Always invalidate global subpage search JavaScript on implementation changes.
  if(route!=="/")html=html.replace(/\/site-search\.js\?v=[a-zA-Z0-9-]+/g,"/site-search.js?v="+searchHash);
  html=html.replace(/\/site-search\.css\?v=[a-zA-Z0-9-]+/g,"/site-search.css?v="+cssHash);
  const first=html.indexOf('src="/project-search-index.js?');
  const second=html.indexOf(route==="/"?'/app.js?':'/site-search.js?');
  if(first<0||second<first)throw Error("Invalid dependency order "+route);
  if(html!==old){fs.writeFileSync(htmlPath,html);changed++;}
}
console.log("PASS project search index "+projects.length+" public project detail pages, "+
  pages.length+" pages linked, "+changed+" HTML updates; digest "+hash);
module.exports={projects};
