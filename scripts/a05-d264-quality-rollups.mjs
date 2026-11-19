/**
 * A05 D264: pure OFFLINE analytics rollups and editorial review candidates.
 * No network, storage, database write, question replacement, or collection.
 * Only pass synthetic or separately authorized finalized session snapshots.
 */
import {aggregateFinalizedConsentedSessions} from "./a05-d261-analytics-contract.mjs";

export const D264_VERSION="A05-D264-QUALITY-ROLLUPS-DRAFT-1";
export const D264_PROPOSED_REVIEW_POLICY=Object.freeze({
  version:"D264-REVIEW-PROPOSAL-1",
  minQuestionExposures:100,
  unknownRateAtLeast:0.25,
  excessVsOtherItemsAtLeast:0.10,
  minOtherItemExposures:100
});
const typeRE=/^T(0[1-9]|1[0-6])$/;
const phaseNames=["BASE_30","FINAL_AFTER_YN"];
const need=(valid,message)=>{if(!valid)throw Error("D264: "+message);};
const stable=(...parts)=>JSON.stringify(parts);
function dayJST(value){
 need(typeof value==="string"&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value),
  "completedAt must be ISO8601 with explicit timezone");
 const date=new Date(value);
 need(Number.isFinite(date.getTime()),"completedAt invalid");
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
 const get=type=>parts.find(p=>p.type===type)?.value;
 return [get("year"),get("month"),get("day")].join("-");
}
function countRows(){
 return {shown_count:0,c1:0,c2:0,c3:0,c4:0,c5:0,c6:0,c7:0,
  skip_unknown:0,skip_not_applicable:0,yn_yes:0,yn_no:0,yn_unsure:0,not_answered:0};
}
function resultBucket(c,phase){
 if(c.outcome==="SINGLE_PROVISIONAL"){
  need(typeRE.test(c.typeId),"invalid single type");
  need(["BASE_30","YN_PROVISIONAL"].includes(c.source),"invalid single source");
  need(phase!=="BASE_30"||c.source==="BASE_30",
   "a BASE_30 snapshot cannot originate from Y/N");
  return [c.typeId,c.source];
 }
 need(c.typeId===undefined||c.typeId===null,"unresolved cannot contain type ID");
 need(["MULTIPLE","NO_INFORMATION"].includes(c.outcome),"invalid unresolved outcome");
 return [c.outcome,"UNCLASSIFIED"];
}

/** Returns de-identified daily rows matching D261 SQL tables plus a MANUAL queue.
    It deliberately returns no raw sessions, submissions, identifiers, or question text.
 */
