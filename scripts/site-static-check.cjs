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
  const url="https://k-aito.com/"+p.replace(/index\.html$/,"");
  // Unlisted noindex betas (and 404) are deliberately not public-index pages.
  // Still check their basic metadata, internal anchors, and local resources.
  const isNoindex=/<meta\s+name="robots"\s+content="[^"]*\bnoindex\b/i.test(head);
  if(p==="404.html"){
    assert.ok(isNoindex,"404 must not be indexed");
  }else if(isNoindex){
    assert.ok(!listed.includes(url),"Noindex beta unexpectedly appears in sitemap "+p);
  }else{
    assert.ok(head.includes('rel="canonical" href="'+url+'"'),"Canonical mismatch "+p);
    assert.ok(head.includes('property="og:url" content="'+url+'"'),"OpenGraph URL mismatch "+p);
    assert.ok(head.includes('property="og:image" content="https://k-aito.com/og-image.png"'),"Missing sharing image "+p);
    assert.ok(head.includes('name="twitter:card" content="summary_large_image"'),"Missing Twitter card "+p);
    assert.ok(listed.includes(url),"Missing sitemap location "+p);
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
// Keep the beta's initial card inventory stable across content edits.
const rouletteSrc=fs.readFileSync(path.join(root,"tools/want-roulette/index.html"),"utf8");
const cardsMatch=rouletteSrc.match(/const CARDS=(\[[^\n]*\]);<\/script>/);
assert.ok(cardsMatch,"Roulette card master not found");
const cards=JSON.parse(cardsMatch[1]);
assert.equal(cards.length,200,"Roulette initial card count changed");
assert.equal(new Set(cards.map(c=>c.id)).size,200,"Roulette duplicate card IDs");
const byCategory=new Map();
for(const card of cards){
  assert.match(card.id,/^W\d{3}$/,"Roulette card ID format");
  assert.ok(card.text&&card.category&&card.categoryId,"Roulette card incomplete "+card.id);
  byCategory.set(card.categoryId,(byCategory.get(card.categoryId)||0)+1);
}
assert.equal(byCategory.size,20,"Roulette category count changed");
for(const [id,count] of byCategory)assert.equal(count,10,"Roulette category size "+id);
console.log("PASS roulette card inventory: 200 unique IDs in 20 categories of 10");
assert.ok(fs.existsSync(path.join(root,"og-image.png")),"OG image missing");
console.log("PASS "+checked+" HTML files, "+listed.length+" unique sitemap URLs, "+
  localRefs+" local references, all canonical/social metadata and anchors");
