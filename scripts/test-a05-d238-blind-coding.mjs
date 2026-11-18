import test from "node:test";
import assert from "node:assert/strict";
import {createInterviewPlan} from "./a05-d237-build-cognitive-interview-kit.mjs";
import {blankCodingSheet,summarizeInterviewCodes} from "./a05-d238-blind-coding-aggregator.mjs";
const plan=createInterviewPlan();
function filled(slot,rater,code="UNCLEAR"){
 const item=blankCodingSheet(slot,rater);
 item.consentConfirmed=true;
 for(const p of Object.values(item.pairJudgments)){
  p.code=code;p.criticalMisunderstanding=false;
 }
 for(const id of Object.keys(item.candidateJudgments))
  item.candidateJudgments[id]="UNCLEAR";
 return item;
}
const clone=structuredClone;
test("D238 no actual coder data is explicitly unvalidated",()=>{
 const a=summarizeInterviewCodes([]);
 assert.equal(a.status,"NO_REAL_COGNITIVE_DATA");
 assert.equal(a.pairedInterviewSlots,0);
 assert.equal(a.plannedSlots,24);
 assert.equal(a.automaticScoringApproval,false);
 assert.equal(a.requiresHumanReview,true);
 assert.equal(a.rawResponsesOutput,false);
 assert.equal(a.interviewNotesOutput,false);
});
test("D238 two coder sheets per planned slot, exact exposure, consensus counts",()=>{
 const data=plan.slots.flatMap(({slot})=>[
  filled(slot,"R1","SAME_REASON"),filled(slot,"R2","SAME_REASON")]);
 const a=summarizeInterviewCodes(data);
 assert.equal(a.inputSheets,48);
 assert.equal(a.acceptedSheets,48);
 assert.equal(a.rejectedSheets,0);
 assert.equal(a.pairedInterviewSlots,24);
 assert.equal(a.unreviewedSlots,0);
 assert.equal(a.awaitingSecondCoderSlots,0);
 for(const [pair,expected] of Object.entries(plan.pairExposure)){
  assert.equal(a.pairResults[pair].pairedReviews,expected,pair);
  assert.equal(a.pairResults[pair].agreements,expected);
  assert.equal(a.pairResults[pair].agreedCodeCounts.SAME_REASON,expected);
  assert.equal(a.pairResults[pair].disagreements,0);
 }
 for(const result of Object.values(a.C36Candidates)){
  assert.equal(result.pairedReviews,24);
  assert.equal(result.agreements,24);
 }
 assert.equal(a.status,"BLIND_CODER_COUNTS_NOT_VALIDATED");
});
test("D238 disagreement, P0 major misunderstanding and SKIPPED do not become auto-approvals",()=>{
 const one=filled("S01","R1","DISTINCT_REASON");
 const two=filled("S01","R2","DISTINCT_REASON");
 const pair=plan.slots[0].pairIds[0];
 one.pairJudgments[pair].code="SAME_REASON";
 two.pairJudgments[pair].criticalMisunderstanding=true;
 one.candidateJudgments["C36-R1"]="NEW_C_FACET";
 two.candidateJudgments["C36-R1"]="OVERLAPS_EXISTING";
 one.candidateJudgments["C36-R3"]="SKIPPED";
 const report=summarizeInterviewCodes([one,two]);
 assert.equal(report.pairedInterviewSlots,1);
 assert.equal(report.pairResults[pair].disagreements,1);
 assert.equal(report.pairResults[pair].criticalMisunderstandingEither,1);
 assert.equal(report.C36Candidates["C36-R1"].disagreements,1);
 assert.equal(report.C36Candidates["C36-R3"].skippedEither,1);
 assert.equal(report.automaticScoringApproval,false);
 assert.ok(!JSON.stringify(report).includes("S01"));
});
test("D238 one coder remains waiting; duplicate slot/rater rejected",()=>{
 const one=filled("S05","R1");
 const partial=summarizeInterviewCodes([one]);
 assert.equal(partial.awaitingSecondCoderSlots,1);
 assert.equal(partial.pairedInterviewSlots,0);
 assert.equal(partial.status,"AWAITING_SECOND_CODER");
 const a=summarizeInterviewCodes([one,clone(one),filled("S05","R2")]);
 assert.equal(a.acceptedSheets,2);
 assert.equal(a.rejectedSheets,1);
 assert.equal(a.rejectionReasons.duplicate_slot_rater,1);
 assert.equal(a.pairedInterviewSlots,1);
});
test("D238 strict shape rejects PII fields and forged/unknown pair or coding",()=>{
 const source=filled("S02","R1");
 const pair=plan.slots[1].pairIds[0];
 const candidates=[
  x=>x.consentConfirmed=false,
  x=>x.slot="S99",
  x=>x.raterCode="real name",
  x=>x.participantName="DO_NOT_OUTPUT_PERSON",
  x=>x.pairJudgments["UNKNOWN"]={code:"SAME_REASON",criticalMisunderstanding:false},
  x=>delete x.pairJudgments[pair],
  x=>x.pairJudgments[pair].code="APPROVED",
  x=>x.pairJudgments[pair].criticalMisunderstanding="no",
  x=>x.pairJudgments[pair].notes="identifying-information",
  x=>x.candidateJudgments["C36-R1"]="ACCEPTED",
  x=>x.candidateJudgments["C36-R4"]="NEW_C_FACET",
  x=>x.mode="PRODUCTION"
 ];
 const bad=candidates.map(fn=>{const x=clone(source);fn(x);return x;});
 const a=summarizeInterviewCodes(bad);
 assert.equal(a.inputSheets,candidates.length);
 assert.equal(a.acceptedSheets,0);
 assert.equal(a.rejectedSheets,candidates.length);
 assert.ok(!JSON.stringify(a).includes("DO_NOT_OUTPUT_PERSON"));
 assert.ok(!JSON.stringify(a).includes("identifying-information"));
});
test("D238 agreement excludes UNDECIDED and SKIPPED codes from substantive denominator",()=>{
 const s1=filled("S01","R1","UNCLEAR");
 const s2=filled("S01","R2","UNCLEAR");
 const pair=plan.slots[0].pairIds[0];
 const pair2=plan.slots[0].pairIds[1];
 s1.pairJudgments[pair].code="SAME_REASON";
 s2.pairJudgments[pair].code="SAME_REASON";
 s1.pairJudgments[pair2].code="DISTINCT_REASON";
 s2.pairJudgments[pair2].code="CONFOUNDED";
 s1.candidateJudgments["C36-R1"]="NEW_C_FACET";
 s2.candidateJudgments["C36-R1"]="NEW_C_FACET";
 s1.candidateJudgments["C36-R2"]="OVERLAPS_EXISTING";
 s2.candidateJudgments["C36-R2"]="OTHER_CONFOUND";
 s1.candidateJudgments["C36-R3"]="SKIPPED";
 const summary=summarizeInterviewCodes([s1,s2]);
 assert.equal(summary.pairResults[pair].substantivePairedReviews,1);
 assert.equal(summary.pairResults[pair].substantiveAgreementRate,1);
 assert.equal(summary.pairResults[pair2].substantivePairedReviews,1);
 assert.equal(summary.pairResults[pair2].substantiveAgreementRate,0);
 const other=plan.slots[0].pairIds[2];
 assert.equal(summary.pairResults[other].agreements,1); // both UNCLEAR
 assert.equal(summary.pairResults[other].substantivePairedReviews,0);
 assert.equal(summary.pairResults[other].substantiveAgreementRate,null);
 assert.equal(summary.C36Candidates["C36-R1"].substantiveAgreementRate,1);
 assert.equal(summary.C36Candidates["C36-R2"].substantiveAgreementRate,0);
 assert.equal(summary.C36Candidates["C36-R3"].substantiveAgreementRate,null);
});
test("D238 generated blank sheets are explicitly non-consented and unscored",()=>{
 const blank=blankCodingSheet("S01","R1");
 assert.equal(blank.consentConfirmed,false);
 assert.ok(Object.values(blank.pairJudgments).every(x=>x.code===null));
 assert.ok(Object.values(blank.candidateJudgments).every(x=>x===null));
 const report=summarizeInterviewCodes([blank]);
 assert.equal(report.acceptedSheets,0);
 assert.equal(report.rejectedSheets,1);
 assert.throws(()=>blankCodingSheet("S99","R1"));
 assert.throws(()=>blankCodingSheet("S01","THIRD_PARTY_NAME"));
});
