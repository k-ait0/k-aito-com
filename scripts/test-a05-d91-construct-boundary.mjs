import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const bankText = read("docs/A05_D90_BC_PILOT_0_2_20261105.json");
const bank = JSON.parse(bankText);
const audit = JSON.parse(read("docs/A05_D91_CONSTRUCT_BOUNDARY_AUDIT_20261105.json"));
const expectedFacets = ["self","related","future","present"];
const validRisks = new Set([
 "normative_ceiling","similar_items","context_dependence",
 "construct_blend","double_barrelled","cross_axis_overlap"
]);
const gitBlob = text => createHash("sha1")
 .update("blob " + Buffer.byteLength(text) + "\0").update(text).digest("hex");

test("D91 audit is tied to exact D90 immutable source blob and not an approved survey",()=>{
 assert.equal(audit.schema,"A05-D91-EDITORIAL-CONSTRUCT-AUDIT-0.1");
 assert.equal(audit.status,"INTERNAL_REVIEW_NOT_PSYCHOMETRIC_EVIDENCE");
 assert.equal(gitBlob(bankText),"69fd5e3d31cc40a54f6e9e63dade60c65ffcbf38");
 assert.equal(audit.source.bank_schema,bank.schema);
 assert.equal(audit.source.bank_blob_sha,gitBlob(bankText));
 assert.equal(audit.source.old_bank_untouched,true);
 assert.equal(audit.methods.actual_participant_data_collected,false);
 assert.equal(audit.methods.psychometric_validation,false);
 assert.equal(audit.methods.is_statistical_effect_size,false);
});
test("D91 exactly 12 item trace rows map 1:1 to D90 question texts and facets",()=>{
 assert.equal(audit.items.length,12);
 assert.deepEqual(audit.items.map(x=>x.id),bank.items.map(x=>x.id));
 assert.equal(new Set(audit.items.map(x=>x.id)).size,12);
 for(let i=0;i<12;i++){
  const x=audit.items[i],q=bank.items[i];
  assert.equal(x.axis,q.axis,x.id);
  assert.equal(x.facet,q.facet,x.id);
  assert.equal(x.source_text,q.text,x.id);
  assert.equal(x.construct,q.axis+"_"+q.facet,x.id);
  assert.equal(x.empirical_validated,false,x.id);
  assert.equal(x.no_auto_question_revision,true,x.id);
 }
});
test("D91 all four independent facets are explicitly defined and not conflated with needs",()=>{
 assert.equal(audit.constructs.length,4);
 assert.deepEqual(audit.constructs.map(x=>x.id),
  ["B_self","B_related","C_future","C_present"]);
 assert.deepEqual(bank.facets.map(x=>x.id),expectedFacets);
 for(const concept of audit.constructs){
  assert.equal(concept.status,"PENDING");
  assert.ok(concept.definition.length>=15);
  assert.ok(concept.not_equal.length>=10);
 }
});
test("D91 categories and 4 TRIAL + 8 REVISE are editorial, not type decisions",()=>{
 const categories=audit.items.map(x=>x.editorial_status);
 assert.equal(categories.filter(x=>x==="TRIAL").length,4);
 assert.equal(categories.filter(x=>x==="REVISE").length,8);
 assert.ok(categories.every(x=>["TRIAL","REVISE"].includes(x)));
 for(const item of audit.items){
  assert.ok(item.rationale.length>12,item.id);
  assert.ok(item.next_action.length>12,item.id);
  assert.ok(item.risk_flags.length>0,item.id);
  assert.ok(item.risk_flags.every(flag=>validRisks.has(flag)),item.id);
  assert.ok(Array.isArray(item.neighbor_axes),item.id);
  assert.ok(item.neighbor_axes.every(id=>["A","B","C","D","E"].includes(id)&&id!==item.axis),item.id);
  if(item.overlap_item_id!==null){
   const overlap=audit.items.find(x=>x.id===item.overlap_item_id);
   assert.ok(overlap,item.id);
   assert.equal(item.facet,overlap.facet,item.id);
   assert.ok(item.risk_flags.includes("similar_items"),item.id);
  }
 }
});
test("D91 boundary risk coverage: time-resource confusion and future/present conflation tracked",()=>{
 assert.equal(audit.axis_boundaries.length,5);
 assert.deepEqual(audit.axis_boundaries.map(x=>x.axis_id),["A","B","C","D","E"]);
 for(const row of audit.axis_boundaries){
  assert.ok(row.measure.length>15);
  assert.ok(row.exclude.length>10);
 }
 const lookup=Object.fromEntries(audit.items.map(x=>[x.id,x]));
 assert.ok(lookup["C-F01"].neighbor_axes.includes("E"));
 assert.ok(lookup["C-F01"].risk_flags.includes("cross_axis_overlap"));
 assert.ok(lookup["C-P02"].risk_flags.includes("construct_blend"));
 assert.ok(lookup["C-P03"].risk_flags.includes("construct_blend"));
 assert.ok(lookup["B-S03"].risk_flags.includes("normative_ceiling"));
});
test("D91 retains gates and does not silently allow a new version or data collection",()=>{
 assert.equal(bank.scoring.classify,false);
 assert.equal(bank.scoring.type_id,null);
 assert.equal(bank.scoring.group_id,null);
 assert.equal(bank.scoring.classification_status,"WITHHELD");
 assert.equal(audit.decision.freeze_current_bank_v02,true);
 assert.equal(audit.decision.create_v03_now,false);
 assert.equal(audit.decision.forbid_unapproved_automatic_revision,true);
 assert.equal(audit.decision.official_measurement_version_approved,false);
 assert.equal(audit.decision.release_classification,"WITHHELD");
 assert.equal(audit.decision.allow_legacy_result_conversion,false);
 assert.equal(audit.decision.allow_participant_data_collection,false);
});
test("D91 references are background theory, never direct A05 scale validation",()=>{
 assert.ok(audit.methods.literature.length>=3);
 for(const reference of audit.methods.literature) {
  assert.ok(reference.doi||reference.url);
  assert.match(reference.relevance,/DOES NOT validate A05/i);
 }
});
