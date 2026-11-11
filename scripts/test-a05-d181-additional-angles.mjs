import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const raw=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const load=path=>JSON.parse(raw(path));
const sha=path=>{const s=raw(path);return createHash("sha1").update("blob "+Buffer.byteLength(s)+"\0").update(s).digest("hex")};
const path="research/a05/d181-six-more-elicitation-methods-twelve-ideas.json";
const report="docs/A05_V2_D182_SIX_ADDITIONAL_ANGLES_REVIEW_20261111.md";
const d=load(path),md=raw(report);
test("Every user angle 7–12 has two original ideas",()=>{
 assert.equal(d.items.length,12);
 assert.equal(new Set(d.items.map(x=>x.id)).size,12);
 assert.deepEqual(Object.fromEntries([7,8,9,10,11,12].map(n=>[n,d.items.filter(x=>x.method===n).length])),{7:2,8:2,9:2,10:2,11:2,12:2});
 assert.ok(d.items.every(x=>x.original&&x.original.length>24));
});
test("All source Git blobs are pinned to the exact earlier research versions",()=>{
 const files={
 "research/a05/d179-six-alternative-elicitation-angles-review.json":d.prior_artifacts.prior_methods_1_to_6,
 "research/a05/d151-eight-context-contrast-cognitive-pairs.json":d.prior_artifacts.paired_cognitive_D151,
 "research/a05/d153-50slot-content-readiness-and-nonscoring-ledger.json":d.prior_artifacts.legacy_D153,
 "research/a05/d164-prior-28-semantic-dedup-and-gap-recalculation.json":d.prior_artifacts.editorial_candidate_D164,
 "research/a05/d168-eleven-hypothesis-cognitive-probe-questions.json":d.prior_artifacts.existing_experiments_D168
 };
 for(const [path,ref] of Object.entries(files))assert.equal(ref,sha(path),path);
});
test("A–D 48, E2, draw30, 16 types and zero exact/at most two semantics",()=>{
 assert.equal(d.fixed.A_D_bank_each,12);
 assert.equal(d.fixed.E_bank,2);
 assert.equal(d.fixed.total_bank,50);
 assert.equal(d.fixed.A_D_draw_each,7);
 assert.equal(d.fixed.E_draw,2);
 assert.equal(d.fixed.total_draw,30);
 assert.equal(d.fixed.types,16);
 assert.equal(d.fixed.exact_duplicates_allowed,0);
 assert.equal(d.fixed.per_semantic_family_cap,2);
});
test("No new semantic families nor scored items are falsely approved",()=>{
 assert.equal(d.review.new_independent_semantic_families_confirmed,0);
 assert.equal(d.review.scored_bank_items_approved,0);
 assert.equal(d.editorial_bank_review.baseline_main_axis_unresolved_slots,32);
 assert.equal(d.editorial_bank_review.changed_shortfall,0);
 assert.equal(d.respondents_observed,0);
 assert.equal(d.production_changed,false);
});
test("Every idea includes a specific confound, comparator and a concrete test readout",()=>{
 const ids=new Set(["A01","C01","C05","D01","D02","B-FU01","C-FU14","C-FU15","A-G2","B-G1","D179-PB","D179-PD"]);
 for(const x of d.items){
   assert.ok(x.risk.length>24&&x.design.readout.length>22,x.id);
   assert.ok(x.anchor.every(id=>ids.has(id)),x.id+" unknown anchor");
   assert.ok(x.design.choices.length>=3,x.id+" must permit uncertainty/other");
 }
});
test("Methods 7 and 10 are explicitly paired, not free-standing trait-strength scores",()=>{
 for(const x of d.items.filter(x=>[7,10].includes(x.method))){
   assert.ok(x.design.baseline&&x.design.condition,x.id);
   assert.ok(!x.design.readout.includes("強度そのものとみなす"),x.id+" word check changed"); // Negative wording differs by category; see additional check below
 }
 assert.ok(d.method_risks[7].includes("not direct psychometric"));
 assert.ok(d.method_risks[10].includes("Resource deprivation"));
});
test("C scarcity uses pre-existing C-FU14/C-FU15 paired research",()=>{
 const x=d.items.find(x=>x.id==="D181-7C");
 assert.deepEqual(x.anchor.slice(0,2),["C-FU14","C-FU15"]);
 assert.ok(x.design.readout.includes("再利用"));
});
test("Third-person advice remains classed as near prior angle 2",()=>{
 for(const id of ["D181-9D","D181-9B"]){
 const x=d.items.find(y=>y.id===id);
 assert.equal(x.category,"NORMATIVE_THIRD_PERSON_OVERLAP");
 }
});
test("Ranking stays ipsative research only, and off-axis rest is not C scoring",()=>{
 assert.equal(d.items.find(x=>x.id==="D181-12X").category,"IPSATIVE_CROSS_AXIS_RESEARCH_ONLY");
 assert.equal(d.items.find(x=>x.id==="D181-12C").category,"THIRD_OPTION_OFF_AXIS_RESEARCH_ONLY");
 assert.ok(d.method_risks[12].includes("ipsative"));
});
test("All 12 originals and research proposals are in Japanese report without placeholders",()=>{
 for(const x of d.items){
  assert.ok(md.includes("### "+x.id+"｜"),x.id);
  assert.ok(md.includes(x.original),x.id+" original");
  assert.ok(md.includes(x.design.readout),x.id+" study readout");
 }
 assert.doesNotMatch(md,/:undefined|：undefined/);
 assert.ok(md.includes("未充足32枠"));
});
