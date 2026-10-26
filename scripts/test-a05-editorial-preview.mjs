import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EDITORIAL_SCHEMA, EDITORIAL_ITEMS } from "../projects/kidp/life-design-lab/a05/editorial-preview-data.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const data=p=>JSON.parse(read(p));
const d73=data("docs/A05_D73_ITEM_CONSTRUCT_CROSSWALK_20261026.json");
const d74=data("docs/A05_D74_AB_ALTERNATIVES_20261026.json");
const d80=data("docs/A05_D80_PILOT_CANDIDATES_20261026.json");
test("D83 compare data maintains exact provenance for all A/B L/M/R items",()=>{
 assert.equal(EDITORIAL_SCHEMA,"A05-D83-001");
 assert.equal(EDITORIAL_ITEMS.length,12);
 assert.deepEqual(EDITORIAL_ITEMS.map(x=>x.id),d73.items.filter(x=>"AB".includes(x.axis)).map(x=>x.id));
 for(const x of EDITORIAL_ITEMS){
  const old=d73.items.find(i=>i.id===x.id);
  const l=d74.items.find(i=>i.id===x.id);
  const r=d80.items.find(i=>i.id===x.id);
  assert.ok(old&&l&&r,x.id);
  assert.equal(x.axis,old.axis,x.id);
  assert.equal(x.facet,r.facet,x.id);
  assert.equal(x.verdict,old.editorialStatus,x.id);
  assert.deepEqual(x.original,old.current,x.id);
  assert.deepEqual(x.L,l.candidateL,x.id);
  assert.deepEqual(x.M,old.candidate,x.id);
  assert.deepEqual(x.R,r.candidateR,x.id);
  assert.deepEqual(x.overlaps,[...new Set([...r.linkedDuplicates,...l.explicitComparators])].filter(id=>"AB".includes(id[0])),x.id);
  assert.equal(x.risk,l.comparativeRisk,x.id);
 }
 assert.deepEqual(EDITORIAL_ITEMS.filter(x=>x.verdict==="BLOCK").map(x=>x.id),["A04","A05","B02"]);
});
test("D83 preview is noindex and does not load data-collection APIs",()=>{
 const html=read("projects/kidp/life-design-lab/a05/editorial-preview.html");
 const js=read("projects/kidp/life-design-lab/a05/editorial-preview.mjs");
 for(const s of ['name="robots" content="noindex,nofollow"','id="axis"','id="item"','id="block-only"','id="overlap"','id="jump-overlap"','aria-live="polite"','./editorial-preview.mjs'])
  assert.ok(html.includes(s),s);
 for(const term of ["localStorage","sessionStorage","indexedDB","fetch(","XMLHttpRequest","sendBeacon","navigator.serviceWorker","<form","type=\"submit\"","https://","http://"])
  assert.equal((html+"\n"+js).includes(term),false,term);
 assert.match(js,/textContent/);
 assert.match(js,/createTextNode/);
 assert.equal(js.includes("innerHTML"),false);
});
