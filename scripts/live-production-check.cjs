"use strict";
/* Production comparison, not the local Chromium smoke test.
 * Run from an Internet-connected machine: node scripts/live-production-check.cjs
 * A successful result confirms the HTTP content served by XServer matches
 * the checked-out commit. It does not replace a personal-device visual check.
 */
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const origin=process.env.KAITO_LIVE_ORIGIN||"https://k-aito.com";
// Read routes from the published sitemap so newly added notes are verified too.
const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const pages=[...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(match=>{
  const value=match[1].trim();
  const url=new URL(value);
  if(url.origin!==origin||!(url.pathname==="/"||/^\/[a-z0-9/-]+\/$/.test(url.pathname))||
      url.search||url.hash||url.href!==origin+url.pathname){
    throw Error("Unexpected public sitemap URL: "+value);
  }
  return url.pathname;
});
if(!pages.length||new Set(pages).size!==pages.length){
  throw Error("Sitemap has no pages or contains duplicate public URLs");
}
const resources=[
  "/content-index.js","/project-search-index.js","/app.js","/site-enhance.js","/site-content.js",
  "/site-search.js","/site-search.css","/image-fix.css","/homepage.css",
  "/subpages.css","/article-reading.css","/discovery-v1.css","/cards-v1.css","/thumbnail-v1.css","/white-surfaces-v1.css","/og-image.png","/assets/brand/kite-mark.png",
  "/assets/editorial/about-profile.webp","/assets/editorial/archive-library.webp",
  "/assets/editorial/tabi-route.webp","/assets/editorial/finowa-workspace.webp",
  // Illustrations for the public-interest essay; verify every asset on XServer.
  "/notes/media-public-interest-sankei-building/figures/fig01-operating-profit.svg",
  "/notes/media-public-interest-sankei-building/figures/fig02-assets.svg",
  "/notes/media-public-interest-sankei-building/figures/fig03-profit-breakdown.svg",
  "/notes/media-public-interest-sankei-building/figures/fig04-editorial-independence.svg",
  "/sitemap.xml","/robots.txt","/assets/notebook-photo.webp","/article-v2.css",
  // Isolated noindex beta, verified without adding the URL to the public sitemap.
  "/tools/want-roulette/index.html","/tools/want-roulette/manifest.webmanifest",
  "/tools/want-roulette/app-icon.svg","/tools/want-roulette/sw.js"
];
const betaPages=["/tools/want-roulette/"];
const digest=body=>crypto.createHash("sha256").update(body).digest("hex");
const local=route=>fs.readFileSync(path.join(root,route.replace(/^\//,"")+(route.endsWith("/")?"index.html":"")));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchLive(route){
  const link=new URL(route,origin);
  let error;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const res=await fetch(link,{redirect:"follow",signal:AbortSignal.timeout(8000),headers:{"User-Agent":"Kaito-Production-QA/1.0"}});
      if(res.url.startsWith("http:"))throw Error("Insecure HTTP redirect");
      if(new URL(res.url).host!==link.host)throw Error("Unexpected host redirect: "+res.url);
      if(res.status!==200)throw Error("HTTP "+res.status+" on "+res.url);
      return Buffer.from(await res.arrayBuffer());
    }catch(e){error=e;if(attempt<3)await wait(1000*attempt);}
  }
  throw Error(route+" — "+(error?.cause?.message||error?.message||String(error)));
}
// Limit simultaneous fetches to avoid overwhelming the origin and preserve diagnostics.
async function mapLimited(routes,limit,callback){
  const output=new Array(routes.length);
  let next=0;
  await Promise.all(Array.from({length:Math.min(limit,routes.length)},async()=>{
    while(next<routes.length){
      const position=next++;
      output[position]=await callback(routes[position]);
    }
  }));
  return output;
}
(async()=>{
  const errors=[];
  let verified=0;
  const routes=[...pages,...betaPages,...resources];
  // Do not print 58 misleading 'file mismatch' failures if the origin is inaccessible.
  let homepage;
  try{
    homepage=await fetchLive("/");
    console.log("PASS origin preflight: "+origin+"/ HTTP 200");
  }catch(e){
    console.error("PRODUCTION UNREACHABLE: origin preflight failed. No local/live byte comparison was possible.");
    console.error("ORIGIN ERROR: "+e.message);
    console.error("ACTION: inspect DNS, firewall and outbound connectivity; rerun after origin is reachable.");
    process.exitCode=2;
    return;
  }
  const results=await mapLimited(routes,10,async route=>{
    let live;
    try{live=route==="/"?homepage:await fetchLive(route);}
    catch(e){return {route,ok:false,kind:"FETCH_ERROR",error:e.message};}
    const expected=local(route);
    if(digest(live)!==digest(expected)){
      return {route,ok:false,kind:"CONTENT_MISMATCH",error:"public response differs from main (live "+
        digest(live).slice(0,12)+", local "+digest(expected).slice(0,12)+")"};
    }
    return {route,ok:true,length:live.length};
  });
  for(const result of results){
    if(result.ok){console.log("PASS "+result.route+" HTTP 200; exact deployed bytes ("+result.length+")");verified++;}
    else{const problem=result.kind+" "+result.route+": "+result.error;errors.push(problem);console.error("FAIL "+problem);}
  }
  // Check the live sitemap covers every public page, not just matching a file.
  try{
    const xml=await fetchLive("/sitemap.xml");
    const text=xml.toString("utf8");
    for(const route of pages){
      if(!text.includes("<loc>"+origin+route+"</loc>")){
        throw Error("missing "+route+" in production sitemap");
      }
    }
    console.log("PASS sitemap contains all "+pages.length+" public routes");
    verified++;
  }catch(e){errors.push("sitemap integrity: "+e.message);console.error("FAIL sitemap integrity: "+e.message);}
  // The FINOWA card must lead to a reachable separate site.
  try{
    const destination="https://finowa.jp/";
    const result=await fetch(destination,{
      redirect:"follow",signal:AbortSignal.timeout(15000),
      headers:{"User-Agent":"Kaito-Production-QA/1.0"}
    });
    if(result.status!==200||new URL(result.url).protocol!=="https:"){
      throw Error("FINOWA destination HTTP "+result.status+" / "+result.url);
    }
    const html=await result.text();
    if(!html.includes("FINOWA"))throw Error("FINOWA destination lacks expected site identity");
    console.log("PASS FINOWA external destination "+destination+" HTTP 200");
    verified++;
  }catch(e){errors.push("FINOWA destination: "+e.message);console.error("FAIL FINOWA destination: "+e.message);}
  console.log("PRODUCTION RESULT "+verified+" passed; "+errors.length+" failed");
  if(errors.length)console.error("FAILURE SUMMARY: "+errors.filter(e=>e.startsWith("CONTENT_MISMATCH")).length+
    " content mismatch(es); "+errors.filter(e=>e.startsWith("FETCH_ERROR")).length+" fetch error(s); "+
    errors.filter(e=>!e.startsWith("CONTENT_MISMATCH")&&!e.startsWith("FETCH_ERROR")).length+" ancillary error(s).");
  if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});
