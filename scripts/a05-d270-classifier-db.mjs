/**
 * A05 D270: D269 research classifier integrated with disposable D267-era tables.
 * TEST-ONLY. NO production endpoint, no genuine user consent or data.
 */
import {randomBytes,createHash,timingSafeEqual} from "node:crypto";
import {BANK} from "./a05-d208-research-sampler.mjs";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {PROBES} from "./a05-d243-midpoint-yn-research.mjs";
import {D255_VERSION} from "./a05-d255-yn-provisional-classifier.mjs";
import {d269ServerClassify} from "./a05-d269-server-reference.mjs";

export const D270_VERSION="A05-D270-REAL-RESEARCH-CLASSIFIER-SYNTHETIC-CI";
export const D270_QUESTIONNAIRE="D270_SYNTHETIC_REAL_A05_CI";
export const D270_CONSENT="D270_FAKE_CONSENT_CI_ONLY";
export const D270_MARKER="D270_SYNTHETIC_NO_HUMAN_RESPONSES";
const sha=x=>createHash("sha256").update(x).digest("hex");
const err=(status,message)=>Object.assign(new Error(message),{status});
const guard=(valid,message)=>{if(!valid)throw err(422,message);};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const forms=Array.from({length:128},(_,i)=>drawResearchHoldFilteredManifest("D219-simple-"+String(i).padStart(3,"0")));
const ynProbes=PROBES.axes.flatMap(a=>[...a.initial,...a.context].map(q=>({...q,axis:a.axis})));
const ynLookup=new Map(ynProbes.map(q=>[q.id,q]));
const fromCode={YN_YES:"YES",YN_NO:"NO",YN_UNSURE:"UNSURE"};
const fields=(o,keys)=>o&&typeof o==="object"&&!Array.isArray(o)&&
 Object.keys(o).sort().join("|")===keys.slice().sort().join("|");
