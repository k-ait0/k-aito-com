/**
 * A05 D-42 acceptance evidence STRUCTURE audit: no authority and no I/O.
 * Checks only public, non-identifying meta-references, never actual proof.
 * A "REVIEWED" fixture must not be interpreted as a security test result.
 */
import {inspectG1Readiness} from "./a05-research-g1-gate.mjs";
import {inspectD41PolicySet} from "./a05-research-d41-withdrawal-review.mjs";

export const D42_STATE="NOT_AUTHORIZED_FOR_RESEARCH";
export const D42_REQUIRED_IDS=Object.freeze(Array.from({length:16},
  (_,i)=>"AC-"+String(i+1).padStart(2,"0")));
const filled=v=>typeof v==="string"&&v.trim().length>0;

export function inspectD42Acceptance(register,g1,policies) {
  const blockers=[];
  if(!register||typeof register!=="object"||Array.isArray(register))
    return Object.freeze({state:D42_STATE,authorized:false,
      structuralEvidenceFieldsComplete:false,manualExternalReviewEligible:false,
      blockers:["Invalid D42 register"]});
  if(register.schema!=="A05-D42-30DAY-ACCEPTANCE-1"||
     register.status!=="DRAFT_PENDING_NO_AUTHORIZATION")
    blockers.push("D42 register schema/status not draft");
  if(register.proposedPolicyId!=="A_30DAY_ALIGNMENT"||
     register.periods?.contactDays!==14||
     register.periods?.pseudonymLinkDays!==30||
     register.periods?.rawNotesDays!==30||
     register.periods?.approved!==false)
    blockers.push("30-day proposed policy differs from original candidate");
  const forbidden=register.safeBaseline;
  if(!forbidden||
     forbidden.recruitmentAuthorized!==false||
     forbidden.dataCollectionAuthorized!==false||
     forbidden.realTokenImplemented!==false||
     forbidden.physicalDeletionValidated!==false||
     forbidden.productionReleaseAuthorized!==false||
     forbidden.participantRecordsExist!==false||
     forbidden.finalHumanSignoff!=="PENDING")
    blockers.push("D42 no-authorization boundary missing");
  if(register.evidencePolicy?.rehearsalMayUse!=="SYNTHETIC_FIXTURES_ONLY")
    blockers.push("Synthetic-only rehearsal boundary missing");
  const checks=register.acceptanceChecks;
  if(!Array.isArray(checks)||checks.length!==16)
    blockers.push("Exactly sixteen acceptance controls are required");
  const byId=new Map();
  if(Array.isArray(checks)){
    for(const item of checks){
      if(!item||!D42_REQUIRED_IDS.includes(item.id)||byId.has(item.id))
        blockers.push("Duplicated, missing or unknown acceptance ID");
      else byId.set(item.id,item);
    }
  }
  for(const id of D42_REQUIRED_IDS){
    const item=byId.get(id);
    if(!item){blockers.push(id+": absent");continue;}
    if(!/^G1-\d{2}$/.test(item.g1||"")||
       !filled(item.criterion)||!filled(item.requiredEvidence))
      blockers.push(id+": linked G1 or requirement missing");
    if(item.status==="PENDING")
      blockers.push(id+": pending");
    else if(item.status!=="REVIEWED"||
      !filled(item.humanEvidenceRef)||!filled(item.reviewerRole)||
      !filled(item.reviewedAt))
      blockers.push(id+": evidence fields not complete");
  }
  try {
    inspectD41PolicySet(policies);
    const source=policies.policies.find(p=>p.id==="A_30DAY_ALIGNMENT");
    if(!source||source.status!=="UNAPPROVED"||
       source.contactDays!==14||source.linkDays!==30||source.noteDays!==30)
      blockers.push("D41 A candidate differs or has been declared adopted");
  } catch {blockers.push("D41 candidate policy invalid");}
  const linkedG1=new Set(checks?.map(x=>x.g1));
  if(Array.isArray(g1?.operationalDecisions)&&
     g1.operationalDecisions.some(x=>!linkedG1.has(x.id)))
    blockers.push("D42 is missing one or more G1 controls");
  const upstream=inspectG1Readiness(g1);
  if(upstream.authorized!==false)
    blockers.push("G1 cannot return authorization");
  if(g1?.operationalDecisions?.some(x=>x.status!=="PENDING")||
     g1?.finalSignoff?.state!=="PENDING")
    blockers.push("G1 must remain pending in this D42 research draft");
  if(register.approval?.state!=="PENDING"||
     register.approval?.authorizationEvidenceRef!=null||
     register.approval?.humanAuthorizerRole!=null)
    blockers.push("D42 signoff must be pending");
  const structuralEvidenceFieldsComplete=D42_REQUIRED_IDS.every(id=>{
    const x=byId.get(id);
    return x?.status==="REVIEWED"&&filled(x.humanEvidenceRef)&&
      filled(x.reviewerRole)&&filled(x.reviewedAt);
  });
  return Object.freeze({
    state:D42_STATE,
    authorized:false,participantRecruitmentAuthorized:false,
    physicalDeletionVerified:false,
    structuralEvidenceFieldsComplete,
    manualExternalReviewEligible:false,
    pendingChecks:D42_REQUIRED_IDS.filter(id=>byId.get(id)?.status!=="REVIEWED"),
    blockers:Object.freeze(blockers)
  });
}
