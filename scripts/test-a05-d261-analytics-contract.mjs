import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {aggregateFinalizedConsentedSessions} from "./a05-d261-analytics-contract.mjs";
const p="research/a05/analytics/schema_draft_v1.sql";
function submission(id,variant,version="form-v1"){
 const exposures=Array.from({length:30},(_,i)=>({
  questionId:"Q"+String(i+1).padStart(2,"0"),revision:1,phase:"CORE",
  responseCode:"SCALE_7",scaleValue:7
 }));
 return {submissionId:id,idempotencyKey:"key-"+id,analyticsConsent:true,
  completed30:true,questionnaireVersion:version,classificationVersion:"D255-1",
  manifestVariant:variant,exposures,
  classifications:{
   BASE_30:{outcome:"SINGLE_PROVISIONAL",typeId:"T02",source:"BASE_30"},
   FINAL_AFTER_YN:{outcome:"SINGLE_PROVISIONAL",typeId:"T02",source:"BASE_30"}
  }};
}
const row=(data,id,rev=1,phase="CORE",v="form-v1")=>
 data.questionMetrics.find(x=>x.questionnaireVersion===v&&x.questionId===id&&
 x.revision===rev&&x.phase===phase);
const typ=(data,phase,v="form-v1")=>
 data.typeMetrics.find(x=>x.questionnaireVersion===v&&x.phase===phase);
