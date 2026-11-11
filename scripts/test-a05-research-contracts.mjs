/**
 * A05 v2 editorial research integrity. Read-only.
 * Run: node --test scripts/test-a05-research-contracts.mjs
 * Assertions check traceability and safeguards, NOT validity of respondent responses.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const raw=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const load=path=>JSON.parse(raw(path));
const sha=path=>{
  const data=raw(path);
  return createHash("sha1").update("blob "+Buffer.byteLength(data)+"\0").update(data).digest("hex");
};
const p={
  d142:"research/a05/d142-full-50-item-content-disposition.json",
  d146:"research/a05/d146-50slot-before-after-quality-proposals.json",
  d158:"research/a05/d158-semantic-family-two-question-limit-and-audit.json",
  d161:"research/a05/d161-reassessment-of-30-historical-rejects-with-controls.json",
  d162:"research/a05/d162-ten-conditional-rescue-contrast-rewrites.json",
  d164:"research/a05/d164-prior-28-semantic-dedup-and-gap-recalculation.json",
  d165:"research/a05/d165-minimum-11-semantic-families-32-unresolved-capacity.json",
  d167:"research/a05/d167-review-of-eleven-missing-family-hypotheses.json",
  d168:"research/a05/d168-eleven-hypothesis-cognitive-probe-questions.json",
  d170:"research/a05/d170-eleven-hypotheses-offline-cognitive-review.html",
  d171:"research/a05/d171-cognitive-pilot-8-prioritized-and-3-controls.json"
};
const d=Object.fromEntries(Object.entries(p).filter(([k])=>k!=="d170").map(([k,path])=>[k,load(path)]));
const html=raw(p.d170);
test("Old 50-item source list is preserved and E remains two fixed items",()=>{
  assert.equal(d.d142.items.length,50);
  assert.equal(d.d146.items.length,50);
  for(const ax of ["A","B","C","D"])assert.equal(d.d142.items.filter(x=>x.axis===ax).length,12);
  assert.equal(d.d142.items.filter(x=>x.axis==="E").length,2);
});
test("User rule: no exact duplicates and <=2 valid items per semantic family",()=>{
  assert.equal(d.d158.limits.exact_duplicate_max,0);
  assert.equal(d.d158.limits.same_semantic_family_max_in_bank,2);
  assert.equal(d.d158.limits.same_semantic_family_max_in_single_run,2);
});
test("D164 sources remain identical to their Git blobs",()=>{
  for(const [path,checksum] of Object.entries(d.d164.source_blobs))
    assert.equal(checksum,sha(path),"D164 referenced source changed: "+path);
});
test("D164 covers the optimistic 28 candidates exactly",()=>{
  assert.equal(d.d164.records.length,28);
  assert.equal(new Set(d.d164.records.map(x=>x.id)).size,28);
  assert.equal(d.d164.totals.primary,10);
  assert.equal(d.d164.totals.conditional,6);
  assert.equal(d.d164.totals.alternate,11);
  assert.equal(d.d164.totals.hold,1);
});
test("D164 shortlist has at most two question candidates per temporary family",()=>{
  for(const ax of "ABCD"){
    const chosen=d.d164.records.filter(x=>x.axis===ax&&["PRIMARY","CONDITIONAL"].includes(x.level));
    const familyCounts=Object.groupBy(chosen,x=>x.semantic_family_hypothesis);
    for(const same of Object.values(familyCounts))assert.ok(same.length<=2);
  }
});
test("D164 is an editorial shortlist, not scored approval",()=>{
  assert.equal(d.d164.actual_approved_score_items,0);
  assert.equal(d.d164.respondents_tested,0);
  assert.ok(d.d164.records.every(x=>!x.content_approved&&!x.interviewed));
});
test("D165 capacity warning is provisional, not a guarantee of 32 usable questions",()=>{
  assert.equal(d.d165.source_sha[p.d164],sha(p.d164));
  assert.equal(d.d165.totals.minimum_unresolved_bank_slots_assuming_all_current_pass,32);
  assert.equal(d.d165.totals.minimum_additional_families_if_current_are_real,11);
  assert.ok(d.d165.eleven_exploration_hypotheses.every(x=>!x.independent_semantic_family_established&&!x.scored_candidate_approved));
});
test("D167 has exactly 11 unvalidated hypotheses with source pins",()=>{
  assert.equal(d.d167.evaluations.length,11);
  assert.equal(new Set(d.d167.evaluations.map(x=>x.id)).size,11);
  for(const [path,checksum] of Object.entries(d.d167.source_blob_shas))
    assert.equal(checksum,sha(path),"D167 referenced source changed: "+path);
  assert.equal(d.d167.counts.confirmed_as_distinct_semantic_families,0);
  assert.equal(d.d167.counts.approved_new_scored_items,0);
});
test("D168 has exactly nine drafts and two existing matched pairs",()=>{
  assert.equal(d.d168.items.length,11);
  assert.equal(d.d168.items.filter(x=>x.prompt!==null).length,9);
  assert.equal(d.d168.items.filter(x=>x.existing_pair!==null).length,2);
  assert.equal(d.d168.source_shas.D167,sha(p.d167));
  assert.equal(d.d168.source_shas.D146,sha(p.d146));
});
test("B-G1 contains two compatible independent ratings, not forced bipolar scoring",()=>{
  const b=d.d168.items.find(x=>x.id==="B-G1");
  assert.equal(b.prompt.format,"TWO_7_POINT_RATINGS");
  assert.equal(b.independent_rating_statements.length,2);
  assert.equal(b.scored,false);
});
test("C and D paired research prompts cannot become standalone scoring",()=>{
  const c=d.d168.items.find(x=>x.id==="C-G2"),dr=d.d168.items.find(x=>x.id==="D-G3");
  assert.deepEqual(c.existing_pair.map(x=>x.id),["C-FU14","C-FU15"]);
  assert.deepEqual(dr.existing_pair.map(x=>x.id),["D-FU07","D-FU10"]);
  assert.equal(c.scored,false);
  assert.equal(dr.scored,false);
});
test("All D168 probes explicitly remain research-only",()=>{
  assert.equal(d.d168.approved_scored_items,0);
  assert.equal(d.d168.answered_by_real_respondents,0);
  assert.ok(d.d168.items.every(x=>!x.approved&&!x.scored));
  assert.equal(d.d168.production_changed,false);
});
test("D170 contains all 11 source case IDs, one each",()=>{
  const caseIds=[...html.matchAll(/class="question-card" data-id="([A-D]-G[1-3])"/g)].map(x=>x[1]);
  assert.equal(caseIds.length,11);
  assert.equal(new Set(caseIds).size,11);
  assert.deepEqual(new Set(caseIds),new Set(d.d168.items.map(x=>x.id)));
});
test("D170 has explicit hidden filtering, export, import and reset controls",()=>{
  for(const required of [".question-card[hidden]","id=\"axisFilter\"","id=\"export\"","id=\"import\"","id=\"importFile\"","id=\"reset\"","id=\"ioStatus\""])
    assert.ok(html.includes(required),required);
  assert.ok(html.includes("JSON.stringify(doc,null,2)"));
  assert.ok(html.includes("schema:\"A05-D170-COGNITIVE-REVIEW-NOTES-0.1\""));
});
test("D170 is offline-only without telemetry or auto-storage",()=>{
  assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+href=|fetch\(|XMLHttpRequest|localStorage|sendBeacon/i);
});
test("D171 task priority covers all 11 D168 IDs exactly once",()=>{
  assert.equal(d.d171.items.length,11);
  assert.deepEqual(new Set(d.d171.items.map(x=>x.id)),new Set(d.d168.items.map(x=>x.id)));
  assert.equal(d.d171.cohorts.find(x=>x.level==="TIER_1").cases.length,4);
  assert.equal(d.d171.cohorts.find(x=>x.level==="TIER_2").cases.length,4);
  assert.equal(d.d171.cohorts.find(x=>x.level==="NEGATIVE_CONTROLS").cases.length,3);
});
test("D171 source pins match corrected D170, D168 and D167",()=>{
  for(const [path,checksum] of Object.entries(d.d171.source_shas))
    assert.equal(checksum,sha(path),"D171 referenced source changed: "+path);
});
test("No question/scoring/bank production changes were authorized",()=>{
  assert.equal(d.d164.original_bank_modified,false);
  assert.equal(d.d164.scoring_modified,false);
  assert.equal(d.d168.existing_question_bank_changed,false);
  assert.equal(d.d168.production_changed,false);
  assert.equal(d.d171.production_changed,false);
});
