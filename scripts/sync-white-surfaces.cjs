"use strict";
/* KAITO paper surfaces are a last-loaded, sitewide layer for every public page.
 * Run on content updates to avoid one-off styles drifting between pages. */
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const href='/white-surfaces-v1.css?v=20261009-3';
const thumbnailHref='/thumbnail-v1.css?v=20261009-1';
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
  // Thumbnails must load immediately before the final white reading surface stylesheet.
  const thumbnailTag='<link rel="stylesheet" href="'+thumbnailHref+'">';
  const previous=html.match(/<link rel="stylesheet" href="\/thumbnail-v1\.css\?v=[^"]+">/g)||[];
  if(previous.length>1)throw Error("Duplicate thumbnail CSS "+target);
  if(previous.length)html=html.replace(previous[0],"");
  const whiteTag='<link rel="stylesheet" href="'+href+'">';
  if(!html.includes(whiteTag))throw Error("White layer missing when adding thumbnails "+target);
  html=html.replace(whiteTag,thumbnailTag+whiteTag);
  // Must be the last stylesheet so its white reading surface rules win.
  const head=html.slice(0,html.indexOf("</head>"));
  const links=[...head.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
  if(links.at(-1)!==href)throw Error("White surface is not the last stylesheet "+target);
  if(links.at(-2)!==thumbnailHref)throw Error("Thumbnail CSS must precede white surface "+target);
  if(html!==fs.readFileSync(target,"utf8")){
    fs.writeFileSync(target,html,"utf8");changed++;console.log("UPDATED "+url.pathname);
  }
}
console.log("PASS white surface links: "+pages.length+" public pages, "+changed+" changed");
