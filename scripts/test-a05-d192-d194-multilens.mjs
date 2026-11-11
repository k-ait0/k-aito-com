import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const json=path=>JSON.parse(read(path));
const blob=path=>{const s=read(path);return createHash("sha1").update("blob "+Buffer.byteLength(s)+"\0").update(s).digest("hex")};
const d192=json("research/a05/d192-ninetysix-multilens-risk-register.json");
const d193=json("research/a05/d193-family-aware-sampling-enumeration.json");
const d190=json("research/a05/d190-ninetysix-pattern-cross-family-audit.json");
const docs=[
"research/a05/d186-broad-patterns-axis-A.json",
"research/a05/d187-broad-patterns-axis-B.json",
"research/a05/d188-broad-patterns-axis-C.json",
"research/a05/d189-broad-patterns-axis-D.json"
].map(json);
const all=docs.flatMap(x=>x.questions);
const report=read("docs/A05_V2_D194_MULTILENS_96QUESTIONS_AND_DRAW_DIAGNOSIS_20261111.md");
const choose=(n,k)=>{let v=1;for(let i=1;i<=k;i++)v*=((n-i+1)/i);return Math.round(v);};
const eps=(a,b)=>Math.abs(a-b)<1e-12;
test("Eight editorial research lenses explicitly separated from statistical validity",()=>{
 assert.equal(d192.framework.length,8);
 assert.ok(d192.rubric_note.includes("not"));
 assert.equal(d192.real_response_records,0);
 assert.equal(d192.production_modified,false);
});
test("Exactly 32 family decisions and 96 item-level lens records",()=>{
 assert.equal(d192.family_decisions.length,32);
 assert.equal(d192.question_lenses.length,96);
 assert.deepEqual(new Set(d192.question_lenses.map(x=>x.id)),new Set(all.map(x=>x.id)));
 assert.deepEqual(new Set(d192.family_decisions.map(x=>x.family_id)),new Set(d190.families.map(x=>x.family_id)));
});
test("One representative question per family, chosen from actual question IDs",()=>{
 const ids=new Map(all.map(x=>[x.id,x]));
 for(const fam of d192.family_decisions){
  const q=ids.get(fam.reference_question_id);assert.ok(q,fam.family_id);
  assert.equal(q.family_id,fam.family_id);
  assert.ok([1,2,3].includes(fam.priority_for_cognitive_pretest));
  assert.ok(fam.respondent_check.length>15&&fam.rewrite_direction.length>15);
  assert.equal(fam.confirmed_independence,false);
 }
});
test("All 96 have explicit concept, polarity, fairness, cognitive, format, data readiness lenses",()=>{
 for(const x of d192.question_lenses){
  assert.ok(x.lenses.semantic_overlap&&x.lenses.construct_purity);
  assert.ok(x.lenses.bipolarity&&x.lenses.fairness_and_opportunity);
  assert.ok(x.lenses.cognitive_load&&x.lenses.response_format&&x.lenses.data_readiness);
  assert.equal(x.lenses.data_readiness.real_respondents,0);
  assert.equal(x.approved_scored,false);
 }
});
test("Manual group triage counts total 32 and preserve conservative priorities",()=>{
 const c=d192.counts.triage_by_family;assert.equal(Object.values(c).reduce((a,b)=>a+b,0),32);
 assert.equal(c.CONTENT_TEST,5);assert.equal(c.NEAR_DUPLICATE,19);
 assert.equal(c.AXIS_CONTAMINATION,4);assert.equal(c.BIPOLARITY_FAILURE,2);assert.equal(c.METHOD_ONLY,2);
 assert.deepEqual(d192.family_decisions.filter(x=>x.priority_for_cognitive_pretest===1).map(x=>x.reference_question_id),
 ["A-X08","A-X10","B-X12","C-X07","C-X10","D-X05"]);
});
test("Caution flags include B-axis possible coexistence and C-axis E confound",()=>{
 const q=d192.question_lenses;
 assert.equal(q.filter(x=>x.automated_text_cues.includes("CONSTRUCT_MAY_BE_NON_BIPOLAR")).length,24);
 assert.equal(q.filter(x=>x.automated_text_cues.includes("AXIS_E_FINANCIAL")).length,3);
 assert.equal(q.filter(x=>x.automated_text_cues.includes("EQUALIZED_HYPOTHETICAL_CONDITIONS")).length,67);
 assert.equal(q.filter(x=>x.automated_text_cues.includes("UNBALANCED_POLARITY_VERB")).length,13);
});
test("Manual item cue warnings refer to existing question text",()=>{
 const ids=new Set(all.map(x=>x.id));
 assert.ok(d192.question_lenses.every(x=>ids.has(x.id)&&x.lenses.cognitive_load.stem_length>0));
});
test("Source blobs for D192 and its underlying all-96 corpus are exact",()=>{
 for(const [path,sha] of Object.entries(d192.source_shas))assert.equal(sha,blob(path),path);
});
test("Exact total C(12,7)=792 and coverage distribution 4/5/6 families",()=>{
 assert.equal(choose(12,7),792);
 assert.equal(d193.simple_random.possible_seven_question_sets,792);
 assert.deepEqual(d193.simple_random.distinct_family_count,{"4":120,"5":480,"6":192});
 assert.ok(eps(d193.simple_random.any_missing_family_probability,600/792));
});
test("Stratified draw yields six families and equal item inclusion probabilities",()=>{
 assert.equal(d193.family_stratified_prototype.equally_weighted_branch_outcomes,384);
 assert.equal(d193.family_stratified_prototype.unique_question_sets,192);
 assert.equal(d193.family_stratified_prototype.all_six_families_included_probability,1);
 assert.ok(eps(d193.family_stratified_prototype.each_item_marginal_inclusion,7/12));
 assert.ok(eps(d193.simple_random.each_item_marginal_inclusion,7/12));
 for(const m of d193.verification.strat_item_probabilities)assert.ok(eps(m,7/12));
});
test("Sampling analysis is conditional only, with zero changes to 50/30 bank",()=>{
 assert.equal(d193.fixed.bank_total,50);
 assert.equal(d193.fixed.draw_total,30);
 assert.equal(d193.fixed.E_bank_draw,2);
 assert.equal(d193.scope.no_item_bank_change,true);
 assert.equal(d193.scope.no_production_scoring_change,true);
 assert.equal(d193.scope.real_respondents,0);
});
test("Report contains findings, cautious interpretation and next real work",()=>{
 for(const phrase of ["96問","32仮系統","同じ・等しい","A-X08","B-X12","C-X07","D-X05","792","層","未充足32枠","実回答者検証0"])
  assert.ok(report.includes(phrase),"Missing report text "+phrase);
 assert.ok(report.includes("採点問追加0"));
});
