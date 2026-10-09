"use strict";
/* KAITO paper surfaces are a last-loaded, sitewide layer for every public page.
 * Run on content updates to avoid one-off styles drifting between pages. */
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const href='/white-surfaces-v1.css?v=20261009-2';
const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const pages=[...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>new URL(m[1].trim()));
let changed=0;
for(const url of pages){
  if(url.origin!=="https://k-aito.com"||!/^\/[a-z0-9/-]*$/.test(url.pathname))throw Error("Invalid sitemap URL "+url);
  const target=path.join(root,url.pathname.replace(/^\//,""),"index.html");
  if(!fs.existsSync(target))throw Error("Missing public HTML "+target);
  let html=fs.readFileSync(target,"utf8");
  if(!html.includes("</head>"))throw Error("Missing head close "+target);
  if(html.includes("white-surfaces-v1.css")){
    const old=html.match(/<link rel="stylesheet" href="\/white-surfaces-v1\.css\?v=[^"]+">/g)||[];
    if(old.length!==1)throw Error("Duplicate white layer "+target);
    html=html.replace(old[0],'<link rel="stylesheet" href="'+href+'">');
  }else{
    html=html.replace("</head>",'<link rel="stylesheet" href="'+href+'"></head>');
  }
  // Must be the last stylesheet so its white reading surface rules win.
  const head=html.slice(0,html.indexOf("</head>"));
  const links=[...head.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
  if(links.at(-1)!==href)throw Error("White surface is not the last stylesheet "+target);
  if(html!==fs.readFileSync(target,"utf8")){
    fs.writeFileSync(target,html,"utf8");changed++;console.log("UPDATED "+url.pathname);
  }
}
console.log("PASS white surface links: "+pages.length+" public pages, "+changed+" changed");
