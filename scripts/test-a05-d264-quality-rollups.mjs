import test from "node:test";
import assert from "node:assert/strict";
import {buildOfflineQualityRollups,D264_PROPOSED_REVIEW_POLICY} from "./a05-d264-quality-rollups.mjs";

function session(n,{version="A05-V22-DRAFT",day="2026-11-20T00:30:00+09:00"}={}){
 return {submissionId:"synthetic-"+n,idempotencyKey:"synthetic-key-"+n,
  analyticsConsent:true,completed30:true,completedAt:day,
  questionnaireVersion:version,classificationVersion:"D255-1",
  manifestVariant:"synthetic-variant-"+(n%128),
  exposures:Array.from({length:30},(_,i)=>({
   questionId:"Q"+String(i+1).padStart(2,"0"),revision:1,phase:"CORE",
   responseCode:"SCALE_7",scaleValue:7
  })),
  classifications:{
   BASE_30:{outcome:"SINGLE_PROVISIONAL",typeId:"T01",source:"BASE_30"},
   FINAL_AFTER_YN:{outcome:"SINGLE_PROVISIONAL",typeId:"T01",source:"BASE_30"}
  }
 };
}
const daily=(r,id,v="A05-V22-DRAFT",rev=1)=>
 r.dailyQuestionCounts.find(q=>q.questionnaire_version===v&&q.question_id===id&&q.question_revision===rev);
const dailyTypes=(r,phase)=>
 r.dailyTypeCounts.filter(q=>q.phase===phase).reduce((n,q)=>n+q.n,0);

