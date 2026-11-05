/**
 * D93: editorial traceability contract for BR1/CP1 candidate item mappings.
 * This deliberately cannot issue a score, approve wording, or collect responses.
 */
export const D93_SCHEMA="A05-D93-ITEM-TO-CONSTRUCT-MAP-1";
export const D93_ITEM_IDS=Object.freeze(["B-R01","B-R02","B-R03","C-P01","C-P02","C-P03"]);
export const D93_CRITERIA=Object.freeze([
 "value_not_state","concept_boundary","independent_high_low",
 "context_robustness","three_nonredundant_items","interpretation_limits"
]);
const DECISIONS=Object.freeze(["CONDITIONAL_TRIAL","REWRITE_BEFORE_TRIAL"]);
const ASSESSMENTS=Object.freeze(["MEETS","CONDITIONAL","FAILS"]);
const expected={
 "B-R01":"CONDITIONAL_TRIAL","B-R02":"CONDITIONAL_TRIAL",
 "B-R03":"REWRITE_BEFORE_TRIAL","C-P01":"REWRITE_BEFORE_TRIAL",
 "C-P02":"REWRITE_BEFORE_TRIAL","C-P03":"REWRITE_BEFORE_TRIAL"
};
const refuse=text=>{throw new TypeError("D93 mapping invalid: "+text)};
export function validateD93Mapping(mapping,bank,matrix,audit,sourceBlobs) {
 if(!mapping||mapping.schema!==D93_SCHEMA||
    mapping.status!=="INTERNAL_EDITORIAL_MAPPING_ONLY")refuse("schema or status");
 if(!bank||bank.schema!=="A05-BC-PILOT-0.2-draft"||
    !Array.isArray(bank.items)||bank.items.length!==12)refuse("bank");
 if(!matrix||matrix.schema!=="A05-D92-CONSTRUCT-CHOICE-MATRIX-1"||
    !Array.isArray(matrix.scales)||!Array.isArray(matrix.criteria))refuse("matrix");
 if(!audit||audit.schema!=="A05-D91-EDITORIAL-CONSTRUCT-AUDIT-0.1"||
    !Array.isArray(audit.items)||audit.items.length!==12)refuse("audit");
 if(!Array.isArray(mapping.sources)||mapping.sources.length!==3||
    !Array.isArray(sourceBlobs)||sourceBlobs.length!==3)
   refuse("source lineage length");
 for(let i=0;i<3;i++)
   if(mapping.sources[i]?.path!==sourceBlobs[i].path||
      mapping.sources[i]?.git_blob_sha!==sourceBlobs[i].sha||
      !/^[0-9a-f]{40}$/.test(sourceBlobs[i].sha))
     refuse("source pinning");
 if(!Array.isArray(mapping.acceptance_criteria_ids)||
    mapping.acceptance_criteria_ids.join("|")!==D93_CRITERIA.join("|")||
    matrix.criteria.map(x=>x.id).join("|")!==D93_CRITERIA.join("|"))
   refuse("criteria version");
 if(!Array.isArray(mapping.preferred_concepts)||mapping.preferred_concepts.length!==2||
    mapping.preferred_concepts[0]?.option_id!=="BR1"||
    mapping.preferred_concepts[0]?.facet!=="related"||
    mapping.preferred_concepts[1]?.option_id!=="CP1"||
    mapping.preferred_concepts[1]?.facet!=="present"||
    mapping.preferred_concepts.some(x=>x.approval!=="PENDING"))
   refuse("preferred concept approval");
 if(!Array.isArray(mapping.items)||mapping.items.length!==6||
    mapping.items.map(x=>x.id).join("|")!==D93_ITEM_IDS.join("|"))
   refuse("coverage or order");
 for(const entry of mapping.items){
  const original=bank.items.find(q=>q.id===entry.id);
  const audited=audit.items.find(q=>q.id===entry.id);
  const wantedOption=entry.facet==="related"?"BR1":"CP1";
  if(!original||!audited||entry.source_text!==original.text||
     entry.source_text!==audited.source_text||
     entry.axis!==original.axis||entry.facet!==original.facet||
     entry.preferred_option!==wantedOption||
     expected[entry.id]!==entry.editorial_disposition||
     !DECISIONS.includes(entry.editorial_disposition)||
     entry.psychometric_verified!==false)
   refuse("item source or decision "+entry.id);
  const option=matrix.options.find(x=>x.id===wantedOption);
  if(!option||!option.item_ids.includes(entry.id))refuse("concept item linkage "+entry.id);
  if(!Array.isArray(entry.acceptance_criteria)||
     entry.acceptance_criteria.length!==6||
     entry.acceptance_criteria.some((c,i)=>c.id!==D93_CRITERIA[i]||
       !ASSESSMENTS.includes(c.editorial_judgment)))
    refuse("criterion "+entry.id);
  for(const key of ["intent","alignment","primary_issue","rewrite_brief_unapproved","negative_guardrail"])
   if(typeof entry[key]!=="string"||entry[key].trim().length<(key==="intent"?8:10))
     refuse("incomplete editorial rationale "+entry.id+" "+key);
  if(!Array.isArray(entry.contamination)||entry.contamination.length<1||
     !Array.isArray(entry.overlap_items)||!Array.isArray(entry.cognitive_interview_probes_draft)||
     entry.cognitive_interview_probes_draft.length!==2||
     entry.cognitive_interview_probes_draft.some(s=>typeof s!=="string"||s.length<8))
    refuse("probes or contamination "+entry.id);
  for(const other of entry.overlap_items)
    if(other===entry.id||!D93_ITEM_IDS.includes(other)||
       (other.startsWith("B")!==entry.id.startsWith("B")))
      refuse("invalid overlap "+entry.id);
 }
 if(mapping.dispositions?.CONDITIONAL_TRIAL!==2||
    mapping.dispositions?.REWRITE_BEFORE_TRIAL!==4||
    !Array.isArray(mapping.synthetic_interpretation_checks)||
    mapping.synthetic_interpretation_checks.length!==5||
    mapping.synthetic_interpretation_checks.some(s=>
      s.evidence!=="UNTESTED"||!Array.isArray(s.item_ids)||
      s.item_ids.some(id=>!D93_ITEM_IDS.includes(id))))
   refuse("editorial counts or untested scenarios");
 const policy=mapping.decisions;
 if(!policy||policy.editorial_map_completed!==true||
    policy.old_q30_and_v02_frozen!==true||
    policy.rewrite_proposals_are_not_a_bank!==true||
    ["construct_selection_formally_approved","revised_wording_approved",
      "issue_bank_v03","participant_data_collection","production_approved"]
        .some(key=>policy[key]!==false)||
    policy.type_id!==null||policy.classification_status!=="WITHHELD"||
    policy.empirical_validity!=="NOT_ESTABLISHED")
   refuse("authorization boundary");
 return Object.freeze({
   schema:D93_SCHEMA,
   itemCount:mapping.items.length,
   conditionalTrialCount:2,
   rewriteRequiredCount:4,
   criteriaChecks:36,
   cognitiveProbes:12,
   formalDecision:"PENDING",
   typeId:null,
   classificationStatus:"WITHHELD",
   psychometricEvidence:false,
   publicationApproved:false
 });
}
