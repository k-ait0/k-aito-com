import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {validateD93Mapping,D93_SCHEMA,D93_ITEM_IDS,D93_CRITERIA}
 from "../projects/kidp/life-design-lab/a05/item-construct-d93.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const paths=[
 "docs/A05_D92_CONSTRUCT_CHOICE_MATRIX_20261105.json",
 "docs/A05_D90_BC_PILOT_0_2_20261105.json",
 "docs/A05_D91_CONSTRUCT_BOUNDARY_AUDIT_20261105.json"
];
const textFiles=paths.map(read);
const [matrix,bank,audit]=textFiles.map(JSON.parse);
const mapping=JSON.parse(read("docs/A05_D93_ITEM_CONSTRUCT_MAPPING_20261105.json"));
const gitBlob=t=>createHash("sha1").update("blob "+Buffer.byteLength(t)+"\0").update(t).digest("hex");
const sources=paths.map((path,i)=>({path,sha:gitBlob(textFiles[i])}));
const check=value=>validateD93Mapping(value,bank,matrix,audit,sources);
const copy=()=>structuredClone(mapping);

test("D93 source lineage points to D90, D91, D92 exact content",()=>{
 assert.equal(mapping.schema,D93_SCHEMA);
 assert.deepEqual(mapping.sources.map(x=>x.git_blob_sha),sources.map(x=>x.sha));
 assert.deepEqual(sources.map(x=>x.sha),[
  "1e867e0506c5d1fde3fb78a67e37c4987dce47d7",
  "69fd5e3d31cc40a54f6e9e63dade60c65ffcbf38",
  "7faadc14113110a8443c0f81a2b5fc36590d1791"
 ]);
});
test("D93 complete six-item coverage and 6 criteria each",()=>{
 const result=check(mapping);
 assert.equal(result.itemCount,6);
 assert.deepEqual(mapping.items.map(x=>x.id),D93_ITEM_IDS);
 assert.deepEqual(mapping.acceptance_criteria_ids,D93_CRITERIA);
 assert.equal(mapping.items.reduce((n,x)=>n+x.acceptance_criteria.length,0),36);
 assert.equal(result.cognitiveProbes,12);
});
test("D93 two conditional and four rewrite recommendations are not approvals",()=>{
 const result=check(mapping);
 assert.equal(result.conditionalTrialCount,2);
 assert.equal(result.rewriteRequiredCount,4);
 assert.equal(result.formalDecision,"PENDING");
 assert.equal(result.typeId,null);
 assert.equal(result.classificationStatus,"WITHHELD");
 assert.equal(result.publicationApproved,false);
 assert.equal(result.psychometricEvidence,false);
 assert.equal(mapping.decisions.issue_bank_v03,false);
});
test("D93 item texts and construct IDs exactly match unmodified bank",()=>{
 for(const item of mapping.items){
  const source=bank.items.find(x=>x.id===item.id);
  assert.ok(source);
  assert.equal(item.source_text,source.text);
  assert.equal(item.preferred_option,item.facet==="related"?"BR1":"CP1");
 }
 assert.equal(mapping.decisions.old_q30_and_v02_frozen,true);
});
test("D93 hypothetical scenarios remain untested, not actual participants",()=>{
 assert.equal(mapping.synthetic_interpretation_checks.length,5);
 assert.ok(mapping.synthetic_interpretation_checks.every(x=>x.evidence==="UNTESTED"));
 assert.equal(mapping.decisions.participant_data_collection,false);
});
test("D93 unapproved text changes, type issuance and data collection cannot pass",()=>{
 for(const mutate of [
  x=>x.items[0].source_text="無断で設問変更",
  x=>x.items[0].id="B-R99",
  x=>x.items[0].editorial_disposition="APPROVED",
  x=>x.items[0].acceptance_criteria[0].editorial_judgment="ACCEPTED",
  x=>x.items[1].overlap_items=["C-P01"],
  x=>x.sources[0].git_blob_sha="invalid",
  x=>x.synthetic_interpretation_checks[0].evidence="PROVEN",
  x=>x.decisions.revised_wording_approved=true,
  x=>x.decisions.issue_bank_v03=true,
  x=>x.decisions.participant_data_collection=true,
  x=>x.decisions.type_id="T01",
  x=>x.decisions.production_approved=true
 ]) {
  const changed=copy();mutate(changed);
  assert.throws(()=>check(changed),TypeError);
 }
});
test("D93 mapping logic does not use storage, network or type-scoring engine",()=>{
 const code=read("projects/kidp/life-design-lab/a05/item-construct-d93.mjs");
 for(const forbidden of [
  "localStorage","sessionStorage","indexedDB","sendBeacon",
  "XMLHttpRequest","fetch(","document.cookie","scoreBCPilot("
 ]) assert.equal(code.includes(forbidden),false,forbidden);
 assert.equal(mapping.decisions.empirical_validity,"NOT_ESTABLISHED");
});
