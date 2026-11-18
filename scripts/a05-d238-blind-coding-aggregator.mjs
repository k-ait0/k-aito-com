/**
 * A05 D238 — paired, blinded rater coding and aggregate-only adjudication.
 *
 * This reads ONLY locally supplied, content-free categorical codes. Never
 * accepts personal identifiers, respondent text, interview notes, or raw
 * answers in the coding sheet. A second independent coder must use the R2
 * sheet; agreement is an observed property of supplied codes, not proof
 * of independently conducted fieldwork.
 *
 * Does not mark G1/G3/G4 complete and does not choose a C36 replacement.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {createInterviewPlan} from "./a05-d237-build-cognitive-interview-kit.mjs";

export const CODING_SCHEMA="A05-D238-INTERVIEW-RATER-CODES-1";
const plan=createInterviewPlan();
const validSlots=new Map(plan.slots.map(s=>[s.slot,s]));
const CODES=["SAME_REASON","DISTINCT_REASON","CONFOUNDED","UNCLEAR","SKIPPED"];
const C36_CODES=["NEW_C_FACET","OVERLAPS_EXISTING","OTHER_CONFOUND","UNCLEAR","SKIPPED"];
const SUBSTANTIVE_PAIR=new Set(["SAME_REASON","DISTINCT_REASON","CONFOUNDED"]);
const SUBSTANTIVE_C36=new Set(["NEW_C_FACET","OVERLAPS_EXISTING","OTHER_CONFOUND"]);
const rate=(same,evaluable)=>evaluable?Number((same/evaluable).toFixed(5)):null;
const CANDIDATES=["C36-R1","C36-R2","C36-R3"];
function simple(x){return x!==null&&typeof x==="object"&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;}
function exactKeys(x,keys){
 return simple(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(x,k));
}
export function blankCodingSheet(slot,raterCode){
 const s=validSlots.get(slot);
 assert.ok(s,"Unknown blank interview slot");
 assert.ok(["R1","R2"].includes(raterCode),"Only blind rater R1/R2 supported");
 return {
  schema:CODING_SCHEMA,mode:"RESEARCH_ONLY",
  slot,consentConfirmed:false,raterCode,
  pairJudgments:Object.fromEntries(s.pairIds.map(id=>[id,{
   code:null,criticalMisunderstanding:null
  }])),
  candidateJudgments:Object.fromEntries(CANDIDATES.map(id=>[id,null]))
 };
}
function badReason(record){
 if(!simple(record)||record.schema!==CODING_SCHEMA||record.mode!=="RESEARCH_ONLY"||
   record.consentConfirmed!==true)return "invalid_schema_or_consent";
 if(!validSlots.has(record.slot)||!["R1","R2"].includes(record.raterCode))
  return "unknown_slot_or_rater";
 if(!exactKeys(record,["schema","mode","slot","consentConfirmed","raterCode","pairJudgments","candidateJudgments"]))
  return "unexpected_metadata";
 const s=validSlots.get(record.slot);
 if(!exactKeys(record.pairJudgments,s.pairIds))return "pair_list_mismatch";
 for(const [id,item] of Object.entries(record.pairJudgments)){
  if(!exactKeys(item,["code","criticalMisunderstanding"]))return "pair_code_schema_mismatch";
  if(!CODES.includes(item.code)||typeof item.criticalMisunderstanding!=="boolean")
   return "bad_pair_code";
  if(!s.pairIds.includes(id))return "unexpected_pair";
 }
 if(!exactKeys(record.candidateJudgments,CANDIDATES))return "candidate_list_mismatch";
 if(Object.values(record.candidateJudgments).some(x=>!C36_CODES.includes(x)))
  return "bad_candidate_code";
 return null;
}
function categoryCount(keys){return Object.fromEntries(keys.map(k=>[k,0]));}
const initPair=()=>({
  pairedReviews:0,agreements:0,disagreements:0,skippedEither:0,unclearEither:0,
  substantivePairedReviews:0,substantiveAgreements:0,substantiveDisagreements:0,
  substantiveAgreementRate:null,criticalMisunderstandingEither:0,
  agreedCodeCounts:categoryCount(CODES)
});
const initCandidate=()=>({
  pairedReviews:0,agreements:0,disagreements:0,skippedEither:0,unclearEither:0,
  substantivePairedReviews:0,substantiveAgreements:0,substantiveDisagreements:0,
  substantiveAgreementRate:null,agreedCodeCounts:categoryCount(C36_CODES)
});
export function summarizeInterviewCodes(records){
 if(!Array.isArray(records))throw Error("Only local arrays of coding sheets accepted");
 const res={
  schema:"A05-D238-COGNITIVE-CODING-AGGREGATE-1",
  mode:"RESEARCH_ONLY",status:"NO_REAL_COGNITIVE_DATA",
  datasetOrigin:"UNVERIFIED_LOCAL_CODER_SUBMISSIONS",
  inputSheets:records.length,acceptedSheets:0,rejectedSheets:0,
  rejectionReasons:{},pairedInterviewSlots:0,awaitingSecondCoderSlots:0,
  plannedSlots:plan.slots.length,unreviewedSlots:plan.slots.length,
  pairResults:Object.fromEntries(Object.keys(plan.pairExposure).map(id=>[id,initPair()])),
  C36Candidates:Object.fromEntries(CANDIDATES.map(id=>[id,initCandidate()])),
  rawResponsesOutput:false,interviewNotesOutput:false,
  important:"Rater agreement and content judgments are NOT construct validity. All candidate decisions remain on hold.",
  requiresHumanReview:true,automaticScoringApproval:false
 };
 const seen=new Map();
 for(const x of records){
  const reason=badReason(x);
  if(reason){res.rejectedSheets++;res.rejectionReasons[reason]=(res.rejectionReasons[reason]||0)+1;continue;}
  const key=x.slot+"|"+x.raterCode;
  if(seen.has(key)){res.rejectedSheets++;res.rejectionReasons.duplicate_slot_rater=(res.rejectionReasons.duplicate_slot_rater||0)+1;continue;}
  seen.set(key,x);res.acceptedSheets++;
 }
 for(const s of plan.slots){
  const r1=seen.get(s.slot+"|R1"),r2=seen.get(s.slot+"|R2");
  if(!r1&&!r2)continue;
  if(!r1||!r2){res.awaitingSecondCoderSlots++;continue;}
  res.pairedInterviewSlots++;
  for(const pair of s.pairIds){
   const a=r1.pairJudgments[pair],b=r2.pairJudgments[pair];
   const cur=res.pairResults[pair];
   cur.pairedReviews++;
   if(a.criticalMisunderstanding||b.criticalMisunderstanding)cur.criticalMisunderstandingEither++;
   if(a.code==="SKIPPED"||b.code==="SKIPPED")cur.skippedEither++;
   if(a.code==="UNCLEAR"||b.code==="UNCLEAR")cur.unclearEither++;
   if(a.code===b.code){cur.agreements++;cur.agreedCodeCounts[a.code]++;}
   else cur.disagreements++;
   if(SUBSTANTIVE_PAIR.has(a.code)&&SUBSTANTIVE_PAIR.has(b.code)){
    cur.substantivePairedReviews++;
    if(a.code===b.code)cur.substantiveAgreements++;
    else cur.substantiveDisagreements++;
   }
  }
  for(const c of CANDIDATES){
   const a=r1.candidateJudgments[c],b=r2.candidateJudgments[c];
   const cur=res.C36Candidates[c];
   cur.pairedReviews++;
   if(a==="SKIPPED"||b==="SKIPPED")cur.skippedEither++;
   if(a==="UNCLEAR"||b==="UNCLEAR")cur.unclearEither++;
   if(a===b){cur.agreements++;cur.agreedCodeCounts[a]++;}
   else cur.disagreements++;
   if(SUBSTANTIVE_C36.has(a)&&SUBSTANTIVE_C36.has(b)){
    cur.substantivePairedReviews++;
    if(a===b)cur.substantiveAgreements++;
    else cur.substantiveDisagreements++;
   }
  }
 }
 // Never count agreement on UNCLEAR or SKIPPED as substantive agreement.
 // Expose denominators explicitly; small/zero denominators do not imply validity.
 for(const cur of Object.values(res.pairResults))
  cur.substantiveAgreementRate=rate(cur.substantiveAgreements,cur.substantivePairedReviews);
 for(const cur of Object.values(res.C36Candidates))
  cur.substantiveAgreementRate=rate(cur.substantiveAgreements,cur.substantivePairedReviews);
 res.unreviewedSlots=plan.slots.length-res.pairedInterviewSlots;
 res.status=res.pairedInterviewSlots?
  "BLIND_CODER_COUNTS_NOT_VALIDATED":
   res.acceptedSheets?"AWAITING_SECOND_CODER":"NO_REAL_COGNITIVE_DATA";
 return res;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const inputs=process.argv.slice(2);
 const data=inputs.flatMap(f=>{
  const v=JSON.parse(readFileSync(f,"utf8"));
  return Array.isArray(v)?v:[v];
 });
 process.stdout.write(JSON.stringify(summarizeInterviewCodes(data),null,2)+"\n");
}
