import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const json=(path)=>JSON.parse(read(path));
const blob=(path)=>{const b=read(path);return createHash("sha1").update("blob "+Buffer.byteLength(b)+"\0").update(b).digest("hex");};
const path="research/a05/d179-six-alternative-elicitation-angles-review.json";
const reportPath="docs/A05_V2_D180_SIX_ALTERNATIVE_ANGLES_EDITORIAL_REVIEW_20261111.md";
const d=json(path),md=read(reportPath);
const d164=json("research/a05/d164-prior-28-semantic-dedup-and-gap-recalculation.json");
const d168=json("research/a05/d168-eleven-hypothesis-cognitive-probe-questions.json");
test("D179 original user ideas are preserved in exactly eleven records",()=>{
 assert.equal(d.items.length,11);
 assert.equal(new Set(d.items.map(x=>x.id)).size,11);
 assert.ok(d.items.every(x=>x.original.length>25));
});
test("Six elicitation METHODS are not mislabeled as eleven independent semantic families",()=>{
 assert.equal(new Set(d.items.map(x=>x.angle)).size,6);
 assert.equal(d.review_counts.new_independent_semantic_families_confirmed,0);
 assert.equal(d.review_counts.new_scored_items_approved,0);
 assert.equal(d.scoring_policy.includes("32 unresolved slots"),true);
});
test("The 11 ideas are distributed across axes without replacing fixed architecture",()=>{
 assert.deepEqual(Object.fromEntries("ABCD".split("").map(ax=>[ax,d.items.filter(x=>x.axis===ax).length])),{A:3,B:2,C:3,D:3});
 assert.equal(d.user_constraints.max_genuinely_different_items_per_semantic_family_in_pool,2);
 assert.equal(d.user_constraints.no_exact_duplicate,true);
 assert.equal(d.user_constraints.E_fixed,2);
 assert.equal(d.user_constraints.candidate_pool,50);
 assert.equal(d.user_constraints.per_run,30);
});
test("Every new angle has a grounded source question to compare against",()=>{
 const anchors=new Set([...d164.records.map(x=>x.id),...d168.items.map(x=>x.id)]);
 assert.ok(d.items.every(x=>anchors.has(x.anchor)),d.items.filter(x=>!anchors.has(x.anchor)).map(x=>x.anchor).join(","));
});
test("All rewritten examples are clearly research-only, with non-empty opposing text",()=>{
 assert.ok(d.items.every(x=>x.trial.test_only&&x.trial.stem.length>30&&x.trial.left.length>8&&x.trial.right.length>8&&x.trial.left!==x.trial.right));
 assert.ok(d.items.every(x=>x.issue.length>20&&x.judgment.length>5&&x.trial.research_question.length>20));
 assert.equal(new Set(d.items.map(x=>x.trial.stem)).size,11);
});
test("Outside-axis original A loss example is not secretly promoted to scored bank",()=>{
 const a=d.items.find(x=>x.id==="D179-LA");
 assert.equal(a.anchor,"A01");
 assert.equal(a.judgment,"CROSS_AXIS_NEGATIVE_CONTROL");
 assert.ok(a.issue.includes("人間関係"));
});
test("B metaphor and third person prompts remain unscored and distinct from bipolar B scoring",()=>{
 assert.equal(d.items.find(x=>x.id==="D179-MB").judgment,"INVALID_BIPOLAR_AS_SCORING");
 assert.equal(d.items.find(x=>x.id==="D179-PB").judgment,"NORM_PROJECTION_PROBE");
 assert.equal(d.production_code_changed,false);
 assert.equal(d.original_bank_changed,false);
});
test("Original documents and comparison data have unchanged Git blob SHAs",()=>{
 for(const [path,sha] of Object.entries(d.source_blobs))assert.equal(sha,blob(path),path);
});
test("Every original question and revised probe is reported without omission",()=>{
 for(const x of d.items){
   assert.ok(md.includes("### "+x.id+"｜"),x.id);
   assert.ok(md.includes(x.original),x.id+" original");
   assert.ok(md.includes(x.trial.stem),x.id+" revised");
 }
});
test("The report retains scientific pretest limitations and no claim of validation",()=>{
 assert.ok(md.includes("新系統承認0"));
 assert.ok(md.includes("認知面接実施0"));
 assert.ok(md.includes("未充足32枠"));
 assert.ok(md.includes("www.census.gov"));
 assert.ok(md.includes("www.cdc.gov"));
 assert.equal(d.respondent_tests_performed,0);
});