test("only actually presented questions form the denominator, across randomized variants",()=>{
 const a=submission("A","manifest-1"),b=submission("B","manifest-2");
 a.exposures[0]={questionId:"Q01",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
 b.exposures[0]={questionId:"Q01",revision:1,phase:"CORE",responseCode:"SCALE_7",scaleValue:7};
 a.exposures[1]={questionId:"Q02",revision:1,phase:"CORE",responseCode:"SCALE_7",scaleValue:4};
 b.exposures[1]={questionId:"Q31",revision:1,phase:"CORE",responseCode:"SKIP_NOT_APPLICABLE"};
 const d=aggregateFinalizedConsentedSessions([a,b]);
 assert.equal(d.uniqueConsentedCompleted,2);
 assert.equal(row(d,"Q01").shown,2);
 assert.equal(row(d,"Q01").unknownRate,0.5);
 assert.equal(row(d,"Q02").shown,1); // Q02 was not shown to B
 assert.equal(row(d,"Q02").midpointAmongScale7,1);
 assert.equal(row(d,"Q31").shown,1); // Q31 seen only by B
 assert.equal(row(d,"Q31").notApplicableRate,1);
 assert.equal(row(d,"Q31").unknownRate,0);
});
test("UNKNOWN, NOT_APPLICABLE, midpoint4 and YN UNSURE/NOT_ANSWERED must be distinct",()=>{
 const a=submission("A","v1");
 a.exposures[0]={questionId:"Q01",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
 a.exposures[1]={questionId:"Q02",revision:1,phase:"CORE",responseCode:"SKIP_NOT_APPLICABLE"};
 a.exposures[2]={questionId:"Q03",revision:1,phase:"CORE",responseCode:"SCALE_7",scaleValue:4};
 a.exposures.push({questionId:"Y01",revision:1,phase:"YN",responseCode:"YN_UNSURE"});
 a.exposures.push({questionId:"Y02",revision:1,phase:"YN",responseCode:"NOT_ANSWERED"});
 const d=aggregateFinalizedConsentedSessions([a]);
 assert.equal(row(d,"Q01").skipUnknown,1);
 assert.equal(row(d,"Q02").skipNotApplicable,1);
 assert.equal(row(d,"Q03").midpointAmongScale7,1);
 assert.equal(row(d,"Q03").unknownRate,0);
 assert.equal(row(d,"Y01",1,"YN").unsureAmongAnsweredYN,1);
 assert.equal(row(d,"Y02",1,"YN").unsureAmongAnsweredYN,null);
 assert.equal(row(d,"Y02",1,"YN").notAnswered,1);
});
test("question revision and questionnaire versions never silently merge",()=>{
 const a=submission("A","v1"),b=submission("B","v2"),c=submission("C","v3","form-v2");
 b.exposures[0].revision=2;
 const d=aggregateFinalizedConsentedSessions([a,b,c]);
 assert.equal(row(d,"Q01",1).shown,1);
 assert.equal(row(d,"Q01",2).shown,1);
 assert.equal(row(d,"Q01",1,"CORE","form-v2").shown,1);
});
test("16 types always have explicit zeros; all-completed and single-type shares differ",()=>{
 const a=submission("A","v1"),b=submission("B","v2");
 a.classifications.BASE_30={outcome:"MULTIPLE",typeId:null};
 a.classifications.FINAL_AFTER_YN={outcome:"SINGLE_PROVISIONAL",typeId:"T01",source:"YN_PROVISIONAL"};
 const d=aggregateFinalizedConsentedSessions([a,b]);
 const base=typ(d,"BASE_30"),final=typ(d,"FINAL_AFTER_YN");
 assert.equal(base.completedCount,2);
 assert.equal(base.singleCount,1);
 assert.equal(base.unresolvedShare,0.5);
 assert.equal(base.shareOfAllCompleted.T02,0.5);
 assert.equal(base.shareAmongSingle.T02,1);
 assert.equal(base.shareOfAllCompleted.T01,0);
 assert.equal(final.buckets.T01,1);
 assert.equal(final.buckets.T02,1);
 assert.equal(final.buckets.T16,0);
 assert.equal(final.shareOfAllCompleted.T01,0.5);
 assert.equal(final.shareAmongSingle.T01,0.5);
 assert.equal(final.bySource.YN_PROVISIONAL,1);
 assert.equal(d.ynRescueMetrics[0].ynRescued,1);
 assert.equal(d.ynRescueMetrics[0].rateAmongUnresolved30,1);
});
test("same idempotency key re-sent is counted once, contradictory retry rejected",()=>{
 const a=submission("A","v1");
 const d=aggregateFinalizedConsentedSessions([a,structuredClone(a)]);
 assert.equal(d.uniqueConsentedCompleted,1);
 assert.equal(row(d,"Q01").shown,1);
 const bad=structuredClone(a);bad.exposures[0].scaleValue=4;
 assert.throws(()=>aggregateFinalizedConsentedSessions([a,bad]),/conflicting duplicate/);
});
test("reject non-consent, incomplete, duplicate exposures, and numeric values for skip",()=>{
 const x=submission("A","v1");x.analyticsConsent=false;
 assert.throws(()=>aggregateFinalizedConsentedSessions([x]),/consented/);
 x.analyticsConsent=true;x.completed30=false;
 assert.throws(()=>aggregateFinalizedConsentedSessions([x]),/consented finalized/);
 x.completed30=true;x.exposures.push(structuredClone(x.exposures[0]));
 assert.throws(()=>aggregateFinalizedConsentedSessions([x]),/duplicate exposure/);
 x.exposures.pop();x.exposures[0]={questionId:"Q01",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN",scaleValue:4};
 assert.throws(()=>aggregateFinalizedConsentedSessions([x]),/skip cannot/);
});
test("SQL remains a disconnected DRAFT with required consent/rollup/review tables",()=>{
 const sql=readFileSync(p,"utf8");
 assert.match(sql,/NOT MIGRATED, NOT CONNECTED TO WEB/);
 for(const name of ["question_versions","questionnaire_versions","assessment_submissions",
 "question_exposures","classification_snapshots","axis_snapshots","daily_question_counts",
 "daily_type_counts","question_review_queue"])
  assert.ok(sql.includes("a05_analytics."+name),"Missing table "+name);
 assert.ok(sql.includes("consent_at timestamptz NOT NULL"));
 assert.ok(sql.includes("REVOKE ALL ON SCHEMA"));
});
