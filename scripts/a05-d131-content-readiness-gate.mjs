/**
 * D131: content-readiness diagnostic for A05's 50 item research pool.
 * Pure QA; never classifies people, updates A05 storage, or authorizes publication.
 */
export const D131_VERSION = "D131-READINESS-0.1";
const axes = ["A","B","C","D","E"];
const need = {A:7,B:7,C:7,D:7,E:2};
const poolTarget = {A:12,B:12,C:12,D:12,E:2};
const statuses = ["CONDITIONAL_PILOT","REVISE_BEFORE_PILOT","HOLD_FOR_CONTENT_RISK"];
function requireValue(x,msg){if(!x)throw new Error(msg);}
export function validateEditorialRecords(bank,audit){
 requireValue(bank && Array.isArray(bank.items)&&bank.items.length===50,"Expected 50 slot bank");
 requireValue(bank.productionEligible===false&&bank.questionBankValidated===false,"Research-only bank required");
 requireValue(audit && audit.schema==="A05-D131-FULL-50-CONTENT-SCREEN-0.1","Wrong audit version");
 requireValue(audit.ownerApproved===false&&audit.psychometricValidityEstablished===false,"Review is not approval");
 requireValue(audit.source?.version===bank.bankVersion,"Audit references different bank version");
 requireValue(Array.isArray(audit.items)&&audit.items.length===50,"Every candidate must have an audit record");
 const ref=new Map(bank.items.map(x=>[x.id,x]));
 requireValue(ref.size===50,"Duplicate bank IDs");
 const seen=new Set();
 for(const x of audit.items){
   requireValue(!seen.has(x.id)&&ref.has(x.id),"Missing/duplicate or foreign audit item");
   seen.add(x.id);
   const item=ref.get(x.id);
   requireValue(item.axis===x.axis&&item.source===x.origin&&item.negative===x.negative&&item.positive===x.positive,"Audit stale for "+x.id);
   requireValue(statuses.includes(x.status)&&x.approved===false&&x.observedInRealRespondents===false,"Unexpected approval/test status");
   requireValue(typeof x.rationale==="string"&&x.rationale.length>=9,"No editorial rationale");
 }
 for(const axis of axes) requireValue(ref.size===50 && bank.items.filter(x=>x.axis===axis).length===poolTarget[axis],"Bank axis count mismatch");
 return true;
}
export function summarizeContentReadiness(bank,audit){
 validateEditorialRecords(bank,audit);
 const res={schema:"A05-D131-READINESS-RESULT-0.1",mode:"EDITORIAL_RESEARCH_ONLY",decision:"NO_GO",
  psychometricValidityEstablished:false,automatedClassificationPermitted:false,
  canSampleUnvalidatedTextForSimulation:true,canDrawScoredThirty:false,
  totals:{candidates:50,conditionalPilot:0,revisionRequired:0,hold:0,approved:0},
  axes:{},minimumTrialCountMissing:0};
 for(const a of axes){
  const items=audit.items.filter(x=>x.axis===a);
  const trial=items.filter(x=>x.status==="CONDITIONAL_PILOT");
  const revise=items.filter(x=>x.status==="REVISE_BEFORE_PILOT");
  const hold=items.filter(x=>x.status==="HOLD_FOR_CONTENT_RISK");
  const shortfall=Math.max(0,need[a]-trial.length);
  res.axes[a]={pool:items.length,requiredPerForm:need[a],conditionalPilot:trial.length,needsRevision:revise.length,
    held:hold.length,shortfallEvenForTrial:shortfall,
    candidateIDs:trial.map(x=>x.id),excludedIDs:hold.map(x=>x.id),
    status:shortfall?"INSUFFICIENT_CONDITIONAL_ITEMS":"TRIAL_POOL_COUNT_ONLY_NOT_VALIDATED"};
  res.minimumTrialCountMissing+=shortfall;
  res.totals.conditionalPilot+=trial.length;
  res.totals.revisionRequired+=revise.length;
  res.totals.hold+=hold.length;
 }
 return res;
}
export function requireReadyForScientificScoring(bank,audit){
 const r=summarizeContentReadiness(bank,audit);
 throw new Error("BLOCKED_NOT_VALIDATED: "+r.minimumTrialCountMissing+
   " item slots missing even at conditional-pilot level; no calibration or real-participant validity.");
}
