/**
 * A05 D95: pre-research CP1 two-domain protocol audit.
 * Static description only. No participant interaction, score, or study execution.
 */
export const D95_SCHEMA="A05-D95-CP1-DOMAIN-PROTOCOL-1";
export const D95_DOMAINS=Object.freeze(["process_value","ordinary_experience"]);
export const D95_DECISIONS=Object.freeze(["R1","R2","R3","R4"]);
export const D95_SOURCE_PATHS=Object.freeze([
 "docs/A05_D94_CP1_CONTENT_COVERAGE_20261105.json",
 "docs/A05_D93_ITEM_CONSTRUCT_MAPPING_20261105.json",
 "docs/A05_D90_BC_PILOT_0_2_20261105.json"
]);
const seq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const reject=reason=>{throw new TypeError("D95 protocol invalid: "+reason)};
const substantial=v=>typeof v==="string"&&v.trim().length>=7;
const allTrue=(obj,keys)=>keys.every(key=>obj?.[key]===true);
const risk=["PLEASURE","SATISFACTION","TIME_RESOURCE","ATTENTION",
 "FUTURE_CONTRAST","CONCEPT_OVERLAP","NONE"];
export function validateD95Protocol(d95,d94,d93,d90,shaSources){
 if(!d95||d95.schema!==D95_SCHEMA||
    d95.status!=="PRE_RESEARCH_PLANNING_UNAPPROVED")reject("schema");
 if(!d94||d94.schema!=="A05-D94-CP1-CONTENT-COVERAGE-1"||
    d94.decision?.next_editorial_option!=="O2"||
    d94.decision?.option_approved_by_owner!==false)reject("D94 source gate");
 if(!d93||d93.schema!=="A05-D93-ITEM-TO-CONSTRUCT-MAP-1"||
    d93.decisions?.construct_selection_formally_approved!==false)
    reject("D93 approval gate");
 if(!d90||d90.schema!=="A05-BC-PILOT-0.2-draft"||
    d90.scoring?.type_id!==null||
    d90.scoring?.classification_status!=="WITHHELD")reject("old bank");
 if(!Array.isArray(d95.sources)||!Array.isArray(shaSources)||
    d95.sources.length!==3||shaSources.length!==3)reject("source length");
 for(let i=0;i<3;i++){
  const source=d95.sources[i],trusted=shaSources[i];
  if(source.path!==D95_SOURCE_PATHS[i]||trusted?.path!==source.path||
     source.git_blob_sha!==trusted.sha||
     !/^[a-f0-9]{40}$/.test(trusted.sha))reject("source blob "+i);
 }
 const limits=d95.limitations;
 if(!limits||limits.content_validity_evidence!=="NONE"||
    !["actual_interviews_conducted","consent_obtained","personal_data_collected",
      "quantitative_scale_validated","score_inferred","estimated_population_prevalence",
      "case_scores_generated"].every(k=>limits[k]===false))
   reject("evidence inflation");
 if(!Array.isArray(d95.domains)||d95.domains.length!==2||
    !seq(d95.domains.map(x=>x.id),D95_DOMAINS))reject("domains");
 for(let i=0;i<2;i++){
  const draft=d94.draft_editorial_prompts[i],item=d95.domains[i];
  if(item.prompt_id!==draft.id||item.draft_prompt!==draft.text||
     item.status!=="NOT_A_BANK_ITEM"||
     item.distinctness_status!=="NOT_ESTABLISHED"||
     item.label!==d94.candidate_domains[i].label||
     !substantial(item.intended_object)||!substantial(item.ambiguity)||
     !Array.isArray(item.exclude)||item.exclude.length<3)
    reject("domain trace "+item.id);
 }
 const cases=d95.contrast_cases;
 if(!Array.isArray(cases)||cases.length!==8||
   new Set(cases.map(x=>x.id)).size!==8||
   !seq(cases.map(x=>x.id),["CX1","CX2","CX3","CX4","CX5","CX6","CX7","CX8"])||
   cases.some(x=>x.evidence!=="SYNTHETIC_ONLY"||
     !substantial(x.case)||!substantial(x.intended_probe)))
  reject("synthetic counterexamples");
 const protocol=d95.interview_protocol;
 if(!protocol||protocol.status!=="TEMPLATE_ONLY_NO_RECRUITMENT"||
    protocol.recruitment_state!=="NOT_STARTED"||
    protocol.participant_count!==0||
    !substantial(protocol.sample_strategy)||
    !substantial(protocol.recording_plan))reject("recruitment gate");
 if(!Array.isArray(protocol.session_steps)||protocol.session_steps.length!==8||
    !seq(protocol.session_steps.map(x=>x.id),
     ["I01","I02","I03","I04","I05","I06","I07","I08"])||
    protocol.session_steps.some(x=>!substantial(x.instruction)))
   reject("session sequence");
 if(!Array.isArray(protocol.probes)||protocol.probes.length!==9||
    new Set(protocol.probes.map(x=>x.id)).size!==9||
    !seq(protocol.probes.map(x=>x.id),
     ["P01","P02","P03","P04","P05","P06","P07","P08","P09"])||
    protocol.probes.some(x=>!substantial(x.text)||!substantial(x.expected_observation)))
   reject("interview probes");
 const coding=d95.coding_template;
 if(!coding||coding.status!=="BLANK_NOT_REAL_PARTICIPANT_DATA"||
    coding.field_schema_approved!==false||
    !Array.isArray(coding.actual_records)||coding.actual_records.length!==0||
    !Array.isArray(coding.fields)||!coding.fields.includes("approved_consent_reference")||
    !coding.fields.includes("researcher_memo")||
    !Array.isArray(coding.permitted_issue_codes)||
    !seq(coding.permitted_issue_codes,risk)||
    !Array.isArray(coding.fields_not_to_collect_by_default)||
    coding.fields_not_to_collect_by_default.length<3)
   reject("coding template may collect data");
 const outcomes=d95.interpretation_decision_tree;
 if(!Array.isArray(outcomes)||outcomes.length!==4||
    !seq(outcomes.map(x=>x.id),D95_DECISIONS)||
    new Set(outcomes.map(x=>x.next)).size!==4||
    outcomes.some(x=>x.numeric_scoring!==false||x.approval!=="PENDING"||
      !substantial(x.trigger)||!substantial(x.next)))
   reject("unapproved decision tree");
 if(!Array.isArray(d95.gate_checklist)||d95.gate_checklist.length!==5||
   !seq(d95.gate_checklist.map(g=>g.id),["G1","G2","G3","G4","G5"])||
   d95.gate_checklist.some(x=>x.status!=="PENDING"||!substantial(x.required)))
   reject("human approval gates");
 const flags=d95.guardrails;
 if(!allTrue(flags,["no_study_execution","no_recruitment",
      "no_personal_data_persistence","old_bank_immutable","no_v03_issue",
      "no_type_id","no_two_item_mean","no_three_item_mean",
      "no_compatibility_scores","no_production_publication",
      "no_owner_approval_inferred"]))
   reject("safety guardrails");
 if(!Array.isArray(d95.references)||d95.references.length<2||
   d95.references.some(x=>!/^https:\/\/(www\.)?(cdc\.gov|pubmed\.ncbi\.nlm\.nih\.gov)\//.test(x.url)))
  reject("missing or mismatched protocol references");
 return Object.freeze({
  schema:D95_SCHEMA,
  proposedDomains:2,
  hypotheticalCases:cases.length,
  interviewSteps:protocol.session_steps.length,
  cognitiveProbes:protocol.probes.length,
  conditionalOutcomes:outcomes.length,
  humanGatesPending:d95.gate_checklist.length,
  studyApproved:false,
  studyConducted:false,
  interviewsCollected:0,
  numericalScoresAllowed:false,
  typeId:null,
  psychometricEvidence:"NONE",
  nextStage:"HUMAN_REVIEW_BEFORE_RESEARCH"
 });
}
