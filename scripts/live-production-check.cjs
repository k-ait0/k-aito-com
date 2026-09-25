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
const pages=[
  "/","/about/","/archive/","/business/","/drink/","/links/","/money/",
  "/notes/nuclear-industrial-carrier/","/notes/site-launch-trouble/",
  "/projects/","/projects/digital-storage/","/storage/","/study/","/travel/","/works/"
];
const resources=[
  "/content-index.js","/app.js","/site-enhance.js","/site-content.js",
  "/site-search.js","/site-search.css","/image-fix.css","/homepage.css",
  "/subpages.css","/og-image.png","/assets/brand/kite-mark.png",
  "/assets/editorial/about-profile.webp","/assets/editorial/archive-library.webp",
  "/assets/editorial/tabi-route.webp","/assets/editorial/finowa-workspace.webp",
  "/sitemap.xml","/robots.txt"
];
const digest=body=>crypto.createHash("sha256").update(body).digest("hex");
const local=route=>fs.readFileSync(path.join(root,route.replace(/^\//,"")+(route.endsWith("/")?"index.html":"")));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchLive(route){
  const link=new URL(route,origin);
  let error;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const res=await fetch(link,{redirect:"follow",signal:AbortSignal.timeout(12000),headers:{"User-Agent":"Kaito-Production-QA/1.0"}});
      if(res.url.startsWith("http:"))throw Error("Insecure HTTP redirect");
      if(new URL(res.url).host!==link.host)throw Error("Unexpected host redirect: "+res.url);
      if(res.status!==200)throw Error("HTTP "+res.status+" on "+res.url);
      return Buffer.from(await res.arrayBuffer());
    }catch(e){error=e;if(attempt<3)await wait(1000*attempt);}
  }
  throw Error(route+" — "+(error?.cause?.message||error?.message||String(error)));
}
(async()=>{
  const errors=[];
  let verified=0;
  for(const route of [...pages,...resources]){
    try{
      const live=await fetchLive(route);
      const expected=local(route);
      if(digest(live)!==digest(expected)){
        throw Error("public response differs from main (live "+digest(live).slice(0,12)+
          ", local "+digest(expected).slice(0,12)+")");
      }
      console.log("PASS "+route+" HTTP 200; exact deployed bytes ("+live.length+")");
      verified++;
    }catch(e){const problem=route+": "+e.message;errors.push(problem);console.error("FAIL "+problem);}
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
  console.log("PRODUCTION RESULT "+verified+" passed; "+errors.length+" failed");
  if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});