test("proposed high UNKNOWN threshold only emits manual REVIEW_CANDIDATE, never replacement",()=>{
 const a=Array.from({length:150},(_,i)=>session(i));
 for(let i=0;i<45;i++){
  a[i].exposures[0]={questionId:"Q01",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
 }
 const r=buildOfflineQualityRollups(a);
 assert.equal(r.uniqueConsentedCompleted,150);
 assert.equal(daily(r,"Q01").shown_count,150);
 assert.equal(daily(r,"Q01").skip_unknown,45);
 assert.equal(r.manualReviewCandidates.length,1);
 assert.equal(r.manualReviewCandidates[0].question_id,"Q01");
 assert.equal(r.manualReviewCandidates[0].unknown_rate,0.3);
 assert.equal(r.manualReviewCandidates[0].peer_unknown_rate,0);
 assert.equal(r.manualReviewCandidates[0].suggested_status,"REVIEW_CANDIDATE");
 assert.equal(r.manualReviewCandidates[0].action,"EDITOR_REVIEW_ONLY");
 assert.equal(r.policyStatus,"UNAPPROVED_EXAMPLE_REVIEW_ONLY");
 assert.equal(r.flags.autoReplacementEnabled,false);
 assert.equal(r.flags.dbConnected,false);
 assert.equal(r.flags.respondentDataCollectedByThisCode,false);
 assert.equal(r.reviewPolicy.version,D264_PROPOSED_REVIEW_POLICY.version);
 assert.equal(Object.hasOwn(r,"sessions"),false);
 assert.equal(Object.hasOwn(r,"submissionIds"),false);
});
test("small samples, lower rate, or similar peer rate do not flag",()=>{
 const small=Array.from({length:99},(_,i)=>session(i));
 for(let i=0;i<60;i++)small[i].exposures[0]={questionId:"Q01",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
 assert.equal(buildOfflineQualityRollups(small).manualReviewCandidates.length,0);
 const low=Array.from({length:150},(_,i)=>session(i));
 for(let i=0;i<35;i++)low[i].exposures[0]={questionId:"Q01",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
 assert.equal(buildOfflineQualityRollups(low).manualReviewCandidates.length,0);
 const peer=Array.from({length:150},(_,i)=>session(i));
 for(let i=0;i<45;i++){
  peer[i].exposures[0]={questionId:"Q01",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[1]={questionId:"Q02",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[2]={questionId:"Q03",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[3]={questionId:"Q04",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[4]={questionId:"Q05",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[5]={questionId:"Q06",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[6]={questionId:"Q07",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[7]={questionId:"Q08",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[8]={questionId:"Q09",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[9]={questionId:"Q10",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[10]={questionId:"Q11",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[11]={questionId:"Q12",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[12]={questionId:"Q13",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[13]={questionId:"Q14",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[14]={questionId:"Q15",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[15]={questionId:"Q16",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[16]={questionId:"Q17",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[17]={questionId:"Q18",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[18]={questionId:"Q19",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[19]={questionId:"Q20",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[20]={questionId:"Q21",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[21]={questionId:"Q22",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[22]={questionId:"Q23",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[23]={questionId:"Q24",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[24]={questionId:"Q25",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[25]={questionId:"Q26",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[26]={questionId:"Q27",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[27]={questionId:"Q28",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[28]={questionId:"Q29",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
  peer[i].exposures[29]={questionId:"Q30",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
 }
 assert.equal(buildOfflineQualityRollups(peer).manualReviewCandidates.length,0);
});
test("JST days, questionnaire versions and question revisions remain distinct",()=>{
 const a=session("a",{day:"2026-11-19T14:50:00Z"});
 const b=session("b",{day:"2026-11-19T15:10:00Z"});
 const c=session("c",{version:"VOTHER",day:"2026-11-19T15:10:00Z"});
 b.exposures[0].revision=2;
 const r=buildOfflineQualityRollups([a,b,c]);
 const q=r.dailyQuestionCounts.filter(x=>x.question_id==="Q01");
 assert.equal(q.length,3);
 assert.deepEqual(q.map(x=>x.day_jst).sort(),["2026-11-19","2026-11-20","2026-11-20"]);
 assert.equal(q.find(x=>x.question_revision===2).shown_count,1);
 assert.equal(q.find(x=>x.questionnaire_version==="VOTHER").shown_count,1);
 assert.equal(dailyTypes(r,"BASE_30"),3);
 assert.equal(dailyTypes(r,"FINAL_AFTER_YN"),3);
});
test("both type denominators retain unresolved and YN-rescued as distinct",()=>{
 const a=session("a"),b=session("b"),c=session("c"),d=session("d");
 b.classifications.BASE_30={outcome:"MULTIPLE",typeId:null};
 b.classifications.FINAL_AFTER_YN={outcome:"SINGLE_PROVISIONAL",typeId:"T03",source:"YN_PROVISIONAL"};
 c.classifications.BASE_30={outcome:"NO_INFORMATION",typeId:null};
 c.classifications.FINAL_AFTER_YN={outcome:"NO_INFORMATION",typeId:null};
 d.classifications.BASE_30={outcome:"SINGLE_PROVISIONAL",typeId:"T16",source:"BASE_30"};
 d.classifications.FINAL_AFTER_YN={outcome:"SINGLE_PROVISIONAL",typeId:"T16",source:"BASE_30"};
 const r=buildOfflineQualityRollups([a,b,c,d]);
 const base=r.typeDistribution.find(x=>x.phase==="BASE_30");
 const fin=r.typeDistribution.find(x=>x.phase==="FINAL_AFTER_YN");
 assert.equal(base.completedCount,4);
 assert.equal(base.singleCount,2);
 assert.equal(base.shareOfAllCompleted.T01,0.25);
 assert.equal(base.shareAmongSingle.T01,0.5);
 assert.equal(fin.completedCount,4);
 assert.equal(fin.singleCount,3);
 assert.equal(fin.shareOfAllCompleted.T03,0.25);
 assert.equal(fin.shareAmongSingle.T03,1/3);
 assert.equal(fin.unresolvedShare,0.25);
 assert.equal(dailyTypes(r,"BASE_30"),4);
 assert.equal(dailyTypes(r,"FINAL_AFTER_YN"),4);
 assert.equal(r.dailyTypeCounts.find(x=>x.type_bucket==="T03").source_bucket,"YN_PROVISIONAL");
 assert.equal(r.ynRescueMetrics[0].ynRescued,1);
});
test("retries do not inflate counts or type shares; conflicting retries rejected",()=>{
 const a=session("a");
 const r=buildOfflineQualityRollups([a,structuredClone(a)]);
 assert.equal(r.uniqueConsentedCompleted,1);
 assert.equal(daily(r,"Q01").shown_count,1);
 assert.equal(dailyTypes(r,"BASE_30"),1);
 const x=structuredClone(a);x.exposures[0].scaleValue=2;
 assert.throws(()=>buildOfflineQualityRollups([a,x]),/conflicting duplicate/);
});
test("Y/N UNSURE and NOT_ANSWERED stay separate, no raw identifiers exported",()=>{
 const a=session("a");
 a.exposures.push({questionId:"YN-A",revision:1,phase:"YN",responseCode:"YN_UNSURE"});
 a.exposures.push({questionId:"YN-B",revision:1,phase:"YN",responseCode:"NOT_ANSWERED"});
 const r=buildOfflineQualityRollups([a]);
 const ynA=r.dailyQuestionCounts.find(q=>q.question_id==="YN-A");
 const ynB=r.dailyQuestionCounts.find(q=>q.question_id==="YN-B");
 assert.equal(ynA.yn_unsure,1);
 assert.equal(ynA.not_answered,0);
 assert.equal(ynB.not_answered,1);
 assert.equal(ynB.yn_unsure,0);
 const str=JSON.stringify(r);
 assert.equal(str.includes("synthetic-key-a"),false);
 assert.equal(str.includes('"submissionId"'),false);
 assert.equal(str.includes("synthetic-a"),false);
});
test("reject missing consent, unzoned timestamps, invalid policy and pre-30 YN typing",()=>{
 const a=session("a");a.analyticsConsent=false;
 assert.throws(()=>buildOfflineQualityRollups([a]),/consented/);
 a.analyticsConsent=true;a.completedAt="2026-11-20T12:00:00";
 assert.throws(()=>buildOfflineQualityRollups([a]),/explicit timezone/);
 a.completedAt="2026-11-20T12:00:00+09:00";
 a.classifications.BASE_30.source="YN_PROVISIONAL";
 assert.throws(()=>buildOfflineQualityRollups([a]),/cannot originate from Y\/N/);
 a.classifications.BASE_30.source="BASE_30";
 assert.throws(()=>buildOfflineQualityRollups([a],{reviewPolicy:{...D264_PROPOSED_REVIEW_POLICY,unknownRateAtLeast:1.5}}),/invalid proposed/);
});
