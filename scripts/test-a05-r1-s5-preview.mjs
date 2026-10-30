import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TYPES,GROUPS} from "../projects/kidp/life-design-lab/a05/types.mjs";
import {COMPATIBILITY_PAIRS,getCompatibilityPair} from "../projects/kidp/life-design-lab/a05/compatibility.mjs";
const root=new URL("../",import.meta.url);
const load=path=>readFileSync(new URL(path,root),"utf8");
const master=JSON.parse(load("docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V04_20261030.json"));
const html=load("projects/kidp/life-design-lab/a05/r1-s5-preview.html");
const script=load("projects/kidp/life-design-lab/a05/r1-s5-preview.mjs");
const css=load("projects/kidp/life-design-lab/a05/r1-s5-preview.css");
test("S5 is isolated, noindex, manual and no unapproved production copy",()=>{
 assert.match(html, /16タイプ価値観関係マップ/);
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/未承認の編集用プレビュー/);
 assert.match(html,/選択中の2タイプ/);
 assert.match(html,/C：編集上の仮説・未実証/);
 assert.match(html,/B軸の注意/);
 assert.match(html,/connect-src 'self'/);
 assert.doesNotMatch(html,/<form/i);
 assert.ok(!/localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest|window\.location\.search|URLSearchParams/.test(script));
 assert.match(script,/fetch\(DATA_PATH/);
 assert.match(script,/textContent/);
 assert.match(css,/@media\(max-width:680px\)/);
});
test("static source and compatibility module agree on 136 unique pairs",()=>{
 assert.equal(TYPES.length,16);
 assert.equal(GROUPS.length,4);
 assert.equal(master.release,"NO_GO");
 assert.equal(master.rows.length,136);
 const seen=new Set();
 const index=new Map(master.rows.map(r=>[r.pairId,r]));
 for(const pair of COMPATIBILITY_PAIRS){
   seen.add(pair.id);
   const row=index.get(pair.id);
   assert.ok(row,pair.id);
   assert.deepEqual(row.typeIds,pair.typeIds);
   assert.deepEqual(row.sharedAxes,pair.agreements.map(x=>x.axis));
   assert.deepEqual(row.differentAxes,pair.differences.map(x=>x.axis));
   assert.equal(row.firstHumanReview,"PENDING");
   assert.equal(row.independentSecondHumanReview,"PENDING");
   assert.equal(row.publicationApproved,false);
   assert.equal(row.draftCopyApproved,false);
 }
 assert.equal(seen.size,136);
});
test("full 256 ordered selections share unordered ID and preserve orientation",()=>{
 const all=new Set();
 for(const a of TYPES)for(const b of TYPES){
   const p=getCompatibilityPair(a.id,b.id);
   const reverse=getCompatibilityPair(b.id,a.id);
   assert.equal(p.id,reverse.id);
   assert.ok(p.agreements.length+p.differences.length===4);
   assert.ok(p.score===null&&p.rank===null);
   all.add(p.id);
 }
 assert.equal(all.size,136);
});
