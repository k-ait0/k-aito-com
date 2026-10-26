/**
 * D-41 synthetic-only identity/withdrawal timeline MODEL.
 * Only fixed policy IDs and scenario names. No token, identity, answer,
 * consent receipt, database, files, external I/O, or deletion capability.
 * "fixture match" is NOT authentication and never authorizes deletion.
 */
export const D41_REVIEW_SCENARIOS=Object.freeze([
  "day0-match","day14-match","day15-match","day29-match",
  "day30-match","day31-match","day89-match","day90-match",
  "day20-missing-proof","day20-wrong-proof","day20-replay",
  "day20-no-consent"
]);
const CASES=Object.freeze({
  "day0-match":{day:0,evidence:"FIXTURE_MATCH",consent:true},
  "day14-match":{day:14,evidence:"FIXTURE_MATCH",consent:true},
  "day15-match":{day:15,evidence:"FIXTURE_MATCH",consent:true},
  "day29-match":{day:29,evidence:"FIXTURE_MATCH",consent:true},
  "day30-match":{day:30,evidence:"FIXTURE_MATCH",consent:true},
  "day31-match":{day:31,evidence:"FIXTURE_MATCH",consent:true},
  "day89-match":{day:89,evidence:"FIXTURE_MATCH",consent:true},
  "day90-match":{day:90,evidence:"FIXTURE_MATCH",consent:true},
  "day20-missing-proof":{day:20,evidence:"ABSENT",consent:true},
  "day20-wrong-proof":{day:20,evidence:"MISMATCH",consent:true},
  "day20-replay":{day:20,evidence:"REPLAY",consent:true},
  "day20-no-consent":{day:20,evidence:"FIXTURE_MATCH",consent:false}
});
const NONAUTH="G1_PENDING_NO_AUTHORIZATION";
export function inspectD41PolicySet(manifest) {
  if(!manifest||manifest.schema!=="A05-D41-WITHDRAWAL-POLICY-OPTIONS-1"||
     manifest.state!=="OPTIONS_UNAPPROVED"||
     manifest.approval?.allG1DecisionsPending!==true||
     manifest.approval?.participantRecruitmentAuthorized!==false||
     manifest.approval?.responseCollectionAuthorized!==false||
     manifest.policies?.length!==3||
     manifest.tokenProtocolProposal?.state!=="NOT_IMPLEMENTED_NOT_APPROVED"||
     manifest.tokenProtocolProposal?.neverTreatSyntheticMatchAsRealAuthentication!==true)
    throw new Error("D41 manifest cannot support any authorized research");
  if(new Set(manifest.policies.map(p=>p.id)).size!==3)
    throw new Error("D41 duplicate policy IDs");
  for(const p of manifest.policies){
    if(p.status!=="UNAPPROVED"||
       ![p.contactDays,p.linkDays,p.noteDays].every(n=>Number.isSafeInteger(n)&&n>=0)||
       p.linkDays<p.noteDays||
       (p.noteDays===0)!==(p.linkDays===0)||
       p.contactDays>p.linkDays||
       p.individualWithdrawalWindowDays!==p.noteDays||
       p.retainsIndividualData!==(p.noteDays>0))
      throw new Error("D41 unsafe or inconsistent retention policy: "+p.id);
  }
  return Object.freeze({state:NONAUTH,authorized:false,policyCount:3,
    allPoliciesNonauthorizing:true});
}
export function evaluateD41Scenario(manifest,policyId,scenarioName) {
  inspectD41PolicySet(manifest);
  if(typeof policyId!=="string"||typeof scenarioName!=="string"||
     !Object.hasOwn(CASES,scenarioName))
    throw new RangeError("Only fixed D41 policy IDs and fictional cases allowed");
  const p=manifest.policies.find(x=>x.id===policyId);
  if(!p)throw new RangeError("Unknown D41 policy");
  const fixture=CASES[scenarioName];
  const mappingExists=p.linkDays>fixture.day;
  const notesExist=p.noteDays>fixture.day;
  const contactExists=p.contactDays>fixture.day;
  let reviewState;
  if(!fixture.consent)reviewState="NO_CONSENT_NO_REQUEST_PROCESSING";
  else if(!notesExist)reviewState="NO_INDIVIDUAL_RECORD_REMAINS_IN_MODEL";
  else if(!mappingExists)reviewState="UNMATCHED_NOTES_DESIGN_DEFECT";
  else if(fixture.evidence==="REPLAY")reviewState="REPLAY_NO_APPROVAL";
  else if(fixture.evidence!=="FIXTURE_MATCH")reviewState="UNVERIFIED_NO_APPROVAL";
  else reviewState="SYNTHETIC_MATCH_HUMAN_REVIEW_ONLY";
  return Object.freeze({
    policyId,caseName:scenarioName,elapsedDays:fixture.day,
    state:NONAUTH,reviewState,
    contactMarker:contactExists,pseudonymLinkMarker:mappingExists,
    rawNoteMarker:notesExist,
    fixtureEvidence:fixture.evidence,
    realIdentityVerified:false,
    realConsentCollected:false,
    authorized:false,actualDataCollected:false,
    actualDeletionPerformed:false,
    participantIdentifiersHandled:false
  });
}
