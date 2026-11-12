import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const json=p=>JSON.parse(read(p));
const blob=p=>{const s=read(p);return createHash("sha1").update("blob "+Buffer.byteLength(s)+"\0").update(s).digest("hex")};
const d=json("research/a05/d198-ten-to-four-editorial-shortlist.json");
const prior=json("research/a05/d197-ten-priority-questions-paired-revisions.json");
const d164=json("research/a05/d164-prior-28-semantic-dedup-and-gap-recalculation.json");
const report=read("docs/A05_V2_D199_TEN_TO_FOUR_EDITORIAL_SELECTION_20261112.md");
const master=read("docs/A05_ALL_QUESTION_TEXTS_AND_EDITORIAL_ASSESSMENTS_20261111.md");
const decisions=["PILOT_FIRST","RESERVE","HOLD_RESEARCH"];
test("Exactly ten formerly revised questions are triaged once",()=>{
 assert.equal(d.triage.length,10);
 assert.deepEqual(new Set(d.triage.map(x=>x.source_question_id)),new Set(prior.cases.map(x=>x.source_question_id)));
 assert.equal(new Set(d.triage.map(x=>x.source_question_id)).size,10);
});
test("Research triage is deliberately four pilot / three reserve / three held",()=>{
 assert.deepEqual(d.triage_counts,{PILOT_FIRST:4,RESERVE:3,HOLD_RESEARCH:3});
 for(const status of decisions)assert.equal(d.triage.filter(x=>x.editorial_decision===status).length,d.triage_counts[status]);
 assert.equal(d.pilot_design.lead_4.length,4);
});
test("Pilot contains one A, B, C, and D item in explicit order",()=>{
 assert.deepEqual(d.pilot_design.lead_4,["A-X10","B-X12","C-X07","D-X05"]);
 assert.deepEqual(d.triage.filter(x=>x.editorial_decision==="PILOT_FIRST").map(x=>x.axis),["A","B","C","D"]);
});
test("B diagnostic cannot be scored as a two-option bipolar question",()=>{
 const b=d.triage.find(x=>x.source_question_id==="B-X12");
 assert.equal(b.purpose,"STRUCTURAL_PROBE_NOT_BIPOLAR");
 assert.equal(b.proposed_D197_revision.format,"TWO_INDEPENDENT_7_POINT_RATINGS");
 assert.equal(b.proposed_D197_revision.independent_rating_statements.length,2);
 assert.equal(b.scoring_approved,false);
 assert.ok(d.pilot_design.B_measure.includes("not a bipolar"));
});
test("Preserve D197 exact wording and historical comparator for each selection",()=>{
 for(const row of d.triage){
  const old=prior.cases.find(x=>x.source_question_id===row.source_question_id);
  assert.ok(old);
  assert.deepEqual(row.proposed_D197_revision,old.proposed_revision);
  assert.equal(row.original_D197_compare,old.existing_comparator.source_id);
  assert.equal(row.family_id,old.family_id);
  assert.equal(row.axis,old.axis);
 }
});
test("Every editorial decision has a rationale, risks, discrimination probe and stop rule",()=>{
 for(const row of d.triage){
  assert.ok(row.research_rationale.length>30,row.source_question_id);
  assert.ok(row.main_confounds.length>15,row.source_question_id);
  assert.ok(row.assessment_question.length>24,row.source_question_id);
  assert.ok(row.promotion_or_stop_gate.length>25,row.source_question_id);
  assert.equal(row.independent_content_proven,false);
  assert.equal(row.respondent_evidence,false);
  assert.equal(row.scoring_approved,false);
 }
});
test("Unchanged earlier sixteen prioritized research questions remain explicitly separate",()=>{
 const old=d164.records.filter(x=>["PRIMARY","CONDITIONAL"].includes(x.level));
 assert.equal(old.length,16);
 assert.equal(d.prior_16_status.length,16);
 assert.deepEqual(new Set(old.map(x=>x.id)),new Set(d.prior_16_status.map(x=>x.id)));
 assert.ok(d.prior_16_status.every(x=>x.content_status==="PRE_EXISTING_SHORTLIST_NOT_REDECIDED"&&!x.approved_scored));
});
test("All retained research variants are exempt from premature score promotion",()=>{
 assert.ok(d.rules.research_candidates_remain_saved);
 assert.equal(d.rules.max_genuinely_different_scored_per_family,2);
 assert.equal(d.rules.adopted_new_scored_items,0);
 assert.equal(d.real_interviews,0);
 assert.equal(d.production_changed,false);
 assert.equal(d.merge_or_publish,false);
 assert.equal(d.unresolved_32_slots_unchanged,true);
});
test("All source blob digests match original files exactly",()=>{
 for(const [path,digest] of Object.entries(d.source_sha))assert.equal(blob(path),digest,path);
});
test("Markdown report and master preserve all 10 rationales and statuses",()=>{
 assert.ok(report.includes("重点4問"));
 assert.ok(master.includes("## II-10．D-198"));
 assert.ok(master.includes("## I-11．D-197"));
 for(const row of d.triage){
  assert.ok(report.includes(row.source_question_id),row.source_question_id+" report");
  assert.ok(report.includes(row.research_rationale),row.source_question_id+" report rationale");
  assert.ok(master.includes(row.research_rationale),row.source_question_id+" master rationale");
  assert.ok(master.includes(row.promotion_or_stop_gate),row.source_question_id+" stop");
 }
 assert.doesNotMatch(report,/undefined|\[object Object\]/);
 assert.doesNotMatch(master,/undefined|\[object Object\]/);
});
