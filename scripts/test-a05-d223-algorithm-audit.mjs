import test from "node:test";
import assert from "node:assert/strict";
import {auditInventory,runSyntheticStability,buildReport} from "./a05-d223-audit-and-simulate.mjs";
const ids=x=>x.audit.items.map(q=>q.id);
test("D223 consumes and inventories all 50 editorial questions and exactly the 18 previously flagged pairs",()=>{
 const x=auditInventory({forms:32});
 assert.equal(x.items.length,50);
 assert.deepEqual(x.summary.axes,{A:12,B:12,C:12,D:12,E:2});
 assert.equal(x.summary.human_unvalidated,50);
 assert.equal(x.summary.unapproved,50);
 assert.equal(x.summary.same_axis_pairs_review_universe,265);
 assert.equal(x.summary.preexisting_flagged_pairs,18);
 assert.equal(x.summary.p0_pair_exposure.length,3);
 assert.equal(new Set(x.items.map(q=>q.id)).size,50);
 assert.equal(x.items.filter(q=>q.production_scoring_approved).length,0);
 for(const q of x.items){
  assert.ok(q.residual_risk.trim());
  assert.ok(q.stem.trim()&&q.left.trim()&&q.right.trim());
  assert.ok(q.proposed_next_action);
 }
});
test("D213 research-only hold cannot be bypassed or mistaken for validated scoring",()=>{
 const x=auditInventory({forms:32});
 assert.deepEqual(x.summary.scoring_hold_items,[
  "A05-V1-31","A05-V1-32","A05-V1-36","A05-V1-49","A05-V1-50"
 ]);
 const c35=x.items.find(q=>q.id==="A05-V1-35");
 assert.equal(c35.scoring_hold,null);
 assert.equal(c35.priority,"P0_REVIEW");
 assert.ok(x.summary.p0_pair_exposure.find(p=>p.pair.includes("A05-V1-31")).forms_either>=0);
});
test("D223 manifest scan keeps C timing contrast together for all sampled forms",()=>{
 const x=auditInventory({forms:256});
 const pair=x.summary.p0_pair_exposure.find(p=>p.pair[0]==="A05-V1-31");
 assert.equal(pair.forms_either,pair.forms_both);
 assert.ok(pair.exposure_both_fraction>0);
 assert.equal(x.summary.scoring_hold_items.length,5);
});
test("D223 synthetic model is deterministic and does not imply human validation",()=>{
 const a=runSyntheticStability({forms:24,repetitions:2});
 const b=runSyntheticStability({forms:24,repetitions:2});
 assert.deepEqual(a,b);
 assert.equal(a.scenarios.length,4);
 assert.equal(a.input.no_validity_claim,true);
 assert.match(a.status,/SYNTHETIC_ONLY/);
 for(const x of a.scenarios){
  assert.equal(x.synthetic_people,32);
  assert.equal(x.form_sets_per_person,24);
  for(const field of [
   "strictly_stable_person_fraction",
   "people_with_multiple_strict_types_fraction",
   "strict_unclassified_form_fraction",
   "strict_type_disagrees_with_simulated_target_fraction",
   "borderline_form_fraction",
   "reference_in_candidate_set_fraction"
  ])assert.ok(x[field]>=0&&x[field]<=1,field+" "+x[field]);
  assert.ok(x.mean_candidate_types>=1&&x.mean_candidate_types<=16);
  assert.ok(x.max_distinct_strict_types_per_person>=0);
 }
 const strong=a.scenarios.find(x=>x.scenario==="strong_separable");
 assert.equal(strong.strictly_stable_person_fraction,1);
 assert.equal(strong.strict_type_disagrees_with_simulated_target_fraction,0);
});
test("D223 report is marked research-only and never presents UI scores or approved weights",()=>{
 const out=buildReport({forms:16,repetitions:1});
 assert.equal(out.audit.items.length,50);
 assert.equal(out.simulation.scenarios.length,4);
 assert.ok(out.caveats.some(x=>x.includes("No real participant data")));
});
