/**
 * A05 D261 - PURE, offline test contract for analytics rollup semantics.
 * No network, database connection, browser hooks or personal data capture.
 * NOT a production collection endpoint. All inputs below are caller supplied.
 */
export const ANALYTICS_CONTRACT_VERSION="A05-D261-ANALYTICS-CONTRACT-DRAFT-1";
const PHASES=["BASE_30","FINAL_AFTER_YN"];
const TYPES=Array.from({length:16},(_,i)=>"T"+String(i+1).padStart(2,"0"));
const RESPONSES=new Set(["SCALE_7","SKIP_UNKNOWN","SKIP_NOT_APPLICABLE",
 "YN_YES","YN_NO","YN_UNSURE","NOT_ANSWERED"]);
const key=(...parts)=>JSON.stringify(parts);
const requireThat=(p,msg)=>{if(!p)throw Error("D261: "+msg);};
function counter(){
 return {shown:0,c1:0,c2:0,c3:0,c4:0,c5:0,c6:0,c7:0,
  skipUnknown:0,skipNotApplicable:0,ynYes:0,ynNo:0,ynUnsure:0,notAnswered:0};
}
export function aggregateFinalizedConsentedSessions(sessions){
 requireThat(Array.isArray(sessions),"sessions must be array");
 const bySubmission=new Map(),byIdempotency=new Map();
 const items=new Map(),types=new Map(),rescue=new Map();
 const ensureTypes=(form,algorithm,phase)=>{
  const k=key(form,algorithm,phase);
  if(!types.has(k))types.set(k,{
   questionnaireVersion:form,classificationVersion:algorithm,phase,
   singleCount:0,completedCount:0,multipleCount:0,noInformationCount:0,
   buckets:Object.fromEntries(TYPES.map(type=>[type,0])),
   bySource:{BASE_30:0,YN_PROVISIONAL:0}
  });
  return types.get(k);
 };
 for(const session of sessions){
  requireThat(typeof session==="object"&&session!==null,"invalid session");
  const {submissionId,idempotencyKey,questionnaireVersion,classificationVersion,
   analyticsConsent,completed30,exposures,classifications}=session;
  for(const [name,value] of Object.entries({submissionId,idempotencyKey,questionnaireVersion,classificationVersion}))
   requireThat(typeof value==="string"&&value.length>0,"missing "+name);
  requireThat(analyticsConsent===true&&completed30===true,"only consented finalized submissions allowed");
  requireThat(Array.isArray(exposures)&&exposures.length>=30,"all 30 CORE exposures required");
  const signature=JSON.stringify(session);
  if(bySubmission.has(submissionId)||byIdempotency.has(idempotencyKey)){
   requireThat(bySubmission.get(submissionId)===signature&&
    byIdempotency.get(idempotencyKey)===signature,
    "conflicting duplicate submission or idempotency key");
   continue;
  }
  bySubmission.set(submissionId,signature);
  byIdempotency.set(idempotencyKey,signature);
  const seenItems=new Set();
  let coreN=0;
  for(const e of exposures){
   requireThat(typeof e.questionId==="string"&&e.questionId.length>0&&
    Number.isInteger(e.revision)&&e.revision>=1,"invalid question version");
   requireThat(e.phase==="CORE"||e.phase==="YN","invalid exposure phase");
   requireThat(RESPONSES.has(e.responseCode),"unrecognized response code");
   const k1=key(e.questionId,e.revision);
   requireThat(!seenItems.has(k1),"duplicate exposure within submission");
   seenItems.add(k1);
   if(e.phase==="CORE"){
    coreN++;
    requireThat(["SCALE_7","SKIP_UNKNOWN","SKIP_NOT_APPLICABLE"].includes(e.responseCode),
     "CORE answer is not 7-scale or explicit skip");
    if(e.responseCode==="SCALE_7")
     requireThat(Number.isInteger(e.scaleValue)&&e.scaleValue>=1&&e.scaleValue<=7,
      "invalid 7-scale value");
    else requireThat(e.scaleValue===undefined||e.scaleValue===null,"skip cannot have numeric value");
   }else{
    requireThat(["YN_YES","YN_NO","YN_UNSURE","NOT_ANSWERED"].includes(e.responseCode),
     "Y/N answer is not YES/NO/UNSURE or unanswered");
   }
   const k=key(questionnaireVersion,e.questionId,e.revision,e.phase);
   if(!items.has(k))items.set(k,{
    questionnaireVersion,questionId:e.questionId,revision:e.revision,phase:e.phase,
    ...counter()
   });
   const row=items.get(k);
   row.shown++;
   const codeMap={SKIP_UNKNOWN:"skipUnknown",SKIP_NOT_APPLICABLE:"skipNotApplicable",
    YN_YES:"ynYes",YN_NO:"ynNo",YN_UNSURE:"ynUnsure",NOT_ANSWERED:"notAnswered"};
   if(e.responseCode==="SCALE_7")row["c"+e.scaleValue]++;
   else row[codeMap[e.responseCode]]++;
  }
  requireThat(coreN===30,"exactly 30 CORE exposures required");
  requireThat(classifications&&typeof classifications==="object","missing classification results");
  for(const phase of PHASES){
   const c=classifications[phase];
   requireThat(c&&["SINGLE_PROVISIONAL","MULTIPLE","NO_INFORMATION"].includes(c.outcome),
    "invalid "+phase+" classification outcome");
   const row=ensureTypes(questionnaireVersion,classificationVersion,phase);
   row.completedCount++;
   if(c.outcome==="SINGLE_PROVISIONAL"){
    requireThat(TYPES.includes(c.typeId),"single result requires one of T01..T16");
    requireThat(["BASE_30","YN_PROVISIONAL"].includes(c.source),"missing classification source");
    row.singleCount++;row.buckets[c.typeId]++;row.bySource[c.source]++;
   }else{
    requireThat(c.typeId==null,"unresolved result must not invent a type ID");
    if(c.outcome==="MULTIPLE")row.multipleCount++;
    else row.noInformationCount++;
   }
  }
  const rkey=key(questionnaireVersion,classificationVersion);
  if(!rescue.has(rkey))rescue.set(rkey,{
   questionnaireVersion,classificationVersion,unresolvedAt30:0,ynRescued:0
  });
  const r=rescue.get(rkey),base=classifications.BASE_30,fin=classifications.FINAL_AFTER_YN;
  if(base.outcome!=="SINGLE_PROVISIONAL"){
   r.unresolvedAt30++;
   if(fin.outcome==="SINGLE_PROVISIONAL"&&fin.source==="YN_PROVISIONAL")r.ynRescued++;
  }
 }
 const questionMetrics=[...items.values()].map(row=>{
  const scale7=Array.from({length:7},(_,i)=>row["c"+(i+1)])
   .reduce((a,b)=>a+b,0);
  const ynAnswered=row.ynYes+row.ynNo+row.ynUnsure;
  return {...row,unknownRate:row.phase==="CORE"?row.skipUnknown/row.shown:null,
   notApplicableRate:row.phase==="CORE"?row.skipNotApplicable/row.shown:null,
   midpointAmongScale7:scale7?row.c4/scale7:null,
   unsureAmongAnsweredYN:ynAnswered?row.ynUnsure/ynAnswered:null,
   scale7Answered:scale7,ynAnswered};
 }).sort((a,b)=>key(a.questionnaireVersion,a.questionId,a.revision,a.phase)
 .localeCompare(key(b.questionnaireVersion,b.questionId,b.revision,b.phase)));
 const typeMetrics=[...types.values()].map(row=>({...row,
  shareOfAllCompleted:Object.fromEntries(TYPES.map(t=>[t,row.buckets[t]/row.completedCount])),
  shareAmongSingle:Object.fromEntries(TYPES.map(t=>[t,row.singleCount?row.buckets[t]/row.singleCount:null])),
  unresolvedShare:(row.multipleCount+row.noInformationCount)/row.completedCount
 })).sort((a,b)=>key(a.questionnaireVersion,a.classificationVersion,a.phase)
 .localeCompare(key(b.questionnaireVersion,b.classificationVersion,b.phase)));
 const ynRescueMetrics=[...rescue.values()].map(r=>({...r,
  rateAmongUnresolved30:r.unresolvedAt30?r.ynRescued/r.unresolvedAt30:null}));
 return {version:ANALYTICS_CONTRACT_VERSION,uniqueConsentedCompleted:bySubmission.size,
  questionMetrics,typeMetrics,ynRescueMetrics,realUserDataCollected:false};
}
