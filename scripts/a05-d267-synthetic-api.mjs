/**
 * A05 D267 / EPHEMERAL SYNTHETIC API INTEGRATION PROTOTYPE.
 * Imports no listener, has no deployment target, and refuses non-CI sandbox mode.
 * Not a public ingestion API, not a real consent system, not a production auth design.
 * Authorization uses ephemeral CI bearer secrets; never commit a token or export data.
 */
import {randomBytes,createHash,timingSafeEqual} from "node:crypto";

export const D267_VERSION="A05-D267-SYNTHETIC-LOOPBACK-API-1";
export const D267_VERSION_NAME="D267_SYNTHETIC_CI";
export const D267_POLICY_NAME="D267_SYNTHETIC_FAKE_CONSENT_ONLY";
export const D267_SENTINEL="D267_EPHEMERAL_FIXTURE_NOT_REAL_RESPONDENT";
const allowedRoles=["ingestion-service","reviewer","aggregator","security-admin"];
const uuidRE=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const typeRE=/^T(0[1-9]|1[0-6])$/;
const sha=x=>createHash("sha256").update(x).digest("hex");
const boom=(status,message)=>Object.assign(new Error(message),{status});
const assert=(condition,message)=>{if(!condition)throw boom(422,message)};
function equalSecret(a,b){
 if(typeof a!=="string"||typeof b!=="string")return false;
 const x=Buffer.from(a),y=Buffer.from(b);
 return x.length===y.length&&x.length>0&&timingSafeEqual(x,y);
}
const counts=Array.from({length:30},(_,i)=>"D267-Q"+String(i+1).padStart(2,"0"));
function validateSubmission(x,now){
 assert(x&&typeof x==="object"&&!Array.isArray(x),"JSON object required");
 assert(Object.keys(x).sort().join(",")===[
  "consent","exposures","idempotencyKey","manifestVariant","questionnaireVersion",
  "sandboxOnly","submissionId"
 ].sort().join(","),"Unexpected or missing submission fields");
 assert(x.sandboxOnly===D267_SENTINEL,"Synthetic-only sentinel is required");
 assert(x.questionnaireVersion===D267_VERSION_NAME,"Unknown synthetic version");
 assert(x.manifestVariant==="D267-FIXTURE-FORM-01","Unknown synthetic manifest");
 assert(uuidRE.test(x.submissionId)&&uuidRE.test(x.idempotencyKey)&&
  x.submissionId!==x.idempotencyKey,"Random UUID submission and retry key required");
 const c=x.consent;
 assert(c&&typeof c==="object"&&!Array.isArray(c),"Consent fixture object required");
 assert(Object.keys(c).sort().join(",")==["consented","consentAt","policyVersion"].sort().join(","),
  "Consent fixture fields invalid");
 assert(c.consented===true&&c.policyVersion===D267_POLICY_NAME,"Fake consent fixture invalid");
 assert(typeof c.consentAt==="string"&&/^\d{4}-\d{2}-\d{2}T/.test(c.consentAt)&&
  /(?:Z|[+-]\d{2}:\d{2})$/.test(c.consentAt),"Explicit-offset fake consent timestamp required");
 const dt=new Date(c.consentAt);
 assert(Number.isFinite(dt.getTime())&&dt.getTime()<=now.getTime()&&
  now.getTime()-dt.getTime()<3600*1000,"Fake consent must be recent and not future");
 assert(Array.isArray(x.exposures)&&x.exposures.length>=30&&x.exposures.length<=32,
  "Exactly 30 CORE and at most two synthetic Y/N fixtures");
 const seen=new Set();let yn=0;
 for(let i=0;i<x.exposures.length;i++){
  const e=x.exposures[i];
  assert(e&&typeof e==="object"&&!Array.isArray(e),"Invalid exposure object");
  const fields=Object.keys(e).sort().join(",");
  assert(fields===["phase","questionId","responseCode","revision","scaleValue"].sort().join(",")||
   fields===["phase","questionId","responseCode","revision"].sort().join(","),
   "Unexpected exposure field");
  assert(e.revision===1,"Unsupported question revision");
  assert(e.questionId===(i<30?counts[i]:"D267-YN"+(i-29)),
   "Synthetic manifest mismatch or missing/unshown question");
  assert(!seen.has(e.questionId),"Repeated question");
  seen.add(e.questionId);
  if(i<30){
   assert(e.phase==="CORE","CORE must be first 30");
   if(e.responseCode==="SCALE_7"){
    assert(Number.isInteger(e.scaleValue)&&e.scaleValue>=1&&e.scaleValue<=7,
     "Scale must be integer 1–7");
   }else{
    assert(["SKIP_UNKNOWN","SKIP_NOT_APPLICABLE"].includes(e.responseCode)&&
     (e.scaleValue===null||e.scaleValue===undefined),
     "Distinct skip reason cannot carry scale value");
   }
  }else{
   yn++;
   assert(e.phase==="YN","Optional Y/N must follow CORE");
   assert(["YN_YES","YN_NO","YN_UNSURE","NOT_ANSWERED"].includes(e.responseCode)&&
    (e.scaleValue===null||e.scaleValue===undefined),"Invalid Y/N answer");
  }
 }
 return {yn};
}
// Deliberately fake deterministic classification. NOT D255, not clinically valid.
function fakeClassifier(exposures){
 const first=exposures[0],v=first.responseCode==="SCALE_7"?first.scaleValue:4;
 const base=v>=5?
  {outcome:"SINGLE_PROVISIONAL",typeId:"T01",source:"BASE_30",candidates:1}:
  v<=3?{outcome:"MULTIPLE",typeId:null,source:"UNCLASSIFIED",candidates:2}:
  {outcome:"NO_INFORMATION",typeId:null,source:"UNCLASSIFIED",candidates:16};
 const y=exposures.slice(30);
 const rescued=base.outcome==="MULTIPLE"&&y.length===2&&
  y[0].responseCode==="YN_YES"&&y[1].responseCode==="YN_NO";
 const final=rescued?{outcome:"SINGLE_PROVISIONAL",typeId:"T02",
  source:"YN_PROVISIONAL",candidates:1}:base;
 return {base,final,rescued};
}
function statusBody(res,code,value){
 res.writeHead(code,{
  "content-type":"application/json; charset=utf-8",
  "cache-control":"no-store",
  "x-content-type-options":"nosniff",
  "content-security-policy":"default-src 'none'",
  "referrer-policy":"no-referrer"
 });
 res.end(JSON.stringify(value));
}
async function readJSON(req){
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"]||""))
  throw boom(415,"application/json is required");
 let input="",size=0;
 for await(const chunk of req){
  size+=chunk.length;
  if(size>65536)throw boom(413,"Synthetic request too large");
  input+=chunk.toString("utf8");
 }
 try{return JSON.parse(input);}catch{throw boom(400,"Invalid JSON");}
}
async function tx(pool,fn){
 const db=await pool.connect();
 try{
  await db.query("BEGIN");
  // Serialize write/rebuild/delete to avoid double-counted or stale rollups.
  await db.query("SELECT pg_advisory_xact_lock(267, 1)");
  const value=await fn(db);
  await db.query("COMMIT");return value;
 }catch(e){await db.query("ROLLBACK");throw e;}finally{db.release();}
}
async function audit(db,role,action,outcome,n=0){
 await db.query(`INSERT INTO a05_analytics.d267_synthetic_audit
  (actor_role,action,outcome,number_affected) VALUES ($1,$2,$3,$4)`,
 [role,action,outcome,n]);
}
async function rebuild(db){
 // Recompute from remaining source rows rather than incrementally adding,
 // so deletion cannot leave stale counts or stale type distributions.
 await db.query("DELETE FROM a05_analytics.daily_question_counts WHERE questionnaire_version=$1",
  [D267_VERSION_NAME]);
 await db.query(`INSERT INTO a05_analytics.daily_question_counts
  (day_jst,questionnaire_version,question_id,question_revision,phase,
  shown_count,c1,c2,c3,c4,c5,c6,c7,skip_unknown,skip_not_applicable,
  yn_yes,yn_no,yn_unsure,not_answered)
 SELECT (s.received_at AT TIME ZONE 'Asia/Tokyo')::date,s.questionnaire_version,
  q.question_id,q.question_revision,q.phase,count(*)::bigint,
  count(*) FILTER (WHERE response_code='SCALE_7' AND scale_value=1),
  count(*) FILTER (WHERE response_code='SCALE_7' AND scale_value=2),
  count(*) FILTER (WHERE response_code='SCALE_7' AND scale_value=3),
  count(*) FILTER (WHERE response_code='SCALE_7' AND scale_value=4),
  count(*) FILTER (WHERE response_code='SCALE_7' AND scale_value=5),
  count(*) FILTER (WHERE response_code='SCALE_7' AND scale_value=6),
  count(*) FILTER (WHERE response_code='SCALE_7' AND scale_value=7),
  count(*) FILTER (WHERE response_code='SKIP_UNKNOWN'),
  count(*) FILTER (WHERE response_code='SKIP_NOT_APPLICABLE'),
  count(*) FILTER (WHERE response_code='YN_YES'),
  count(*) FILTER (WHERE response_code='YN_NO'),
  count(*) FILTER (WHERE response_code='YN_UNSURE'),
  count(*) FILTER (WHERE response_code='NOT_ANSWERED')
 FROM a05_analytics.assessment_submissions s
 JOIN a05_analytics.question_exposures q USING (submission_id)
 WHERE s.questionnaire_version=$1
 GROUP BY 1,2,3,4,5`,[D267_VERSION_NAME]);
 await db.query("DELETE FROM a05_analytics.daily_type_counts WHERE questionnaire_version=$1",
  [D267_VERSION_NAME]);
 await db.query(`INSERT INTO a05_analytics.daily_type_counts
  (day_jst,questionnaire_version,phase,classification_version,
    type_bucket,source_bucket,n)
 SELECT (s.received_at AT TIME ZONE 'Asia/Tokyo')::date,s.questionnaire_version,
  c.phase,c.classification_version,
  CASE WHEN c.outcome='SINGLE_PROVISIONAL' THEN c.type_id ELSE c.outcome END,
  CASE WHEN c.outcome='SINGLE_PROVISIONAL'
    THEN CASE WHEN c.yn_supplemented_axes>0 THEN 'YN_PROVISIONAL' ELSE 'BASE_30' END
    ELSE 'UNCLASSIFIED' END,count(*)::bigint
 FROM a05_analytics.assessment_submissions s
 JOIN a05_analytics.classification_snapshots c USING (submission_id)
 WHERE s.questionnaire_version=$1
 GROUP BY 1,2,3,4,5,6`,[D267_VERSION_NAME]);
}
async function accept(pool,payload,now){
 const {yn}=validateSubmission(payload,now);
 const fingerprint=sha(JSON.stringify(payload));
 return tx(pool,async db=>{
  const dupe=await db.query(`SELECT submission_id,idempotency_key,payload_sha256,state
    FROM a05_analytics.d267_synthetic_receipts
    WHERE submission_id=$1 OR idempotency_key=$2 FOR UPDATE`,
   [payload.submissionId,payload.idempotencyKey]);
  if(dupe.rowCount){
   const prev=dupe.rows[0];
   if(prev.state==="ACTIVE"&&prev.submission_id===payload.submissionId&&
      prev.idempotency_key===payload.idempotencyKey&&prev.payload_sha256===fingerprint){
    await audit(db,"ingestion-service","SUBMISSION_RETRIED","OK");
    return {status:200,result:{state:"already-accepted",synthetic:true}};
   }
   await audit(db,"ingestion-service","SUBMISSION_REJECTED","CONFLICT");
   return {status:409,result:{error:"Conflicting or revoked synthetic submission"}};
  }
  const deletionToken=randomBytes(32).toString("hex");
  await db.query(`INSERT INTO a05_analytics.d267_synthetic_receipts
    (submission_id,idempotency_key,payload_sha256,deletion_token_sha256)
    VALUES ($1,$2,$3,$4)`,
   [payload.submissionId,payload.idempotencyKey,fingerprint,sha(deletionToken)]);
  await db.query(`INSERT INTO a05_analytics.assessment_submissions
   (submission_id,idempotency_key,questionnaire_version,manifest_variant,
    consent_at,consent_policy_version,completion_status)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,
   [payload.submissionId,payload.idempotencyKey,D267_VERSION_NAME,
    payload.manifestVariant,payload.consent.consentAt,D267_POLICY_NAME,
    yn===0?"CORE_COMPLETE":yn===2?"YN_COMPLETE":"YN_PARTIAL"]);
  for(let i=0;i<payload.exposures.length;i++){
   const e=payload.exposures[i];
   await db.query(`INSERT INTO a05_analytics.question_exposures
    (submission_id,question_id,question_revision,phase,ordinal,response_code,scale_value)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [payload.submissionId,e.questionId,e.revision,e.phase,
     i<30?i+1:i-29,e.responseCode,e.responseCode==="SCALE_7"?e.scaleValue:null]);
  }
  const c=fakeClassifier(payload.exposures);
  for(const [phase,val] of [["BASE_30",c.base],["FINAL_AFTER_YN",c.final]]){
   await db.query(`INSERT INTO a05_analytics.classification_snapshots
    (submission_id,phase,classification_version,outcome,type_id,candidate_count,yn_supplemented_axes)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [payload.submissionId,phase,"D267_MOCK_CLASSIFIER",val.outcome,val.typeId,
     val.candidates,c.rescued&&phase==="FINAL_AFTER_YN"?1:0]);
  }
  // The classifier is explicitly fake; do not synthesize credible axis scores.
  await rebuild(db);
  await audit(db,"ingestion-service","SUBMISSION_ACCEPTED","OK",1);
  return {status:201,result:{state:"synthetic-accepted",synthetic:true,
   submissionId:payload.submissionId,deletionToken,
   warning:"Mock classification only; this endpoint accepts no real respondents."}};
 });
}
async function deleteSynthetic(pool,submissionId,deleteToken){
 if(!uuidRE.test(submissionId)||!(/^[0-9a-f]{64}$/).test(deleteToken||""))
  throw boom(404,"Not found");
 return tx(pool,async db=>{
  const r=await db.query(`SELECT deletion_token_sha256,state
    FROM a05_analytics.d267_synthetic_receipts
    WHERE submission_id=$1 FOR UPDATE`,[submissionId]);
  if(r.rowCount!==1||r.rows[0].state!=="ACTIVE"||
    !equalSecret(sha(deleteToken),r.rows[0].deletion_token_sha256)){
   await audit(db,"anonymous","DELETE_DENIED","DENIED");
   return false;
  }
  await db.query("DELETE FROM a05_analytics.assessment_submissions WHERE submission_id=$1",
   [submissionId]);
  await db.query(`UPDATE a05_analytics.d267_synthetic_receipts SET
   state='DELETED',payload_sha256=NULL,deletion_token_sha256=NULL,
   deleted_at=now() WHERE submission_id=$1`,[submissionId]);
  await rebuild(db);
  await audit(db,"anonymous","DELETE_COMPLETED","OK",1);
  return true;
 });
}
async function metrics(pool){
 const [q,t,count]=await Promise.all([
  pool.query(`SELECT question_id,question_revision,phase,shown,unknown_n,not_applicable_n,
   midpoint_n,scale_7_n,yn_answered_n,yn_not_answered_n,
   unknown_per_exposed,not_applicable_per_exposed,midpoint_per_valid7,unsure_per_answered_yn
   FROM a05_analytics.question_metrics
   WHERE questionnaire_version=$1 ORDER BY phase,question_id`,[D267_VERSION_NAME]),
  pool.query(`SELECT phase,classification_version,type_bucket,n,all_completed_n,
   single_type_n,share_of_all_completed,share_among_single_types
   FROM a05_analytics.type_distribution_metrics
   WHERE questionnaire_version=$1 ORDER BY phase,type_bucket`,[D267_VERSION_NAME]),
  pool.query(`SELECT count(*)::int AS n FROM a05_analytics.assessment_submissions
   WHERE questionnaire_version=$1`,[D267_VERSION_NAME])
 ]);
 // Sandbox only. Production aggregate cell suppression remains unimplemented.
 return {synthetic:true,sandboxOnly:true,version:D267_VERSION,
  totalSyntheticSubmissions:count.rows[0].n,
  privacyWarning:"Sandbox aggregate only; production needs minimum-cell-size suppression.",
  questionMetrics:q.rows,typeDistribution:t.rows};
}
async function auditAggregate(pool){
 const rows=await pool.query(`SELECT actor_role,action,outcome,count(*)::int AS events,
  sum(number_affected)::int AS affected
  FROM a05_analytics.d267_synthetic_audit
  GROUP BY 1,2,3 ORDER BY 1,2,3`);
 return {synthetic:true,eventsByRoleAndAction:rows.rows};
}
/**
 * Factory ONLY. No network listener or deploy config is present in this file.
 * Tests must bind http.createServer(handler) to 127.0.0.1 on an ephemeral port.
 */
export function createSyntheticSandboxHandler({pool,roleTokens,clock=()=>new Date()}){
 if(process.env.A05_D267_SANDBOX_MODE!=="synthetic-ephemeral-ci")
  throw Error("D267 refuses to run outside explicit ephemeral CI sandbox mode");
 if(!pool||!roleTokens||allowedRoles.some(role=>
  typeof roleTokens[role]!=="string"||roleTokens[role].length<40)||
  new Set(Object.values(roleTokens)).size!==allowedRoles.length)
  throw Error("D267 requires distinct ephemeral 40+ character role secrets");
 return async(req,res)=>{
  const requestPath=req.url?.split("?")[0]||"";
  const role=allowedRoles.find(r=>equalSecret(req.headers.authorization,
   "Bearer "+roleTokens[r]))||"anonymous";
  const deny=async()=>{
   // Only action/role/outcome; never store secrets, body, IP, URL or user agent.
   await audit(pool,role,"AUTH_DENIED","DENIED");
   statusBody(res,role==="anonymous"?401:403,
    {error:role==="anonymous"?"Authentication required":"Forbidden"});
  };
  try{
   if(req.method==="GET"&&requestPath==="/health"){
    statusBody(res,200,{status:"synthetic-only",version:D267_VERSION});return;
   }
   if(req.method==="POST"&&requestPath==="/v1/synthetic/submissions"){
    if(role!=="ingestion-service"){await deny();return;}
    const input=await readJSON(req),reply=await accept(pool,input,clock());
    statusBody(res,reply.status,reply.result);return;
   }
   const match=requestPath.match(/^\/v1\/synthetic\/submissions\/([0-9a-f-]+)$/i);
   if(req.method==="DELETE"&&match){
    // A recipient's one-time deletion credential, not an administrator API.
    // No deletion token is put in URLs, response data or access/audit logs.
    const ok=await deleteSynthetic(pool,match[1],req.headers["x-deletion-token"]);
    if(ok){res.writeHead(204,{"cache-control":"no-store"});res.end();}
    else statusBody(res,404,{error:"Not found"});
    return;
   }
   if(req.method==="GET"&&requestPath==="/v1/synthetic/admin/metrics"){
    if(role!=="reviewer"){await deny();return;}
    const value=await metrics(pool);
    await audit(pool,"reviewer","METRICS_READ","OK");
    statusBody(res,200,value);return;
   }
   if(req.method==="GET"&&requestPath==="/v1/synthetic/admin/audit"){
    if(role!=="security-admin"){await deny();return;}
    await audit(pool,"security-admin","AUDIT_READ","OK");
    statusBody(res,200,await auditAggregate(pool));return;
   }
   if(req.method==="POST"&&requestPath==="/v1/synthetic/admin/rebuild"){
    if(role!=="aggregator"){await deny();return;}
    await tx(pool,async db=>{
     await rebuild(db);await audit(db,"aggregator","ROLLUP_REBUILT","OK");
    });
    statusBody(res,200,{synthetic:true,recomputed:true});return;
   }
   statusBody(res,404,{error:"Synthetic endpoint not found"});
  }catch(error){
   // Never echo stack traces, SQL errors or any supplied answer or secret.
   statusBody(res,error.status||500,{error:error.status?error.message:"Synthetic API internal error"});
  }
 };
}
