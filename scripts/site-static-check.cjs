"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
function walk(dir){
  const out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if([".git","node_modules","qa-screenshots"].includes(e.name))continue;
    const item=path.join(dir,e.name);
    if(e.isDirectory())out.push(...walk(item));
    else if(e.isFile()&&e.name.endsWith(".html"))out.push(item);
  }
  return out;
}
const xml=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const listed=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
assert.equal(new Set(listed).size,listed.length,"Duplicate sitemap URLs");
const html=walk(root);
let checked=0,localRefs=0;
for(const file of html){
  const p=path.relative(root,file).replaceAll(path.sep,"/");
  const src=fs.readFileSync(file,"utf8");
  const head=src.slice(0,src.indexOf("</head>"));
  assert.match(head,/<title>[^<]+<\/title>/,"Missing title "+p);
  assert.match(head,/<meta name="description" content="[^"]+"/,"Missing description "+p);
  assert.match(head,/<meta name="viewport"/,"Missing viewport "+p);
  const idList=[...src.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(idList.length,new Set(idList).size,"Repeated HTML ID "+p);
  for(const m of src.matchAll(/href="#([^"]+)"/g))
    assert.ok(idList.includes(m[1]),"Invalid anchor "+p+" #"+m[1]);
  if(p!=="404.html"){
    const url="https://k-aito.com/"+p.replace(/index\.html$/,"");
    assert.ok(head.includes('rel="canonical" href="'+url+'"'),"Canonical mismatch "+p);
    assert.ok(head.includes('property="og:url" content="'+url+'"'),"OpenGraph URL mismatch "+p);
    assert.ok(head.includes('property="og:image" content="https://k-aito.com/og-image.png"'),"Missing sharing image "+p);
    assert.ok(head.includes('name="twitter:card" content="summary_large_image"'),"Missing Twitter card "+p);
    assert.ok(listed.includes(url),"Missing sitemap location "+p);
  }else{
    assert.ok(/name="robots" content="noindex"/.test(head),"404 must not be indexed");
  }
  for(const m of src.matchAll(/(?:href|src)="([^"]+)"/g)){
    const ref=m[1];
    if(ref.startsWith("#")||/^(https?:|mailto:|tel:|data:|\/\/)/.test(ref))continue;
    assert.ok(!/^javascript:/i.test(ref),"JavaScript link "+p);
    const pathname=ref.split(/[?#]/)[0];
    if(!pathname)continue;
    let target;
    if(pathname.startsWith("/"))target=path.resolve(root,"."+pathname);
    else target=path.resolve(path.dirname(file),pathname);
    if(pathname.endsWith("/"))target=path.join(target,"index.html");
    assert.ok(target.startsWith(root+path.sep)||target===root,"Escapes site root "+p);
    assert.ok(fs.existsSync(target),"Missing local resource "+p+" -> "+ref);
    localRefs++;
  }
  checked++;
}
assert.ok(fs.existsSync(path.join(root,"og-image.png")),"OG image missing");
console.log("PASS "+checked+" HTML files, "+listed.length+" unique sitemap URLs, "+
  localRefs+" local references, all canonical/social metadata and anchors");
