/**
 * D267 end-to-end tests. ONLY disposable PostgreSQL service and loopback http.
 * No user device, browser, production page, real consent, or public endpoint.
 */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {createRequire} from "node:module";
import {randomBytes,randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {
 createSyntheticSandboxHandler,D267_VERSION,D267_SENTINEL,D267_POLICY_NAME
} from "./a05-d267-synthetic-api.mjs";
const require=createRequire(import.meta.url);
const {Pool}=require("pg");

const say=(label,extra={})=>console.log("A05_D267_CASE_PASS "+JSON.stringify({case:label,...extra}));
const roleTokens=Object.fromEntries(
 ["ingestion-service","reviewer","aggregator","security-admin"]
 .map(k=>[k,randomBytes(48).toString("hex")])
);
const expectedSchema=["research/a05/analytics/schema_draft_v1.sql",
 "research/a05/analytics/d264_integrity_patch_draft.sql",
 "research/a05/analytics/d267_ephemeral_api_schema.sql"];
const pool=new Pool({host:"127.0.0.1",port:5432,
 user:process.env.PGUSER,password:process.env.PGPASSWORD,
 database:process.env.PGDATABASE,max:5});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fixture=({first=7,withYN=false,suffix="",question2="SCALE_7"}={})=>{
 const id=randomUUID(),key=randomUUID();
 return {
  sandboxOnly:D267_SENTINEL,submissionId:id,idempotencyKey:key,
  questionnaireVersion:"D267_SYNTHETIC_CI",manifestVariant:"D267-FIXTURE-FORM-01",
  consent:{consented:true,policyVersion:D267_POLICY_NAME,
   consentAt:new Date(Date.now()-2000).toISOString()},
  exposures:[
   ...Array.from({length:30},(_,i)=>({
    questionId:"D267-Q"+String(i+1).padStart(2,"0"),
    revision:1,phase:"CORE",
    ...(i===2?{responseCode:"SKIP_UNKNOWN"}:
      i===3?{responseCode:"SKIP_NOT_APPLICABLE"}:
      i===1&&question2==="SCALE_7"?{responseCode:"SCALE_7",scaleValue:4}:
      {responseCode:"SCALE_7",scaleValue:i===0?first:7})
   })),
   ...(withYN?[
    {questionId:"D267-YN1",revision:1,phase:"YN",responseCode:"YN_YES"},
    {questionId:"D267-YN2",revision:1,phase:"YN",responseCode:"YN_NO"}
   ]:[])
  ]
 };
};
let server,origin;
async function call(path,{method="GET",role,token,body,headers={}}={}){
 const h={...headers};
 if(role)h.authorization="Bearer "+roleTokens[role];
 if(token)h["x-deletion-token"]=token;
 if(body!==undefined){
  h["content-type"]="application/json";
 }
 const r=await fetch(origin+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
 let data=null;
 if(r.status!==204){const txt=await r.text();try{data=JSON.parse(txt);}catch{data=txt;}}
 return {status:r.status,data,headers:r.headers};
}
async function query(text,params=[]){return(await pool.query(text,params)).rows;}
async function counts(){
 const [r]=await query(`SELECT count(*)::int AS n FROM a05_analytics.assessment_submissions
   WHERE questionnaire_version='D267_SYNTHETIC_CI'`);
 return r.n;
}
function metric(rows,phase,bucket){return rows.find(x=>x.phase===phase&&x.type_bucket===bucket);}
async function doTests(){
 assert.equal(process.env.A05_D267_SANDBOX_MODE,"synthetic-ephemeral-ci");
 assert.ok(process.env.PGDATABASE?.includes("ci"),"Refuse non-CI database name");
 for(const path of expectedSchema)await pool.query(readFileSync(resolve(path),"utf8"));
 say("ephemeral-postgresql-migrations",{versions:3});

 const handler=createSyntheticSandboxHandler({pool,roleTokens});
 server=createServer(handler);
 await new Promise((resolve,reject)=>server.once("error",reject).listen(0,"127.0.0.1",resolve));
 origin="http://127.0.0.1:"+server.address().port;
 assert.equal(server.address().address,"127.0.0.1");
 assert.equal((await call("/health")).status,200);
 assert.equal((await call("/v1/synthetic/admin/metrics")).status,401);
 assert.equal((await call("/v1/synthetic/admin/metrics",{role:"ingestion-service"})).status,403);
 assert.equal((await call("/v1/synthetic/admin/audit",{role:"reviewer"})).status,403);
 assert.equal((await call("/v1/synthetic/admin/rebuild",{method:"POST",role:"reviewer"})).status,403);
 assert.equal((await call("/v1/synthetic/submissions",{method:"POST",body:fixture()})).status,401);
 say("loopback-rbac-boundaries");

 // Rejection: no real-consent support, no spare PII fields, no fake classifier override.
 const invalid=fixture();
 invalid.sandboxOnly="anything-else";
 assert.equal((await call("/v1/synthetic/submissions",{role:"ingestion-service",method:"POST",body:invalid})).status,422);
 invalid.sandboxOnly=D267_SENTINEL;invalid.email="never-store@example.test";
 assert.equal((await call("/v1/synthetic/submissions",{role:"ingestion-service",method:"POST",body:invalid})).status,422);
 delete invalid.email;invalid.classifications={BASE_30:{typeId:"T16"}};
 assert.equal((await call("/v1/synthetic/submissions",{role:"ingestion-service",method:"POST",body:invalid})).status,422);
 delete invalid.classifications;invalid.consent.consented=false;
 assert.equal((await call("/v1/synthetic/submissions",{role:"ingestion-service",method:"POST",body:invalid})).status,422);
 invalid.consent.consented=true;invalid.exposures[2].responseCode="SCALE_7";
 assert.equal((await call("/v1/synthetic/submissions",{role:"ingestion-service",method:"POST",body:invalid})).status,422);
 invalid.exposures[2]={questionId:"D267-Q03",revision:1,phase:"CORE",responseCode:"SKIP_UNKNOWN"};
 invalid.exposures[1].questionId="D267-Q31";
 assert.equal((await call("/v1/synthetic/submissions",{role:"ingestion-service",method:"POST",body:invalid})).status,422);
 assert.equal(await counts(),0);
 say("strict-test-only-consent-and-schema-rejections");

 const A=fixture({first:7}),B=fixture({first:1,withYN:true}),
  C=fixture({first:4}),D=fixture({first:7});
 const a=await call("/v1/synthetic/submissions",{method:"POST",role:"ingestion-service",body:A});
 assert.equal(a.status,201);
 assert.match(a.data.deletionToken,/^[0-9a-f]{64}$/);
 assert.equal(a.headers.get("cache-control"),"no-store");
 assert.equal(a.data.submissionId,A.submissionId);
 assert.equal(await counts(),1);
 const retry=await call("/v1/synthetic/submissions",{method:"POST",role:"ingestion-service",body:A});
 assert.equal(retry.status,200);
 assert.equal(retry.data.state,"already-accepted");
 assert.equal(retry.data.deletionToken,undefined);
 assert.equal(await counts(),1);
 const conflict={...A,exposures:A.exposures.map(x=>({...x}))};
 conflict.exposures[0].scaleValue=2;
 assert.equal((await call("/v1/synthetic/submissions",{method:"POST",role:"ingestion-service",body:conflict})).status,409);
 assert.equal(await counts(),1);
 say("transactional-write-idempotency-and-conflict");

 const receipts={A:a.data.deletionToken};
 for(const [name,payload] of [["B",B],["C",C],["D",D]]){
  const added=await call("/v1/synthetic/submissions",{method:"POST",role:"ingestion-service",body:payload});
  assert.equal(added.status,201);receipts[name]=added.data.deletionToken;
 }
 assert.equal(await counts(),4);
 const m=await call("/v1/synthetic/admin/metrics",{role:"reviewer"});
 assert.equal(m.status,200);
 assert.equal(m.data.totalSyntheticSubmissions,4);
 assert.equal(JSON.stringify(m.data).includes("submissionId"),false);
 assert.equal(JSON.stringify(m.data).includes(a.data.deletionToken),false);
 assert.equal(JSON.stringify(m.data).includes("idempotencyKey"),false);
 const type=m.data.typeDistribution;
 assert.equal(Number(metric(type,"BASE_30","T01").n),2);
 assert.equal(Number(metric(type,"BASE_30","MULTIPLE").n),1);
 assert.equal(Number(metric(type,"BASE_30","NO_INFORMATION").n),1);
 assert.equal(Number(metric(type,"FINAL_AFTER_YN","T01").n),2);
 assert.equal(Number(metric(type,"FINAL_AFTER_YN","T02").n),1);
 assert.equal(Number(metric(type,"FINAL_AFTER_YN","T02").all_completed_n),4);
 assert.equal(Number(metric(type,"FINAL_AFTER_YN","T02").single_type_n),3);
 assert.equal(Number(metric(type,"FINAL_AFTER_YN","T02").share_of_all_completed),0.25);
 assert.ok(Math.abs(Number(metric(type,"FINAL_AFTER_YN","T02").share_among_single_types)-1/3)<1e-9);
 const q1=m.data.questionMetrics.find(x=>x.question_id==="D267-Q03");
 assert.equal(Number(q1.shown),4);
 assert.equal(Number(q1.unknown_n),4);
 assert.equal(Number(q1.unknown_per_exposed),1);
 const q2=m.data.questionMetrics.find(x=>x.question_id==="D267-Q04");
 assert.equal(Number(q2.not_applicable_n),4);
 assert.equal(Number(q2.not_applicable_per_exposed),1);
 const q3=m.data.questionMetrics.find(x=>x.question_id==="D267-Q02");
 assert.equal(Number(q3.midpoint_n),4);
 assert.equal(Number(q3.midpoint_per_valid7),1);
 const yn=m.data.questionMetrics.find(x=>x.question_id==="D267-YN1");
 assert.equal(Number(yn.shown),1);
 assert.equal(Number(yn.yn_answered_n),1);
 say("real-sql-views-for-30-q-yn-and-two-denominators");

 // A recipient deletion credential is required and never used as URL query.
 assert.equal((await call("/v1/synthetic/submissions/"+A.submissionId,{method:"DELETE",token:"f".repeat(64)})).status,404);
 assert.equal(await counts(),4);
 const deleted=await call("/v1/synthetic/submissions/"+A.submissionId,{method:"DELETE",token:receipts.A});
 assert.equal(deleted.status,204);
 assert.equal(await counts(),3);
 assert.equal((await call("/v1/synthetic/submissions/"+A.submissionId,{method:"DELETE",token:receipts.A})).status,404);
 const [cleared]=await query(`SELECT state,payload_sha256,deletion_token_sha256,deleted_at
    FROM a05_analytics.d267_synthetic_receipts WHERE submission_id=$1`,[A.submissionId]);
 assert.equal(cleared.state,"DELETED");
 assert.equal(cleared.payload_sha256,null);
 assert.equal(cleared.deletion_token_sha256,null);
 assert.ok(cleared.deleted_at);
 const metricsAfter=await call("/v1/synthetic/admin/metrics",{role:"reviewer"});
 assert.equal(metricsAfter.data.totalSyntheticSubmissions,3);
 assert.equal(Number(metric(metricsAfter.data.typeDistribution,"FINAL_AFTER_YN","T01").n),1);
 assert.equal(Number(metric(metricsAfter.data.typeDistribution,"FINAL_AFTER_YN","T02").n),1);
 assert.equal(Number(metric(metricsAfter.data.typeDistribution,"FINAL_AFTER_YN","T02").all_completed_n),3);
 assert.equal(Number(metricsAfter.data.questionMetrics.find(x=>x.question_id==="D267-Q03").shown),3);
 assert.equal((await call("/v1/synthetic/submissions",{role:"ingestion-service",method:"POST",body:A})).status,409);
 say("token-deletion-cascade-rollup-rebuild-and-no-replay");

 // Aggregator can recompute without inflating; reviewer cannot mutate.
 const rebuilt=await call("/v1/synthetic/admin/rebuild",{role:"aggregator",method:"POST"});
 assert.equal(rebuilt.status,200);
 assert.equal(rebuilt.data.recomputed,true);
 assert.equal(await counts(),3);
 const check=await call("/v1/synthetic/admin/metrics",{role:"reviewer"});
 assert.equal(Number(metric(check.data.typeDistribution,"FINAL_AFTER_YN","T01").n),1);
 assert.equal(Number(check.data.questionMetrics.find(x=>x.question_id==="D267-Q03").shown),3);
 say("aggregator-recompute-idempotent");

 const auditResult=await call("/v1/synthetic/admin/audit",{role:"security-admin"});
 assert.equal(auditResult.status,200);
 assert.equal(auditResult.data.synthetic,true);
 const logs=JSON.stringify(auditResult.data);
 assert.ok(logs.includes("SUBMISSION_ACCEPTED")&&logs.includes("DELETE_COMPLETED")&&
  logs.includes("ROLLUP_REBUILT"));
 assert.equal(logs.includes(receipts.A),false);
 assert.equal(logs.includes(A.submissionId),false);
 assert.equal(logs.includes("127.0.0.1"),false);
 say("role-limited-audit-without-raw-payload");

 assert.equal((await call("/v1/synthetic/nonexistent",{role:"security-admin"})).status,404);
 assert.equal((await call("/v1/synthetic/submissions",{role:"ingestion-service",method:"POST",
  headers:{"content-type":"text/plain"}})).status,415);
 const huge="x".repeat(66000);
 const h=await fetch(origin+"/v1/synthetic/submissions",{method:"POST",headers:{
  "authorization":"Bearer "+roleTokens["ingestion-service"],
  "content-type":"application/json"},
  body:JSON.stringify({oversize:huge})});
 assert.equal(h.status,413);
 assert.equal(await counts(),3);
 say("malformed-payload-oversize-and-no-unexpected-endpoints");

 const table=await query(`SELECT column_name FROM information_schema.columns
   WHERE table_schema='a05_analytics' AND table_name='d267_synthetic_audit'`);
 const names=table.map(x=>x.column_name);
 for(const sensitive of ["ip","remote_addr","user_agent","payload","deletion_token","submission_id"])
  assert.equal(names.includes(sensitive),false);
 const all=await query("SELECT count(*)::int AS n FROM a05_analytics.d267_synthetic_audit");
 assert.ok(all[0].n>0);
 say("audit-schema-minimality",{auditEventCount:all[0].n});
 console.log("A05_D267_EPHEMERAL_API_DB_INTEGRATION_PASS "+JSON.stringify({
  syntheticOnly:true,loopback:true,pg16:true,testCases:10,
  storedAfterDeletion:3,noProductionEndpoint:true,noRealConsent:true,
  diagnosisScoringConnected:false,deletionTokenNeverInQuery:true
 }));
}
try{await doTests();}
finally{
 if(server)await new Promise(resolve=>server.close(resolve));
 await pool.end();
}
