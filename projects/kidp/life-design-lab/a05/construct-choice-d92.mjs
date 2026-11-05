/**
 * A05 D92: editorial construct-choice matrix validator.
 * NOT a psychometric evaluator, type system, scoring model, or release approval.
 */
export const D92_SCHEMA="A05-D92-CONSTRUCT-CHOICE-MATRIX-1";
export const D92_CRITERIA=Object.freeze([
  "value_not_state","concept_boundary","independent_high_low",
  "context_robustness","three_nonredundant_items","interpretation_limits"
]);
const D92_SCALES=Object.freeze(["B_related","C_present"]);
const decisions=Object.freeze(["MEETS","CONDITIONAL","FAILS"]);
const positionStates=Object.freeze(["EDITORIAL_PREFERRED_CONDITIONAL","NOT_SELECTED"]);
const has=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
function fail(message){throw new TypeError("Invalid A05 D92 matrix: "+message)}
export function validateD92ConstructMatrix(matrix) {
  if(!matrix||typeof matrix!=="object"||Array.isArray(matrix) ||
     matrix.schema!==D92_SCHEMA || matrix.status!=="EDITORIAL_COMPARISON_ONLY_HUMAN_DECISION_PENDING")
    fail("schema or approval status");
  if(!Array.isArray(matrix.criteria)||matrix.criteria.length!==6||
     !D92_CRITERIA.every((id,i)=>matrix.criteria[i]?.id===id &&
       typeof matrix.criteria[i].accept==="string"&&matrix.criteria[i].accept.length>=15))
    fail("criteria must be complete and ordered");
  if(!Array.isArray(matrix.scales)||matrix.scales.length!==2||
     !D92_SCALES.every((id,i)=>matrix.scales[i]?.id===id &&
      matrix.scales[i].formal_decision==="PENDING"))
    fail("scales or approvals");
  if(!Array.isArray(matrix.sources)||matrix.sources.length!==2||
     matrix.sources.some(x=>typeof x.path!=="string" || !/^[0-9a-f]{40}$/.test(x.git_blob_sha)))
    fail("source lineage");
  if(!Array.isArray(matrix.options)||matrix.options.length!==8)
    fail("option count");
  const optionIds=new Set();
  for(const option of matrix.options){
    if(!option || typeof option.id!=="string" || optionIds.has(option.id) ||
       !D92_SCALES.includes(option.scale)||!positionStates.includes(option.position)||
       typeof option.definition!=="string"||option.definition.length<15||
       typeof option.reason!=="string"||option.reason.length<15||
       !Array.isArray(option.excludes)||option.excludes.length===0||
       !Array.isArray(option.item_ids)||option.item_ids.length===0||
       !Array.isArray(option.checks)||option.checks.length!==6)
      fail("invalid option "+option?.id);
    optionIds.add(option.id);
    for(let i=0;i<6;i++){
      const check=option.checks[i];
      if(check?.criterion_id!==D92_CRITERIA[i]||
         !decisions.includes(check.status)||typeof check.rationale!=="string"||
         check.rationale.length<8)
        fail("criteria mismatch "+option.id);
    }
  }
  for(const scale of matrix.scales){
    if(!Array.isArray(scale.candidate_ids)||scale.candidate_ids.length!==4||
       new Set(scale.candidate_ids).size!==4 ||
       !Array.isArray(scale.item_ids)||scale.item_ids.length!==3)
      fail("candidate or item coverage");
    const options=matrix.options.filter(x=>x.scale===scale.id);
    if(options.length!==4 ||
       options.some(o=>!scale.candidate_ids.includes(o.id)) ||
       !scale.item_ids.every(id=>options[0].item_ids.concat(...options.slice(1).map(o=>o.item_ids)).includes(id)))
      fail("option-scales linkage");
    if(!scale.candidate_ids.includes(scale.editorial_preference) ||
       options.filter(o=>o.position==="EDITORIAL_PREFERRED_CONDITIONAL").length!==1 ||
       options.find(o=>o.position==="EDITORIAL_PREFERRED_CONDITIONAL")?.id!==scale.editorial_preference)
      fail("preferred is unique but never adopted");
    if(options.find(o=>o.id===scale.editorial_preference).checks
       .some(c=>c.status==="FAILS"))
      fail("preferred has fatal editorial criterion");
  }
  if(!Array.isArray(matrix.risk_scenarios)||matrix.risk_scenarios.length<6||
     matrix.risk_scenarios.some(s=>s.requires_empirical_check!==true||
       typeof s.expected!=="string"))
    fail("missing empirical check scenarios");
  if(!Array.isArray(matrix.gates)||matrix.gates.length!==5||
     matrix.gates.some((g,i)=>g.id!=="G"+(i+1) ||
       g.state!=="PENDING"||g.automatable!==false))
    fail("human gates cannot be auto-approved");
  const policy=matrix.policy;
  if(!policy||typeof policy!=="object"||
     policy.v02_question_bank_frozen!==true ||
     ["issue_v03_now","overwrite_legacy_questions","migrate_old_answers",
       "emit_type_id","emit_pair_compatibility_score","release_public_diagnosis",
       "collect_real_participant_data","treat_editorial_criteria_as_scientific_evidence"]
       .some(key=>!has(policy,key)||policy[key]!==false))
    fail("release or migration protection");
  return Object.freeze({
    schema:D92_SCHEMA,
    compared_options:matrix.options.length,
    compared_scales:D92_SCALES,
    editorial_candidates:Object.freeze(matrix.scales.map(scale=>Object.freeze({
      scale:scale.id,option_id:scale.editorial_preference,
      formal_decision:"PENDING",
      title:matrix.options.find(o=>o.id===scale.editorial_preference).title
    }))),
    gates_pending:matrix.gates.length,
    psychometric_validity:"NOT_ESTABLISHED",
    type_id:null,
    classification_status:"WITHHELD",
    production_approved:false
  });
}