const same=(a,b)=>{
 if(typeof a!=="string"||typeof b!=="string")return false;
 const x=Buffer.from(a),y=Buffer.from(b);
 return x.length>0&&x.length===y.length&&timingSafeEqual(x,y);
};
function ciOnly(){
 if(process.env.A05_D270_SANDBOX_MODE!=="synthetic-ephemeral-ci"||
 process.env.PGDATABASE!=="a05_d270_ci"||process.env.PGHOST!=="127.0.0.1")
 throw Error("D270 refuses execution outside disposable loopback PostgreSQL CI sandbox");
}
export function validateD270Fixture(p,now=new Date()){
 ciOnly();
 guard(fields(p,["sandboxOnly","submissionId","idempotencyKey","questionnaireVersion",
  "manifestIndex","consent","exposures"]),"Unexpected or missing input fields");
 guard(p.sandboxOnly===D270_MARKER&&p.questionnaireVersion===D270_QUESTIONNAIRE,
  "Never accept non-synthetic submissions");
 guard(uuid.test(p.submissionId)&&uuid.test(p.idempotencyKey)&&
  p.submissionId!==p.idempotencyKey,"Distinct random UUIDs required");
 guard(Number.isInteger(p.manifestIndex)&&p.manifestIndex>=0&&p.manifestIndex<128,
  "Invalid A05 manifest index");
 guard(fields(p.consent,["consented","policyVersion","consentAt"])&&
  p.consent.consented===true&&p.consent.policyVersion===D270_CONSENT,
  "CI-only fake consent fixture is required");
 const at=p.consent.consentAt;
 guard(typeof at==="string"&&/^\d{4}-\d\d-\d\dT/.test(at)&&
  /(?:Z|[+-]\d\d:\d\d)$/.test(at),"Timezone-qualified fake consent required");
 const t=new Date(at).getTime();
 guard(Number.isFinite(t)&&t<=now.getTime()&&now.getTime()-t<3600000,
  "Fake consent timestamp expired or in future");
 const ex=p.exposures,form=forms[p.manifestIndex];
 guard(Array.isArray(ex)&&ex.length>=30&&ex.length<=38,"30 CORE + max 8 Y/N only");
 const values=[],skipKinds=[];
 for(let i=0;i<30;i++){
  const e=ex[i],q=form.questions[i];
  guard(fields(e,["questionId","revision","phase","responseCode","scaleValue"])||
   fields(e,["questionId","revision","phase","responseCode"]),
   "Unexpected CORE fields");
  guard(e.questionId===q.id&&e.revision===1&&e.phase==="CORE",
   "Wrong question/revision/ordinal/manifest");
  if(e.responseCode==="SCALE_7"){
   guard(Number.isInteger(e.scaleValue)&&e.scaleValue>=1&&e.scaleValue<=7,
    "SCALE_7 requires integer 1-7");
   values.push(e.scaleValue);skipKinds.push(null);
  }else{
   guard(["SKIP_UNKNOWN","SKIP_NOT_APPLICABLE"].includes(e.responseCode)&&
    (e.scaleValue===undefined||e.scaleValue===null),
    "Unknown and not-applicable skips must remain distinct");
   values.push(null);
   skipKinds.push(e.responseCode==="SKIP_UNKNOWN"?"UNKNOWN":"NOT_APPLICABLE");
  }
 }
 const initial=d269ServerClassify({manifestIndex:p.manifestIndex,values,skipKinds});
 const ynState={responses:{},reasons:{}};
 let latest=initial,offset=30;
 while(offset<ex.length){
  const offered=latest.next;
  guard(offered&&offered.questions.length>0&&offset+offered.questions.length<=ex.length,
   "Only complete D255-offered Y/N batches may be saved");
  for(let j=0;j<offered.questions.length;j++){
   const e=ex[offset+j];
   guard(fields(e,["questionId","revision","phase","responseCode"])||
    fields(e,["questionId","revision","phase","responseCode","scaleValue"]),
    "Unexpected Y/N fields");
   guard(e.questionId===offered.questions[j].id&&e.revision===1&&e.phase==="YN"&&
    Object.hasOwn(fromCode,e.responseCode)&&
    (e.scaleValue===undefined||e.scaleValue===null),"Y/N must match D255 offer order");
   ynState.responses[e.questionId]=fromCode[e.responseCode];
  }
  offset+=offered.questions.length;
  latest=d269ServerClassify({manifestIndex:p.manifestIndex,values,skipKinds,ynState});
 }
 guard(JSON.stringify(latest.stats)===JSON.stringify(initial.stats)&&
  JSON.stringify(latest.candidateIds)===JSON.stringify(initial.candidateIds),
  "Y/N must not change 30Q evidence");
 return {initial,latest,form,values,skipKinds,ynState,
  ynCount:ex.length-30};
}
function classified(ids,source){
 return ids.length===1?{outcome:"SINGLE_PROVISIONAL",typeId:ids[0],candidateCount:1,source}:
 {outcome:ids.length===16?"NO_INFORMATION":"MULTIPLE",
  typeId:null,candidateCount:ids.length,source:"UNCLASSIFIED"};
}
export function d270StorageClassification(v){
 const base=classified(v.initial.candidateIds,"BASE_30");
 const final=classified(v.latest.yn.candidateIds,
  v.latest.yn.ynDeterminedAxes?"YN_PROVISIONAL":"BASE_30");
 return {base,final,ynAxes:v.latest.yn.ynDeterminedAxes,
  classificationVersion:D255_VERSION};
}
export async function seedD270Bank(pool){
 ciOnly();
 if(BANK.items.length!==50||ynProbes.length!==16||forms.length!==128)
  throw Error("D270 bank/probe/manifest source drift");
 const db=await pool.connect();
 try{
  await db.query("BEGIN");
  await db.query("INSERT INTO a05_analytics.questionnaire_versions (questionnaire_version,question_bank_version,scoring_version,classifier_version,ui_version,version_source_commit) VALUES ($1,$2,$3,$4,$5,$6)",
   [D270_QUESTIONNAIRE,BANK.schema,"A05-D242-POWER-1_5-RESEARCH-PREVIEW-1",
    D255_VERSION,"A05-D262-RESULT-EVIDENCE-V2_2-1","5b72200b19ac7aedf74d69ef2c6219bd4890100b"]);
  for(const q of BANK.items){
   await db.query("INSERT INTO a05_analytics.question_versions (question_id,revision,axis,response_format,content_sha256,semantic_family) VALUES ($1,1,$2,'SCALE_7',$3,$4)",
    [q.bank_id,q.axis,sha(JSON.stringify([q.axis,q.stem,q.left,q.right])),
     q.proposed_semantic_family||q.axis]);
  }
  for(const q of ynProbes){
   await db.query("INSERT INTO a05_analytics.question_versions (question_id,revision,axis,response_format,content_sha256,semantic_family) VALUES ($1,1,$2,'YN',$3,$4)",
    [q.id,q.axis,sha(JSON.stringify([q.axis,q.prompt])),"D243_YN_RESEARCH_ONLY"]);
  }
  await db.query("COMMIT");
  return {coreBank:50,ynBank:16,forms:128};
 }catch(e){await db.query("ROLLBACK");throw e;}finally{db.release();}
}
async function audit(db,role,action,outcome,count=0){
 await db.query("INSERT INTO a05_analytics.d267_synthetic_audit (actor_role,action,outcome,number_affected) VALUES ($1,$2,$3,$4)",
  [role,action,outcome,count]);
}
async function transaction(pool,fn){
 const db=await pool.connect();
 try{
  await db.query("BEGIN");
  await db.query("SELECT pg_advisory_xact_lock(267,1)");
  const result=await fn(db);
  await db.query("COMMIT");return result;
 }catch(e){await db.query("ROLLBACK");throw e;}finally{db.release();}
}
async function rebuild(db){
 await db.query("DELETE FROM a05_analytics.daily_question_counts WHERE questionnaire_version=$1",[D270_QUESTIONNAIRE]);
 await db.query("INSERT INTO a05_analytics.daily_question_counts (day_jst,questionnaire_version,question_id,question_revision,phase,shown_count,c1,c2,c3,c4,c5,c6,c7,skip_unknown,skip_not_applicable,yn_yes,yn_no,yn_unsure,not_answered) SELECT (s.received_at AT TIME ZONE 'Asia/Tokyo')::date,s.questionnaire_version,q.question_id,q.question_revision,q.phase,count(*)::bigint,count(*) FILTER(WHERE response_code='SCALE_7' AND scale_value=1),count(*) FILTER(WHERE response_code='SCALE_7' AND scale_value=2),count(*) FILTER(WHERE response_code='SCALE_7' AND scale_value=3),count(*) FILTER(WHERE response_code='SCALE_7' AND scale_value=4),count(*) FILTER(WHERE response_code='SCALE_7' AND scale_value=5),count(*) FILTER(WHERE response_code='SCALE_7' AND scale_value=6),count(*) FILTER(WHERE response_code='SCALE_7' AND scale_value=7),count(*) FILTER(WHERE response_code='SKIP_UNKNOWN'),count(*) FILTER(WHERE response_code='SKIP_NOT_APPLICABLE'),count(*) FILTER(WHERE response_code='YN_YES'),count(*) FILTER(WHERE response_code='YN_NO'),count(*) FILTER(WHERE response_code='YN_UNSURE'),count(*) FILTER(WHERE response_code='NOT_ANSWERED') FROM a05_analytics.assessment_submissions s JOIN a05_analytics.question_exposures q USING(submission_id) WHERE s.questionnaire_version=$1 GROUP BY 1,2,3,4,5",[D270_QUESTIONNAIRE]);
 await db.query("DELETE FROM a05_analytics.daily_type_counts WHERE questionnaire_version=$1",[D270_QUESTIONNAIRE]);
 await db.query("INSERT INTO a05_analytics.daily_type_counts (day_jst,questionnaire_version,phase,classification_version,type_bucket,source_bucket,n) SELECT (s.received_at AT TIME ZONE 'Asia/Tokyo')::date,s.questionnaire_version,c.phase,c.classification_version,CASE WHEN c.outcome='SINGLE_PROVISIONAL' THEN c.type_id ELSE c.outcome END,CASE WHEN c.outcome='SINGLE_PROVISIONAL' THEN CASE WHEN c.yn_supplemented_axes>0 THEN 'YN_PROVISIONAL' ELSE 'BASE_30' END ELSE 'UNCLASSIFIED' END,count(*)::bigint FROM a05_analytics.assessment_submissions s JOIN a05_analytics.classification_snapshots c USING(submission_id) WHERE s.questionnaire_version=$1 GROUP BY 1,2,3,4,5,6",[D270_QUESTIONNAIRE]);
}
export async function d270Accept(pool,payload,now){
 const v=validateD270Fixture(payload,now),c=d270StorageClassification(v);
 const digest=sha(JSON.stringify(payload));
 return transaction(pool,async db=>{
  const old=await db.query("SELECT submission_id,idempotency_key,payload_sha256,state FROM a05_analytics.d267_synthetic_receipts WHERE submission_id=$1 OR idempotency_key=$2 FOR UPDATE",
   [payload.submissionId,payload.idempotencyKey]);
  if(old.rowCount){
   const r=old.rows[0];
   if(r.state==="ACTIVE"&&r.submission_id===payload.submissionId&&
      r.idempotency_key===payload.idempotencyKey&&r.payload_sha256===digest){
    await audit(db,"ingestion-service","SUBMISSION_RETRIED","OK");
    return {status:200,body:{synthetic:true,state:"already-accepted"}};
   }
   await audit(db,"ingestion-service","SUBMISSION_REJECTED","CONFLICT");
   return {status:409,body:{error:"Conflicting or deleted synthetic submission"}};
  }
  const token=randomBytes(32).toString("hex");
  await db.query("INSERT INTO a05_analytics.d267_synthetic_receipts (submission_id,idempotency_key,payload_sha256,deletion_token_sha256) VALUES($1,$2,$3,$4)",
   [payload.submissionId,payload.idempotencyKey,digest,sha(token)]);
  await db.query("INSERT INTO a05_analytics.assessment_submissions (submission_id,idempotency_key,questionnaire_version,manifest_variant,consent_at,consent_policy_version,completion_status) VALUES($1,$2,$3,$4,$5,$6,$7)",
   [payload.submissionId,payload.idempotencyKey,D270_QUESTIONNAIRE,
    v.form.seed,payload.consent.consentAt,D270_CONSENT,
    v.ynCount===0?"CORE_COMPLETE":v.latest.next?"YN_PARTIAL":"YN_COMPLETE"]);
  for(let i=0;i<payload.exposures.length;i++){
   const e=payload.exposures[i];
   await db.query("INSERT INTO a05_analytics.question_exposures (submission_id,question_id,question_revision,phase,ordinal,response_code,scale_value) VALUES($1,$2,1,$3,$4,$5,$6)",
    [payload.submissionId,e.questionId,e.phase,i<30?i+1:i-29,
     e.responseCode,e.responseCode==="SCALE_7"?e.scaleValue:null]);
  }
  for(const [phase,entry,ynAxes] of [["BASE_30",c.base,0],["FINAL_AFTER_YN",c.final,c.ynAxes]]){
   await db.query("INSERT INTO a05_analytics.classification_snapshots (submission_id,phase,classification_version,outcome,type_id,candidate_count,yn_supplemented_axes) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [payload.submissionId,phase,D255_VERSION,entry.outcome,entry.typeId,entry.candidateCount,ynAxes]);
  }
  for(const phase of ["BASE_30","FINAL_AFTER_YN"]){
   for(let index=0;index<4;index++){
    const s=v.initial.stats[index],yn=v.latest.yn.axes[index];
    const core=v.form.questions.filter(q=>q.axis===s.axis);
    const exposures=core.map(q=>payload.exposures.find(e=>e.questionId===q.id));
    const unknown=exposures.filter(e=>e.responseCode==="SKIP_UNKNOWN").length;
    const na=exposures.filter(e=>e.responseCode==="SKIP_NOT_APPLICABLE").length;
    const mid=exposures.filter(e=>e.scaleValue===4).length;
    const final=phase==="FINAL_AFTER_YN";
    await db.query("INSERT INTO a05_analytics.axis_snapshots (submission_id,phase,axis,direction,evidence_source,research_axis_status,signed_score_ratio,shown_count,valid_7_count,directional_7_count,midpoint_4_count,unknown_count,not_applicable_count,item_flip_count,family_flip_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)",
     [payload.submissionId,phase,s.axis,
      final?yn.sign:(s.status==="clear"?s.sign:0),
      final?yn.source:(s.status==="clear"?"BASE_30":"UNRESOLVED"),
      final?yn.reason:s.status,s.n?s.ratio:null,
      s.presented,s.n,s.directionalCurrent,mid,unknown,na,
      s.itemFlipCount,s.familyFlipCount]);
   }
  }
  await rebuild(db);
  await audit(db,"ingestion-service","SUBMISSION_ACCEPTED","OK",1);
  return {status:201,body:{synthetic:true,state:"accepted",submissionId:payload.submissionId,
   deletionToken:token,
   classification:{base:c.base,final:c.final,ynDeterminedAxes:c.ynAxes},
   disclaimer:"Synthetic-only reference classifier, no real consent or production scoring"}};
 });
}
export async function d270Delete(pool,id,token){
 if(!uuid.test(id)||typeof token!=="string"||!/^[a-f0-9]{64}$/.test(token))
  throw err(404,"Not found");
 return transaction(pool,async db=>{
  const r=await db.query("SELECT r.state,r.deletion_token_sha256,s.questionnaire_version FROM a05_analytics.d267_synthetic_receipts r LEFT JOIN a05_analytics.assessment_submissions s USING(submission_id) WHERE r.submission_id=$1 FOR UPDATE OF r",[id]);
  if(r.rowCount!==1||r.rows[0].state!=="ACTIVE"||
    r.rows[0].questionnaire_version!==D270_QUESTIONNAIRE||
    !same(r.rows[0].deletion_token_sha256,sha(token))){
   await audit(db,"anonymous","DELETE_DENIED","DENIED");return false;
  }
  await db.query("DELETE FROM a05_analytics.assessment_submissions WHERE submission_id=$1",[id]);
  await db.query("UPDATE a05_analytics.d267_synthetic_receipts SET state='DELETED',deleted_at=now(),payload_sha256=NULL,deletion_token_sha256=NULL WHERE submission_id=$1",[id]);
  await rebuild(db);
  await audit(db,"anonymous","DELETE_COMPLETED","OK",1);
  return true;
 });
}
export async function d270Rebuild(pool){
 return transaction(pool,async db=>{
  await rebuild(db);
  await audit(db,"aggregator","ROLLUP_REBUILT","OK");
  return {synthetic:true,recomputed:true};
 });
}
export async function d270Metrics(pool){
 const [c,q,t]=await Promise.all([
  pool.query("SELECT count(*)::int AS n FROM a05_analytics.assessment_submissions WHERE questionnaire_version=$1",[D270_QUESTIONNAIRE]),
  pool.query("SELECT question_id,phase,shown,unknown_n,not_applicable_n,midpoint_n,scale_7_n,yn_answered_n,yn_not_answered_n,unknown_per_exposed,midpoint_per_valid7,unsure_per_answered_yn FROM a05_analytics.question_metrics WHERE questionnaire_version=$1 ORDER BY phase,question_id",[D270_QUESTIONNAIRE]),
  pool.query("SELECT phase,classification_version,type_bucket,n,all_completed_n,single_type_n,share_of_all_completed,share_among_single_types FROM a05_analytics.type_distribution_metrics WHERE questionnaire_version=$1 ORDER BY phase,type_bucket",[D270_QUESTIONNAIRE])
 ]);
 return {synthetic:true,submissions:c.rows[0].n,
  questions:q.rows,typeDistribution:t.rows,
  disclaimer:"Only synthetic research responses; no user statistics or small-cell suppression"};
}
export async function d270Audit(pool,role,action,outcome){
 await audit(pool,role,action,outcome);
}
export async function d270AuditCounts(pool){
 const r=await pool.query("SELECT actor_role,action,outcome,count(*)::int AS n FROM a05_analytics.d267_synthetic_audit GROUP BY 1,2,3 ORDER BY 1,2,3");
 return {synthetic:true,actionCounts:r.rows};
}
