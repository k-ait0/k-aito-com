/**
 * A05 D-152/D-153 source-integrity and editorial gate checks.
 * Read-only. Run: node --test scripts/test-a05-d152-d153-content-gates.mjs
 * Does not infer real-respondent validity or modify public A05.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
function raw(rel) { return readFileSync(new URL("../" + rel, import.meta.url), "utf8"); }
function json(rel) { return JSON.parse(raw(rel)); }
function gitBlob(data) { return createHash("sha1").update("blob " + Buffer.byteLength(data) + "\0").update(data).digest("hex"); }
const paths={
  audit:"research/a05/d142-full-50-item-content-disposition.json",
  alt:"research/a05/d149-four-contexts-per-axis-alternative.json",
  rubric:"research/a05/d150-21v16-common-rubric-audit.json",
  variants:"research/a05/d152-three-risky-families-six-redraft-variants.json",
  ledger:"research/a05/d153-50slot-content-readiness-and-nonscoring-ledger.json",
  d146:"research/a05/d146-50slot-before-after-quality-proposals.json"
};
const [audit,alt,rubric,variants,ledger,d146]=["audit","alt","rubric","variants","ledger","d146"].map(k=>json(paths[k]));
const mm=new Map(ledger.items.map(x=>[x.id,x]));
const expected={A:12,B:12,C:12,D:12,E:2};
test("D153 contains 50 unique IDs from D142",()=>{
 assert.equal(ledger.items.length,50);
 assert.equal(new Set(ledger.items.map(x=>x.id)).size,50);
 assert.deepEqual(new Set(ledger.items.map(x=>x.id)),new Set(audit.items.map(x=>x.id)));
});
test("D153 retains original D142 dispositions",()=>{
 for(const p of audit.items)assert.equal(mm.get(p.id).original_disposition,p.disposition);
});
test("Bank and draw sizes remain 50 and 30",()=>{
 assert.equal(ledger.invariants.bank_total,50);
 assert.equal(ledger.invariants.draw_total,30);
 assert.deepEqual(ledger.invariants.pool_axis,expected);
 assert.deepEqual(ledger.invariants.draw_axis,{A:7,B:7,C:7,D:7,E:2});
});
test("E pool and draw remain exactly 2",()=>{
 assert.equal(mm.get("E01").readiness_category,"E_2_FIXED_CONTENT_REVIEW");
 assert.equal(mm.get("E02").readiness_category,"E_2_FIXED_CONTENT_REVIEW");
 assert.equal(variants.candidates.filter(x=>x.axis==="E").length,0);
});
test("All 50 remain not approved for scored promotion",()=>{
 assert.equal(ledger.approved_for_scoring,0);
 assert.ok(ledger.items.every(x=>x.fully_approved===false && x.may_use_in_scored_random_bank===false));
});
test("C-FU14 and C-FU15 are both blocked paired probes",()=>{
 for(const id of ["C-FU14","C-FU15"])assert.equal(mm.get(id).readiness_category,"PAIRED_RESEARCH_ONLY");
});
test("D-P3 and D-P4 source items are not standalone scored",()=>{
 for(const id of ["D03","D-FU07","D06","D-FU10"])assert.equal(mm.get(id).readiness_category,"PAIRED_RESEARCH_ONLY");
});
test("Reframe contexts retain exactly five A and three B source IDs",()=>{
 for(const id of ["A02","A05","A-FU10","A03","A06","B02","B05","B-FU11"])assert.equal(mm.get(id).readiness_category,"CONTEXT_REWRITE_REQUIRED");
});
test("Six variants map two each to A-P3, A-P4, B-P3",()=>{
 assert.equal(variants.candidates.length,6);
 assert.equal(new Set(variants.candidates.map(x=>x.candidate_id)).size,6);
 for(const id of ["A-P3","A-P4","B-P3"])assert.equal(variants.candidates.filter(x=>x.source_family===id).length,2);
});
test("Six candidates cannot overwrite old sources or be used as scored items",()=>{
 for(const v of variants.candidates) {
   assert.equal(v.approved,false);
   assert.equal(v.independent_scored_item,false);
   assert.equal(v.status,"UNAPPROVED_RESEARCH_DRAFT");
   assert.ok(v.question.length>=25 && v.left!==v.right);
 }
});
test("D153 50 item distribution matches internal counts",()=>{
 const expectedDistribution={
 "NEEDS_REVIEW_NOT_APPROVED":14,
 "CONTEXT_REWRITE_REQUIRED":8,
 "PROBE_DO_NOT_SCORE":5,
 "DUPLICATE_DO_NOT_COUNT":9,
 "REMOVE_OR_REPLACE":6,
 "PAIRED_RESEARCH_ONLY":6,
 "E_2_FIXED_CONTENT_REVIEW":2
 };
 assert.deepEqual(ledger.distribution,expectedDistribution);
});
test("D153 source pointers match Git blob SHA",()=>{
 for(const key of ["audit","alt","rubric","variants","d146"])
   assert.equal(ledger.source_sha[paths[key]],gitBlob(raw(paths[key])));
});
test("D152 source pointer matches D149 Git blob",()=>{
 assert.equal(variants.from.D149_blob,gitBlob(raw(paths.alt)));
});
test("Every A-D source ID belongs to one D149 observational context",()=>{
 const all=alt.items.flatMap(x=>x.source_ids);
 assert.equal(all.length,48);
 assert.equal(new Set(all).size,48);
 assert.deepEqual(new Set(all),new Set(d146.items.filter(x=>x.axis!=="E").map(x=>x.old_id)));
});
test("No changes to existing form, randomizer, or scoring",()=>{
 assert.equal(ledger.invariants.existing_form_unchanged,true);
 assert.equal(ledger.invariants.existing_scoring_unchanged,true);
 assert.equal(ledger.invariants.existing_randomizer_unchanged,true);
});