export function buildOfflineQualityRollups(sessions,{reviewPolicy=D264_PROPOSED_REVIEW_POLICY}={}){
 need(Array.isArray(sessions),"sessions must be array");
 const p=reviewPolicy;
 need(p&&typeof p.version==="string"&&p.version.length>0&&
  Number.isInteger(p.minQuestionExposures)&&p.minQuestionExposures>=1&&
  Number.isInteger(p.minOtherItemExposures)&&p.minOtherItemExposures>=1&&
  Number.isFinite(p.unknownRateAtLeast)&&p.unknownRateAtLeast>=0&&p.unknownRateAtLeast<=1&&
  Number.isFinite(p.excessVsOtherItemsAtLeast)&&p.excessVsOtherItemsAtLeast>=0&&p.excessVsOtherItemsAtLeast<=1,
  "invalid proposed review policy");
 // Validate all sessions against the previously audited D261 contract.
 // This also rejects conflicting repeated submissions.
 const overall=aggregateFinalizedConsentedSessions(sessions);
 const distinct=new Map(),byKey=new Map();
 for(const s of sessions){
  const signature=JSON.stringify(s);
  if(distinct.has(s.submissionId)){
   need(distinct.get(s.submissionId)===signature,"conflicting repeated session");
   continue;
  }
  distinct.set(s.submissionId,signature);
  const d=dayJST(s.completedAt);
  const v=s.questionnaireVersion;
  for(const e of s.exposures){
   const key=stable(d,v,e.questionId,e.revision,e.phase);
   if(!byKey.has(key))byKey.set(key,{
    day_jst:d,questionnaire_version:v,question_id:e.questionId,
    question_revision:e.revision,phase:e.phase,...countRows()
   });
   const r=byKey.get(key);r.shown_count++;
   const map={SKIP_UNKNOWN:"skip_unknown",SKIP_NOT_APPLICABLE:"skip_not_applicable",
    YN_YES:"yn_yes",YN_NO:"yn_no",YN_UNSURE:"yn_unsure",NOT_ANSWERED:"not_answered"};
   if(e.responseCode==="SCALE_7")r["c"+e.scaleValue]++;
   else r[map[e.responseCode]]++;
  }
 }
 const typeBuckets=new Map(),seenTypeIds=new Set();
 for(const s of sessions){
  // Duplicates are handled by preserving the first snapshot once.
  if(seenTypeIds.has(s.submissionId))continue;
  seenTypeIds.add(s.submissionId);
  const day=dayJST(s.completedAt);
  for(const phase of phaseNames){
   const [type_bucket,source_bucket]=resultBucket(s.classifications[phase],phase);
   const key=stable(day,s.questionnaireVersion,phase,s.classificationVersion,type_bucket,source_bucket);
   if(!typeBuckets.has(key))typeBuckets.set(key,{
    day_jst:day,questionnaire_version:s.questionnaireVersion,phase,
    classification_version:s.classificationVersion,type_bucket,source_bucket,n:0
   });
   typeBuckets.get(key).n++;
  }
 }
 const dailyQuestionCounts=[...byKey.values()].sort((a,b)=>
  stable(a.day_jst,a.questionnaire_version,a.question_id,a.question_revision,a.phase)
  .localeCompare(stable(b.day_jst,b.questionnaire_version,b.question_id,b.question_revision,b.phase)));
 const dailyTypeCounts=[...typeBuckets.values()].sort((a,b)=>
  stable(a.day_jst,a.questionnaire_version,a.phase,a.classification_version,a.type_bucket,a.source_bucket)
  .localeCompare(stable(b.day_jst,b.questionnaire_version,b.phase,b.classification_version,b.type_bucket,b.source_bucket)));
 const byVersion=new Map();
 for(const q of dailyQuestionCounts){
  if(q.phase!=="CORE")continue;
  // A questionnaire version has a fixed meaning; never combine with another
  // questionnaire version, revision, or form format.
  if(!byVersion.has(q.questionnaire_version))byVersion.set(q.questionnaire_version,new Map());
  const version=byVersion.get(q.questionnaire_version);
  const key=stable(q.question_id,q.question_revision);
  if(!version.has(key))version.set(key,{question_id:q.question_id,question_revision:q.question_revision,
   shown:0,unknown:0,notApplicable:0,midpoint:0});
  const t=version.get(key);
  t.shown+=q.shown_count;t.unknown+=q.skip_unknown;
  t.notApplicable+=q.skip_not_applicable;t.midpoint+=q.c4;
 }
 const manualReviewCandidates=[];
 for(const [questionnaireVersion,group] of byVersion){
  const rows=[...group.values()];
  for(const q of rows){
   if(q.shown<p.minQuestionExposures)continue;
   const unknownRate=q.unknown/q.shown;
   if(unknownRate<p.unknownRateAtLeast)continue;
   // Exclude *all* other revisions of the SAME question ID from peer baseline.
   const peer=rows.filter(x=>x.question_id!==q.question_id);
   const otherShown=peer.reduce((n,x)=>n+x.shown,0);
   if(otherShown<p.minOtherItemExposures)continue;
   const otherUnknown=peer.reduce((n,x)=>n+x.unknown,0);
   const otherUnknownRate=otherUnknown/otherShown;
   if(unknownRate-otherUnknownRate<p.excessVsOtherItemsAtLeast)continue;
   manualReviewCandidates.push({
    questionnaire_version:questionnaireVersion,
    question_id:q.question_id,question_revision:q.question_revision,
    shown_count:q.shown,unknown_count:q.unknown,
    unknown_rate:unknownRate,peer_unknown_rate:otherUnknownRate,
    excess_vs_peers_pp:(unknownRate-otherUnknownRate)*100,
    suggested_status:"REVIEW_CANDIDATE",rule_version:p.version,
    action:"EDITOR_REVIEW_ONLY",
    note:"This is a proposed rule, not approval to replace or publish a question."
   });
  }
 }
 manualReviewCandidates.sort((a,b)=>b.excess_vs_peers_pp-a.excess_vs_peers_pp||
  a.question_id.localeCompare(b.question_id));
 const byPhase=Object.groupBy(dailyTypeCounts,r=>r.phase);
 const phaseTotals=Object.fromEntries(phaseNames.map(phase=>[phase,
  (byPhase[phase]||[]).reduce((n,r)=>n+r.n,0)]));
 need(phaseTotals.BASE_30===overall.uniqueConsentedCompleted&&
  phaseTotals.FINAL_AFTER_YN===overall.uniqueConsentedCompleted,
  "daily type counts must equal unique finalized submissions");
 return {
  schema:D264_VERSION,policyStatus:"UNAPPROVED_EXAMPLE_REVIEW_ONLY",
  reviewPolicy:{...p},uniqueConsentedCompleted:overall.uniqueConsentedCompleted,
  dailyQuestionCounts,dailyTypeCounts,manualReviewCandidates,
  typeDistribution:overall.typeMetrics,
  ynRescueMetrics:overall.ynRescueMetrics,
  flags:{dbConnected:false,networkEnabled:false,autoReplacementEnabled:false,
   respondentDataCollectedByThisCode:false}
 };
}
