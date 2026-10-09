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
  // All published /notes/<slug>/ articles must use the canonical reading shell.
  if(p.startsWith("notes/")&&p.endsWith("/index.html")&&p.split("/").length===3&&!isNoindex){
    assert.ok(src.includes('<body class="subpage essay-page">'),"Missing white paper body class "+p);
    assert.ok(src.includes('<article class="article-page'),"Missing article class "+p);
    assert.ok(src.includes('<div class="article-copy essay-body">'),"Missing article reading typography "+p);
    assert.ok(head.includes('href="/article-reading.css?v='),"Missing shared article CSS "+p);
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
const actionMeta=JSON.parse(fs.readFileSync(path.join(root,"tools/want-roulette/card-action-metadata.v1.json"),"utf8"));
assert.equal(actionMeta.schemaVersion,1,"Roulette action metadata schema");
assert.equal(actionMeta.cards.length,200,"Roulette action metadata count");
assert.equal(new Set(actionMeta.cards.map(c=>c.id)).size,200,"Roulette action metadata duplicate IDs");
assert.deepEqual(new Set(actionMeta.cards.map(c=>c.id)),new Set(cards.map(c=>c.id)),"Roulette action metadata IDs mismatch");
const allowedActionTypes=new Set(["NOW","PREP","GOAL","HABIT","REL"]);
const allowedHorizons=new Set(["today","days","weeks","months","years","ongoing"]);
for(const meta of actionMeta.cards){
  assert.ok(allowedActionTypes.has(meta.actionType),"Roulette invalid action type "+meta.id);
  assert.ok(allowedHorizons.has(meta.timeHorizon),"Roulette invalid time horizon "+meta.id);
}
console.log("PASS roulette action metadata: 200/200 IDs mapped to valid action types and horizons");
const actionMetaV2=JSON.parse(fs.readFileSync(path.join(root,"tools/want-roulette/card-action-metadata.v2.json"),"utf8"));
assert.equal(actionMetaV2.schemaVersion,2,"Roulette action metadata v2 schema");
assert.equal(actionMetaV2.cards.length,200,"Roulette action metadata v2 count");
assert.deepEqual(new Set(actionMetaV2.cards.map(c=>c.id)),new Set(cards.map(c=>c.id)),"Roulette action metadata v2 IDs mismatch");
for(const meta of actionMetaV2.cards){
  assert.ok(allowedActionTypes.has(meta.actionType),"Roulette v2 invalid action type "+meta.id);
  assert.ok(allowedHorizons.has(meta.timeHorizon),"Roulette v2 invalid time horizon "+meta.id);
  assert.ok(typeof meta.firstStep==="string"&&meta.firstStep.trim().length>=5,"Roulette v2 firstStep missing "+meta.id);
}
console.log("PASS roulette action metadata v2: 200/200 IDs have first-step guidance");
const actionMetaV3=JSON.parse(fs.readFileSync(path.join(root,"tools/want-roulette/card-action-metadata.v3.json"),"utf8"));
assert.equal(actionMetaV3.schemaVersion,3,"Roulette action metadata v3 schema");
assert.equal(actionMetaV3.cards.length,200,"Roulette action metadata v3 count");
assert.deepEqual(new Set(actionMetaV3.cards.map(c=>c.id)),new Set(cards.map(c=>c.id)),"Roulette action metadata v3 IDs mismatch");
assert.equal(new Set(actionMetaV3.cards.map(c=>c.firstStep)).size,200,"Roulette v3 firstStep guidance must be unique per card");
for(const meta of actionMetaV3.cards){
  assert.ok(allowedActionTypes.has(meta.actionType),"Roulette v3 invalid action type "+meta.id);
  assert.ok(allowedHorizons.has(meta.timeHorizon),"Roulette v3 invalid time horizon "+meta.id);
  assert.ok(typeof meta.firstStep==="string"&&meta.firstStep.trim().length>=5,"Roulette v3 firstStep missing "+meta.id);
}
console.log("PASS roulette action metadata v3: 200/200 cards have unique first-step guidance");
assert.ok(fs.existsSync(path.join(root,"og-image.png")),"OG image missing");
console.log("PASS "+checked+" HTML files, "+listed.length+" unique sitemap URLs, "+
  localRefs+" local references, all canonical/social metadata and anchors");
