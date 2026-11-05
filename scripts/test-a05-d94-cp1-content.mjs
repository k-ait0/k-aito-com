import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {validateD94Coverage,D94_SCHEMA,D94_ITEM_IDS,D94_PAIRS}
 from "../projects/kidp/life-design-lab/a05/cp1-content-review-d94.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const paths=[
 "docs/A05_D93_ITEM_CONSTRUCT_MAPPING_20261105.json",
 "docs/A05_D92_CONSTRUCT_CHOICE_MATRIX_20261105.json",
 "docs/A05_D90_BC_PILOT_0_2_20261105.json"
];
const raws=paths.map(read);
const [d93,matrix,bank]=raws.map(JSON.parse);
const review=JSON.parse(read("docs/A05_D94_CP1_CONTENT_COVERAGE_20261105.json"));
const blob=t=>createHash("sha1").update("blob "+Buffer.byteLength(t)+"\0").update(t).digest("hex");
const sources=paths.map((path,i)=>({path,sha:blob(raws[i])}));
const run=r=>validateD94Coverage(r,bank,matrix,d93,sources);
const altered=fn=>{const copy=structuredClone(review);fn(copy);return copy;};
test("D94 source lineage is hash-pinned and all upstream banks remain frozen",()=>{
 assert.equal(review.schema,D94_SCHEMA);
 assert.deepEqual(sources.map(x=>x.sha),[
  "7bd5d652217cdd58c64c5dd99a9f266b3db40e88",
  "1e867e0506c5d1fde3fb78a67e37c4987dce47d7",
  "69fd5e3d31cc40a54f6e9e63dade60c65ffcbf38"
 ]);
 assert.deepEqual(review.sources.map(x=>x.git_blob_sha),sources.map(x=>x.sha));
 assert.equal(bank.items.length,12);
 assert.equal(review.decision.do_not_modify_d90_bank,true);
});
test("D94 all three original items reviewed without changing their text",()=>{
 const result=run(review);
 assert.equal(result.reviewedItems,3);
 assert.deepEqual(review.items.map(x=>x.id),D94_ITEM_IDS);
 for(const item of review.items){
  assert.equal(item.text,bank.items.find(q=>q.id===item.id).text);
  assert.equal(item.status,"BLOCK_FOR_CP1_AGGREGATE");
  assert.equal(item.source_unchanged,true);
  assert.ok(item.method_risks.length>=1);
 }
});
test("D94 exactly 3 pairwise reviews, all qualitative, never similarity percentages",()=>{
 const result=run(review);
 assert.equal(result.assessedPairs,3);
 assert.deepEqual(review.pairs.map(x=>x.ids.join("/")),D94_PAIRS);
 assert.equal(review.method.semantic_overlap_is_numeric,false);
 assert.equal(review.method.psychometric_analysis_performed,false);
 assert.equal(review.method.item_response_data_collected,false);
});
test("D94 no falsely distinct third content domain and no aggregate scoring",()=>{
 const result=run(review);
 assert.equal(result.distinctThirdDomainIdentified,false);
 assert.equal(result.approvedNumericScore,false);
 assert.equal(review.candidate_domains[2].status,"NOT_IDENTIFIED");
 assert.ok(review.architecture_options.every(x=>x.numeric_score_allowed===false));
 assert.equal(review.decision.two_item_mean_allowed,false);
 assert.equal(review.decision.three_item_mean_allowed,false);
});
test("D94 two editorial probes are not a new bank nor historical question IDs",()=>{
 assert.equal(review.draft_editorial_prompts.length,2);
 assert.ok(review.draft_editorial_prompts.every(x=>
  x.status==="NOT_A_BANK_ITEM" && x.never_reuse_old_id===true));
 assert.equal(review.decision.next_editorial_option,"O2");
 assert.equal(review.decision.option_approved_by_owner,false);
 assert.equal(review.decision.new_items_formally_approved,false);
 assert.equal(review.decision.do_not_create_v03,true);
});
test("D94 participant / scoring / publication guards reject unauthorized changes",()=>{
 const mutations=[
  x=>x.decision.option_approved_by_owner=true,
  x=>x.decision.three_item_mean_allowed=true,
  x=>x.decision.two_item_mean_allowed=true,
  x=>x.decision.do_not_modify_d90_bank=false,
  x=>x.decision.no_participant_collection=false,
  x=>x.decision.production_release_allowed=true,
  x=>x.decision.no_type_id=false,
  x=>x.method.item_response_data_collected=true,
  x=>x.pairs[1].ids=["C-P01","C-P02"],
  x=>x.items[1].text="無断改稿",
  x=>x.candidate_domains[2].status="ESTABLISHED",
  x=>x.architecture_options[1].numeric_score_allowed=true,
  x=>x.draft_editorial_prompts[0].status="PUBLISHED",
  x=>x.cognitive_scenarios[0].empirical_evidence="PROVEN"
 ];
 for(const change of mutations)assert.throws(()=>run(altered(change)),TypeError);
});
test("D94 future- and present-orientation coexistence is not turned into a type",()=>{
 assert.ok(review.cognitive_scenarios.some(x=>x.tests==="IMPLICIT_FUTURE_CONTRAST"));
 assert.ok(review.cognitive_scenarios.every(x=>x.empirical_evidence==="NONE"));
 assert.equal(review.decision.no_rescoring_legacy,true);
 assert.equal(review.decision.no_type_id,true);
 assert.equal(run(review).typeId,null);
 assert.equal(run(review).humanApproval,"PENDING");
});
test("D94 isolated module has no network, answer collection or persistence",()=>{
 const source=read("projects/kidp/life-design-lab/a05/cp1-content-review-d94.mjs");
 for(const name of ["localStorage","sessionStorage","indexedDB","fetch(",
  "XMLHttpRequest","sendBeacon","document.cookie","scoreBCPilot("])
  assert.equal(source.includes(name),false,name);
 assert.equal(review.status,"EDITORIAL_ANALYSIS_ONLY_UNVALIDATED");
});
