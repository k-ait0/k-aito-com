import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {validateD92ConstructMatrix,D92_SCHEMA,D92_CRITERIA}
 from "../projects/kidp/life-design-lab/a05/construct-choice-d92.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const auditText=read("docs/A05_D91_CONSTRUCT_BOUNDARY_AUDIT_20261105.json");
const bankText=read("docs/A05_D90_BC_PILOT_0_2_20261105.json");
const matrix=JSON.parse(read("docs/A05_D92_CONSTRUCT_CHOICE_MATRIX_20261105.json"));
const audit=JSON.parse(auditText),bank=JSON.parse(bankText);
const gitBlob=text=>createHash("sha1").update("blob "+Buffer.byteLength(text)+"\0").update(text).digest("hex");
const clone=value=>structuredClone(value);
test("D92 matrix is tied to immutable D91 audit and D90 question bank",()=>{
 assert.equal(matrix.schema,D92_SCHEMA);
 assert.equal(matrix.sources[0].git_blob_sha,gitBlob(auditText));
 assert.equal(matrix.sources[1].git_blob_sha,gitBlob(bankText));
 assert.equal(matrix.sources[0].git_blob_sha,"7faadc14113110a8443c0f81a2b5fc36590d1791");
 assert.equal(matrix.sources[1].git_blob_sha,"69fd5e3d31cc40a54f6e9e63dade60c65ffcbf38");
 assert.equal(audit.items.length,12);
 assert.equal(bank.items.length,12);
});
test("D92: eight candidate definitions, six explicit criterion checks each",()=>{
 const result=validateD92ConstructMatrix(matrix);
 assert.equal(result.compared_options,8);
 assert.equal(result.compared_scales.length,2);
 assert.deepEqual(matrix.criteria.map(x=>x.id),D92_CRITERIA);
 assert.equal(matrix.options.reduce((n,o)=>n+o.checks.length,0),48);
 assert.equal(new Set(matrix.options.map(o=>o.id)).size,8);
});
test("D92 B_related and C_present editorial preferences remain unapproved",()=>{
 const result=validateD92ConstructMatrix(matrix);
 assert.deepEqual(result.editorial_candidates.map(x=>x.option_id),["BR1","CP1"]);
 assert.ok(result.editorial_candidates.every(x=>x.formal_decision==="PENDING"));
 assert.equal(result.psychometric_validity,"NOT_ESTABLISHED");
 assert.equal(result.type_id,null);
 assert.equal(result.classification_status,"WITHHELD");
 assert.equal(result.production_approved,false);
});
test("D92 every candidate's item ID is a member of its corresponding 3-question facet",()=>{
 for(const option of matrix.options){
  const related=matrix.scales.find(s=>s.id===option.scale);
  assert.ok(related);
  for(const id of option.item_ids){
   assert.ok(related.item_ids.includes(id),option.id+" -> "+id);
   assert.ok(audit.items.some(q=>q.id===id&&q.construct===option.scale));
  }
 }
});
test("D92 conceptual comparisons cite research but never claim A05 validation",()=>{
 assert.match(matrix.scientific_boundary,/none directly validates A05/);
 assert.equal(matrix.policy.treat_editorial_criteria_as_scientific_evidence,false);
 for(const option of matrix.options){
  assert.ok(option.reason.length>15);
  assert.ok(option.excludes.length>=1);
  assert.ok(option.checks.every(c=>["MEETS","CONDITIONAL","FAILS"].includes(c.status)));
 }
});
test("D92 rejects an automatic release or existing-score migration",()=>{
 for(const field of [
  "issue_v03_now","overwrite_legacy_questions","migrate_old_answers",
  "emit_type_id","emit_pair_compatibility_score","release_public_diagnosis",
  "collect_real_participant_data","treat_editorial_criteria_as_scientific_evidence"
 ]){
  const changed=clone(matrix);
  changed.policy[field]=true;
  assert.throws(()=>validateD92ConstructMatrix(changed),TypeError,field);
 }
 const changed=clone(matrix);
 changed.gates[0].state="APPROVED";
 assert.throws(()=>validateD92ConstructMatrix(changed),TypeError);
});
test("D92 detects swapped candidates, missing criteria, and unsupported preferred selections",()=>{
 for(const mutate of [
  m=>m.options.pop(),
  m=>m.options[0].checks.pop(),
  m=>m.options[0].checks[0].criterion_id="surprise",
  m=>m.options[0].checks[0].status="UNVALIDATED",
  m=>m.scales[0].editorial_preference="BR2",
  m=>m.scales[1].formal_decision="APPROVED",
  m=>m.sources[0].git_blob_sha="00000000",
  m=>m.options[0].checks[2].status="FAILS"
 ]){
  const bad=clone(matrix);
  mutate(bad);
  assert.throws(()=>validateD92ConstructMatrix(bad),TypeError);
 }
});
test("D92 no additional question, answer capture or persistence was added",()=>{
 const source=read("projects/kidp/life-design-lab/a05/construct-choice-d92.mjs");
 assert.equal(source.includes("typeId:"),false);
 for(const banned of [
  "localStorage","sessionStorage","indexedDB","sendBeacon",
  "XMLHttpRequest","fetch(","document.cookie"
 ]) assert.equal(source.includes(banned),false,banned);
 assert.equal(matrix.policy.v02_question_bank_frozen,true);
 assert.equal(matrix.gates.length,5);
 assert.ok(matrix.gates.every(g=>g.automatable===false&&g.state==="PENDING"));
});
