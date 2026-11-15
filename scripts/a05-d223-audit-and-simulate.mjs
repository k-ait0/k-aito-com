/**
 * A05 D223: inspect all 50 editorial items and model 30-of-50 form stability.
 * Research-only. Synthetic answers are NOT respondent records or evidence of validity.
 * Does not modify the questionnaire, scoring or published site.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {fileURLToPath,pathToFileURL} from "node:url";
import {dirname,resolve} from "node:path";
import {BANK,drawResearchManifest} from "./a05-d208-research-sampler.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const triage=JSON.parse(readFileSync(resolve(root,"research/a05/d211-semantic-collision-triage.json"),"utf8"));
const decisions=JSON.parse(readFileSync(resolve(root,"research/a05/d213-p0-editorial-decisions.json"),"utf8"));
const AXES=["A","B","C","D"],TOTAL_AXES=[...AXES,"E"];
const byId=new Map(BANK.items.map(q=>[q.bank_id,q]));
const itemNumber=id=>Number(id.slice(-2));
const round=(x,d=5)=>Number(x.toFixed(d));
const groups=items=>Object.fromEntries(TOTAL_AXES.map(a=>[a,items.filter(q=>q.axis===a)]));
const hash=s=>createHash("sha256").update(s).digest();
function assertData(){
 assert.equal(BANK.items.length,50);
 assert.equal(triage.items_checked,50);
 assert.equal(triage.same_axis_pairs_count,265);
 assert.equal(triage.prioritized.length,18);
 assert.equal(decisions.findings.length,3);
 for(const p of triage.prioritized){
  assert.equal(p.ids.length,2);
  for(const id of p.ids)assert.ok(byId.has(id));
 }
 for(const p of decisions.findings){
  for(const n of p.pair)assert.ok(byId.has("A05-V1-"+String(n).padStart(2,"0")));
 }
 assert.ok(BANK.items.every(q=>!q.production_scoring_approved&&!q.user_formally_approved));
}
export function auditInventory({forms=128}={}){
 assertData();
 if(!Number.isInteger(forms)||forms<1||forms>2048)throw Error("invalid forms");
 const targeted=new Map(BANK.items.map(q=>[q.bank_id,[]]));
 for(const pair of triage.prioritized){
  for(const id of pair.ids)targeted.get(id).push({other:pair.ids.find(x=>x!==id),priority:pair.priority,risk:pair.risk});
 }
 const holds=new Map();
 for(const finding of decisions.findings){
  const ids=finding.pair.map(n=>"A05-V1-"+String(n).padStart(2,"0"));
  if(finding.decision==="PAIRED_CONTRAST_RESEARCH_ONLY"||finding.decision==="AUXILIARY_DESCRIPTIVE_ONLY"){
   for(const id of ids)holds.set(id,finding.decision);
  }else if(finding.decision==="KEEP_35_AS_REFERENCE_MARK_36_REPLACEMENT_NEEDED"){
   holds.set(ids[1],finding.decision);
  }
 }
 const rows=BANK.items.map(q=>{
  const pairs=targeted.get(q.bank_id);
  return {
   id:q.bank_id,axis:q.axis,family:q.proposed_semantic_family||"E_AUX",
   status:"HUMAN_VALIDATION_NOT_DONE",
   primary_axis_confirmed:false,
   production_scoring_approved:q.production_scoring_approved,
   priority:holds.has(q.bank_id)?"P0_HOLD":pairs.some(p=>p.priority==="P0")?"P0_REVIEW":
    pairs.some(p=>p.priority==="P1")?"P1":pairs.some(p=>p.priority==="P2")?"P2":"P3_UNREVIEWED",
   scoring_hold:holds.get(q.bank_id)||null,
   paired_review:pairs,
   residual_risk:q.known_residual_risk||"NOT_RECORDED",
   proposed_next_action:holds.has(q.bank_id)?"HOLD_SCORING_PENDING_EDIT_OR_RESEARCH":
    pairs.length?"COMPARE_RESPONSE_REASON_WITH_MATCHED_PAIR":"REVIEW_AXIS_FIT_AND_RESPONSE_REASON",
   stem:q.stem,left:q.left,right:q.right
  };
 });
 const formsList=Array.from({length:forms},(_,i)=>drawResearchManifest("D223-audit-form-"+String(i).padStart(4,"0")));
 const p0Pairs=decisions.findings.map(f=>{
  const ids=f.pair.map(n=>"A05-V1-"+String(n).padStart(2,"0"));
  const both=formsList.filter(m=>ids.every(id=>m.questions.some(q=>q.id===id))).length;
  const one=formsList.filter(m=>ids.some(id=>m.questions.some(q=>q.id===id))).length;
  return {pair:ids,decision:f.decision,forms_both:both,forms_either:one,exposure_both_fraction:round(both/forms)};
 });
 const exposure=Object.fromEntries(BANK.items.map(q=>[q.bank_id,0]));
 for(const m of formsList)for(const q of m.questions)exposure[q.id]++;
 const pairCounts=triage.prioritized.map(pair=>{
  const together=formsList.filter(m=>pair.ids.every(id=>m.questions.some(q=>q.id===id))).length;
  return {ids:pair.ids,priority:pair.priority,together,share:round(together/forms)};
 });
 const summary={
  items:rows.length,axes:Object.fromEntries(TOTAL_AXES.map(a=>[a,rows.filter(q=>q.axis===a).length])),
  unapproved:rows.filter(q=>!q.production_scoring_approved).length,
  human_unvalidated:rows.filter(q=>q.status==="HUMAN_VALIDATION_NOT_DONE").length,
  same_axis_pairs_review_universe:triage.same_axis_pairs_count,
  preexisting_flagged_pairs:triage.prioritized.length,
  flagged_unique_items:rows.filter(q=>q.paired_review.length>0).length,
  scoring_hold_items:rows.filter(q=>q.scoring_hold).map(q=>q.id),
  priorities:Object.fromEntries(["P0_HOLD","P0_REVIEW","P1","P2","P3_UNREVIEWED"].map(p=>[p,rows.filter(q=>q.priority===p).length])),
  item_exposure_min:Math.min(...Object.values(exposure)),
  item_exposure_max:Math.max(...Object.values(exposure)),
  p0_pair_exposure:p0Pairs,
  all_flagged_pair_exposure:pairCounts
 };
 return {schema:"A05-D223-ITEM-AUDIT-1",status:"RESEARCH_ONLY_NOT_HUMAN_VALIDATION",source:{
  bank:BANK.schema,triage:triage.schema,editorial:decisions.schema,
  assumption:"All prior editorial risk notes are unverified hypotheses; pair classifications require respondent explanations."
 },forms_scanned:forms,summary,items:rows};
}
function directionsForType(index){
 const group=Math.floor(index/4),within=index%4;
 return [group>=2?1:-1,group%2===1?1:-1,within>=2?1:-1,within%2===1?1:-1];
}
function valueForItem(profile,repeat,scenario,q){
 if(q.axis==="E")return 4;
 const dir=profile.directions[AXES.indexOf(q.axis)];
 const noise=(hash("D223|"+profile.index+"|"+repeat+"|"+scenario.name+"|"+q.bank_id)[0]/255*2-1)*scenario.noise;
 let familyEffect=0;
 if(scenario.family){
  const f=hash("D223-family|"+profile.index+"|"+repeat+"|"+q.proposed_semantic_family)[0]/255*2-1;
  familyEffect=f*scenario.family;
 }
 return Math.max(1,Math.min(7,4+Math.round(dir*scenario.signal+noise+familyEffect)));
}
function normalize(stats){
 const signs=stats.map(x=>x.total===0?0:Math.sign(x.total));
 const unknown=signs.includes(0);
 let strict=null;
 if(!unknown){
  const group=(signs[0]>0?2:0)+(signs[1]>0?1:0);
  const within=(signs[2]>0?2:0)+(signs[3]>0?1:0);
  strict=group*4+within;
 }
 const clear=stats.map(x=>x.n>=5&&Math.abs(x.total)/(3*x.n)>1/3);
 return {strict,clear,signs,candidateCount:Math.pow(2,clear.filter(x=>!x).length)};
}
export function runSyntheticStability({forms=128,repetitions=8}={}){
 assertData();
 if(!Number.isInteger(forms)||forms<1||forms>2048||!Number.isInteger(repetitions)||repetitions<1||repetitions>50)throw Error("bad simulation range");
 const scenarios=[
  {name:"strong_separable",signal:2.8,noise:0.2,family:0},
  {name:"moderate_item_variation",signal:1.45,noise:1.7,family:0},
  {name:"near_midpoint",signal:0.55,noise:1.7,family:0},
  {name:"family_dependent",signal:1.3,noise:0.8,family:2.1}
 ];
 const manifests=Array.from({length:forms},(_,i)=>drawResearchManifest("D223-simulation-form-"+String(i).padStart(4,"0")));
 const indexed=manifests.map(m=>AXES.map(axis=>m.questions.filter(q=>q.axis===axis).map(q=>q.id)));
 const reported=[];
 for(const scenario of scenarios){
  const totals={persons:0,assessments:0,strictUnclassified:0,strictDifferentFromLatent:0,
   strictStablePersons:0,personsWithDifferentStrictType:0,ambiguousForms:0,candidateCoversLatent:0,
   avgCandidates:0,formsWithOppositeFullBankAxis:0,axesCompared:0,maxDistinctStrictTypes:0};
  const topInstability=[];
  for(let t=0;t<16;t++){
   const profile={index:t,directions:directionsForType(t)};
   for(let rep=0;rep<repetitions;rep++){
    totals.persons++;
    const responses=Object.fromEntries(BANK.items.map(q=>[q.bank_id,valueForItem(profile,rep,scenario,q)]));
    const full=AXES.map(axis=>{
     const vals=BANK.items.filter(q=>q.axis===axis).map(q=>responses[q.bank_id]-4);
     return Math.sign(vals.reduce((s,v)=>s+v,0));
    });
    const seenStrict=new Set();
    let wrong=0,ambiguous=0,coverage=0;
    for(const form of indexed){
     const stats=form.map(ids=>{
      const total=ids.reduce((s,id)=>s+(responses[id]-4),0);
      return {total,n:ids.length};
     });
     const result=normalize(stats);
     totals.assessments++;
     if(result.strict===null){totals.strictUnclassified++;}
     else{
      seenStrict.add(result.strict);
      if(result.strict!==t){totals.strictDifferentFromLatent++;wrong++;}
     }
     const isAmbiguous=result.clear.some(c=>!c);
     if(isAmbiguous){totals.ambiguousForms++;ambiguous++;}
     totals.avgCandidates+=result.candidateCount;
     const contains=stats.every((s,i)=>!result.clear[i]||Math.sign(s.total)===profile.directions[i]);
     if(contains){totals.candidateCoversLatent++;coverage++;}
     for(let a=0;a<4;a++){
      if(full[a]!==0&&stats[a].total!==0){
       totals.axesCompared++;
       if(Math.sign(stats[a].total)!==full[a])totals.formsWithOppositeFullBankAxis++;
      }
     }
    }
    if(seenStrict.size===1&&totals.strictUnclassified>=0){
     // A respondent counts as stable only if all forms classify to a single type.
     const strictlyClassified=indexed.every(form=>form.every(ids=>ids.reduce((s,id)=>s+responses[id]-4,0)!==0));
     if(strictlyClassified)totals.strictStablePersons++;
    }
    if(seenStrict.size>1)totals.personsWithDifferentStrictType++;
    totals.maxDistinctStrictTypes=Math.max(totals.maxDistinctStrictTypes,seenStrict.size);
    if(seenStrict.size>1&&topInstability.length<5)
     topInstability.push({latentType:"T"+String(t+1).padStart(2,"0"),repeat:rep,distinctStrictTypes:seenStrict.size,wrongFormCount:wrong,ambiguousFormCount:ambiguous,coverageFormCount:coverage});
   }
  }
  reported.push({
   scenario:scenario.name,input_model:{signal:scenario.signal,noise:scenario.noise,family:scenario.family},
   synthetic_people:totals.persons,form_sets_per_person:forms,
   strictly_stable_person_fraction:round(totals.strictStablePersons/totals.persons),
   people_with_multiple_strict_types_fraction:round(totals.personsWithDifferentStrictType/totals.persons),
   strict_unclassified_form_fraction:round(totals.strictUnclassified/totals.assessments),
   strict_type_disagrees_with_simulated_target_fraction:round(totals.strictDifferentFromLatent/totals.assessments),
   borderline_form_fraction:round(totals.ambiguousForms/totals.assessments),
   reference_in_candidate_set_fraction:round(totals.candidateCoversLatent/totals.assessments),
   mean_candidate_types:round(totals.avgCandidates/totals.assessments),
   subset_axis_sign_differs_from_full50_fraction:totals.axesCompared?round(totals.formsWithOppositeFullBankAxis/totals.axesCompared):null,
   max_distinct_strict_types_per_person:totals.maxDistinctStrictTypes,
   example_instabilities:topInstability
  });
 }
 return {schema:"A05-D223-SYNTHETIC-STABILITY-1",
  status:"SYNTHETIC_ONLY_NO_REAL_HUMAN_RESPONSES",input:{forms,repetitions,profiles:16,
  answer_scale:"7-level, item- and family-level deterministic perturbations; true types are generated assumptions",
  reference:"D222 provisional 1/3 boundary; D219 old sign-only type mapping",
  no_validity_claim:true},scenarios:reported};
}
export function buildReport(options={}){
 return {schema:"A05-D223-RESEARCH-AUDIT-SUMMARY-1",audit:auditInventory(options),simulation:runSyntheticStability(options),
  caveats:[
   "Automated inventory of 50 items and 18 already-flagged pairs is not independent semantic/cognitive review.",
   "No real participant data was read, created, or inferred.",
   "Simulation models assumed item response profiles, not measurement validity or human test-retest reliability.",
   "C31/32, C36, E49/50 retain their D213 score hold. Neither questions nor demo scoring is changed.",
   "Any 80-point assessment is about research method and code quality, not psychometric validation."
  ]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=buildReport();
 const target=resolve(root,"research/a05/generated/d223-algorithm-audit.json");
 mkdirSync(dirname(target),{recursive:true});
 writeFileSync(target,JSON.stringify(report,null,2)+"\n");
 const {summary}=report.audit;
 const tiny={file:target,items:summary.items,flagged_pairs:summary.preexisting_flagged_pairs,
  hold_ids:summary.scoring_hold_items,scenarios:report.simulation.scenarios.map(x=>({
   scenario:x.scenario,strictly_stable_person_fraction:x.strictly_stable_person_fraction,
   people_with_multiple_strict_types_fraction:x.people_with_multiple_strict_types_fraction,
   borderline_form_fraction:x.borderline_form_fraction,
   reference_in_candidate_set_fraction:x.reference_in_candidate_set_fraction}))};
 console.log(JSON.stringify(tiny,null,2));
}
