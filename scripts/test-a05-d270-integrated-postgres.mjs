/**
 * D270 integration: D269 actual A05 research logic -> D261/264 Postgres ->
 * D267 idempotent receipts & audit. All synthetic and disposable.
 */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {randomBytes,randomUUID} from "node:crypto";
import {createRequire} from "node:module";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {d269ServerClassify} from "./a05-d269-server-reference.mjs";
import {createD270LoopbackHandler} from "./a05-d270-loopback-api.mjs";
import {seedD270Bank,validateD270Fixture,d270StorageClassification,
 D270_QUESTIONNAIRE,D270_CONSENT,D270_MARKER} from "./a05-d270-classifier-db.mjs";
const require=createRequire(import.meta.url);
const {Pool}=require("pg");
const pool=new Pool({host:"127.0.0.1",port:5432,
 user:process.env.PGUSER,password:process.env.PGPASSWORD,
 database:process.env.PGDATABASE,max:8});
const tokens=Object.fromEntries(["ingestion-service","reviewer","aggregator",
 "security-admin"].map(r=>[r,randomBytes(48).toString("hex")]));
let server,origin;
const report=(kind,more={})=>console.log("A05_D270_CASE_PASS "+JSON.stringify({kind,...more}));
async function db(sql,params=[]){return(await pool.query(sql,params)).rows;}
function makeFixture(index,pattern){
 const form=drawResearchHoldFilteredManifest("D219-simple-"+String(index).padStart(3,"0"));
 const counter={A:0,B:0,C:0,D:0,E:0};
 const exposures=form.questions.map(q=>{
  const j=counter[q.axis]++;
  let value=7,reason=null;
  if(pattern==="all1")value=1;
  if(pattern==="all4")value=4;
  if(pattern==="allunknown"){value=null;reason="SKIP_UNKNOWN";}
  if(pattern==="allna"){value=null;reason="SKIP_NOT_APPLICABLE";}
  if(pattern==="B5"&&q.axis==="B"&&j<5)value=4;
  if(pattern==="A-cancel"&&q.axis==="A")value=j<3?1:j<6?7:4;
  if(pattern==="mix"){
   if(q.axis==="A"&&j%3===0){value=null;reason="SKIP_UNKNOWN";}
   if(q.axis==="C"&&j%4===0){value=null;reason="SKIP_NOT_APPLICABLE";}
   if(q.axis==="D"&&j<3)value=4;
  }
  return {questionId:q.id,revision:1,phase:"CORE",
   ...(value===null?{responseCode:reason}:
     {responseCode:"SCALE_7",scaleValue:value})};
 });
 return {sandboxOnly:D270_MARKER,questionnaireVersion:D270_QUESTIONNAIRE,
  manifestIndex:index,submissionId:randomUUID(),idempotencyKey:randomUUID(),
  consent:{consented:true,policyVersion:D270_CONSENT,
   consentAt:new Date(Date.now()-2000).toISOString()},exposures};
}
function appendYN(fixture,{mode="opposing",limit=8}={}){
 const base=fixture.exposures.slice(0,30);
 const values=base.map(e=>e.responseCode==="SCALE_7"?e.scaleValue:null);
 const skipKinds=base.map(e=>e.responseCode==="SKIP_UNKNOWN"?"UNKNOWN":
   e.responseCode==="SKIP_NOT_APPLICABLE"?"NOT_APPLICABLE":null);
 const response={responses:{},reasons:{}};
 let steps=0;
 while(steps<limit){
  const next=d269ServerClassify({manifestIndex:fixture.manifestIndex,values,skipKinds,
   ynState:response}).next;
  if(!next||steps+next.questions.length>limit)break;
  for(let i=0;i<next.questions.length;i++){
   const q=next.questions[i];
   const answer=mode==="both"?"YES":i===0?"YES":"NO";
   response.responses[q.id]=answer;
   fixture.exposures.push({questionId:q.id,revision:1,phase:"YN",
    responseCode:answer==="YES"?"YN_YES":"YN_NO"});
   steps++;
  }
 }
 return fixture;
}
async function api(endpoint,{method="GET",role,body,token,extra={}}={}){
 const headers={...extra};
 if(role)headers.authorization="Bearer "+tokens[role];
 if(token)headers["x-deletion-token"]=token;
 if(body!==undefined)headers["content-type"]="application/json";
 const response=await fetch(origin+endpoint,{method,headers,
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=response.status===204?null:await response.json();
 return {status:response.status,body:data,headers:response.headers};
}
const core=async()=>Number((await db("SELECT count(*)::int AS n FROM a05_analytics.assessment_submissions WHERE questionnaire_version=$1",[D270_QUESTIONNAIRE]))[0].n);
const legacy=async()=>Number((await db("SELECT count(*)::int AS n FROM a05_analytics.assessment_submissions WHERE questionnaire_version='D267_SYNTHETIC_CI'"))[0].n);
const type=(rs,phase,id)=>rs.find(x=>x.phase===phase&&x.type_bucket===id);
function expected(fixture){
 const validated=validateD270Fixture(fixture);
 return d270StorageClassification(validated);
}
async function verify(){
 assert.equal(process.env.A05_D270_SANDBOX_MODE,"synthetic-ephemeral-ci");
 assert.equal(process.env.PGDATABASE,"a05_d270_ci");
 const prior=await legacy();
 assert.equal(prior,3,"Run D267 legacy suite before D270; preserve its existing 3 fixtures");
 const registered=await seedD270Bank(pool);
 assert.deepEqual(registered,{coreBank:50,ynBank:16,forms:128});
 const formats=await db("SELECT response_format,count(*)::int AS n FROM a05_analytics.question_versions GROUP BY response_format ORDER BY response_format");
 assert.ok(formats.some(r=>r.response_format==="YN"&&r.n>=16));
 assert.equal(await core(),0);
 report("actual-A05-bank-50-and-D243-YN-16-registered",{legacyUnmodified:prior});
 const originalEnv=process.env.A05_D270_SANDBOX_MODE;
 process.env.A05_D270_SANDBOX_MODE="disabled";
 assert.throws(()=>createD270LoopbackHandler({pool,roleTokens:tokens}),/sandbox/);
 process.env.A05_D270_SANDBOX_MODE=originalEnv;
 assert.throws(()=>createD270LoopbackHandler({pool,roleTokens:{...tokens,
  reviewer:"too-short"}}),/ephemeral role secrets/);
 server=createServer(createD270LoopbackHandler({pool,roleTokens:tokens}));
 await new Promise((resolve,reject)=>{
  server.once("error",reject);server.listen(0,"127.0.0.1",resolve);
 });
 origin="http://127.0.0.1:"+server.address().port;
 assert.equal(server.address().address,"127.0.0.1");
 assert.equal((await api("/health")).status,200);
 assert.equal((await api("/v1/d270-synthetic/admin/metrics")).status,401);
 assert.equal((await api("/v1/d270-synthetic/admin/metrics",{role:"ingestion-service"})).status,403);
 assert.equal((await api("/v1/d270-synthetic/admin/rebuild",{role:"reviewer",method:"POST"})).status,403);
 assert.equal((await api("/v1/d270-synthetic/admin/audit",{role:"reviewer"})).status,403);
 assert.equal((await api("/v1/d270-synthetic/submissions",{method:"POST",
  body:makeFixture(0,"all7")})).status,401);
 report("test-only-startup-and-RBAC-deny-by-default");

 // All 128 Ver.2.2 manifests: strict transport fields and held-safe bank identity.
 for(let index=0;index<128;index++){
  for(const pattern of ["all7","all1","all4","allunknown","allna","B5","A-cancel","mix"]){
   const f=makeFixture(index,pattern);
   const v=validateD270Fixture(f);
   assert.equal(v.initial.ids.length,30);
   assert.equal(v.original,undefined);
   assert.equal(JSON.stringify(v.initial.stats),JSON.stringify(v.latest.stats));
  }
 }
 report("all-128-manifests-eight-patterns-strict-validation",{cases:1024});

 const rejects=makeFixture(7,"B5");
 const cases=[
  {...rejects,sandboxOnly:"REAL_HUMAN_INPUT"},
  {...rejects,consent:{...rejects.consent,consented:false}},
  {...rejects,consent:{...rejects.consent,policyVersion:"CLAIMED_REAL_CONSENT"}},
  {...rejects,email:"private@invalid.example"},
  {...rejects,classifications:{final:{typeId:"T16"}}},
  {...rejects,manifestIndex:128},
  {...rejects,exposures:rejects.exposures.slice(1)},
  {...rejects,exposures:rejects.exposures.map((x,i)=>i===1?{...x,questionId:"A05-V1-31"}:x)},
  {...rejects,exposures:rejects.exposures.map((x,i)=>i===0?{...x,scaleValue:9}:x)},
  {...rejects,exposures:rejects.exposures.map((x,i)=>i===0?{...x,responseCode:"SKIP_UNKNOWN",scaleValue:7}:x)},
  {...rejects,exposures:rejects.exposures.concat({questionId:"A05-D243-A-L",
   revision:1,phase:"YN",responseCode:"YN_YES"})},
  {...rejects,exposures:rejects.exposures.concat({questionId:"A05-D243-B-R",
   revision:1,phase:"YN",responseCode:"YN_YES"})}
 ];
 for(const bad of cases){
  const v=await api("/v1/d270-synthetic/submissions",{
   method:"POST",role:"ingestion-service",body:bad});
  assert.equal(v.status,422,"Should reject invalid synthetic record: "+JSON.stringify(v.body));
 }
 assert.equal(await core(),0);
 report("malformed-unconsented-client-classifications-and-unoffered-YN-rejected",{cases:cases.length});

 const A=makeFixture(0,"all7");
 const B=appendYN(makeFixture(1,"B5"),{limit:2});
 const C=appendYN(makeFixture(2,"all4"),{limit:8});
 const D=makeFixture(127,"allunknown");
 const E=appendYN(makeFixture(9,"B5"),{mode:"both",limit:4});
 const records=[A,B,C,D,E];
 const receipts=[];
 for(const fixture of records){
  const ref=expected(fixture);
  const out=await api("/v1/d270-synthetic/submissions",{
   method:"POST",role:"ingestion-service",body:fixture});
  assert.equal(out.status,201,"Insert A05 synthetic case failed: "+JSON.stringify(out.body));
  assert.equal(out.body.classification.base.typeId,ref.base.typeId);
  assert.equal(out.body.classification.final.typeId,ref.final.typeId);
  assert.equal(out.body.classification.final.candidateCount,ref.final.candidateCount);
  assert.equal(out.body.classification.ynDeterminedAxes,ref.ynAxes);
  assert.match(out.body.deletionToken,/^[a-f0-9]{64}$/);
  receipts.push(out.body.deletionToken);
 }
 assert.equal(await core(),5);
 assert.equal(await legacy(),prior,"D270 writes must not affect D267 source");
 report("real-A05-D269-classification-persists-five-patterns",{ynCounts:records.map(f=>f.exposures.length-30)});

 const baseline=await api("/v1/d270-synthetic/admin/metrics",{role:"reviewer"});
 assert.equal(baseline.status,200);
 assert.equal(baseline.body.submissions,5);
 assert.equal(baseline.headers.get("access-control-allow-origin"),null);
 assert.ok(!JSON.stringify(baseline.body).includes(A.submissionId));
 assert.ok(!JSON.stringify(baseline.body).includes(receipts[0]));
 const bClassification=expected(B);
 const bRows=await db("SELECT phase,outcome,type_id,candidate_count,yn_supplemented_axes FROM a05_analytics.classification_snapshots WHERE submission_id=$1 ORDER BY phase",[B.submissionId]);
 assert.equal(bRows.length,2);
 assert.equal(bRows.find(r=>r.phase==="BASE_30").candidate_count,bClassification.base.candidateCount);
 assert.equal(bRows.find(r=>r.phase==="FINAL_AFTER_YN").type_id,bClassification.final.typeId);
 assert.equal(bRows.find(r=>r.phase==="FINAL_AFTER_YN").yn_supplemented_axes,bClassification.ynAxes);
 const axis=await db("SELECT phase,axis,direction,evidence_source,shown_count,valid_7_count,directional_7_count,midpoint_4_count,unknown_count,not_applicable_count,signed_score_ratio FROM a05_analytics.axis_snapshots WHERE submission_id=$1 ORDER BY phase,axis",[B.submissionId]);
 assert.equal(axis.length,8);
 for(const item of axis){
  const idx=["A","B","C","D"].indexOf(item.axis);
  assert.equal(item.shown_count,7);
  assert.equal(item.valid_7_count+item.unknown_count+item.not_applicable_count,7);
  assert.equal(item.directional_7_count+item.midpoint_4_count,item.valid_7_count);
  assert.ok(idx>=0);
 }
 const bBaseline=axis.find(r=>r.phase==="BASE_30"&&r.axis==="B");
 const bFinal=axis.find(r=>r.phase==="FINAL_AFTER_YN"&&r.axis==="B");
 assert.equal(bBaseline.evidence_source,"UNRESOLVED");
 assert.equal(bFinal.evidence_source,"YN_INITIAL_PROVISIONAL");
 assert.equal(bBaseline.signed_score_ratio,bFinal.signed_score_ratio,
  "Y/N cannot change original signed 1.5 power score");
 const cRow=await db("SELECT count(*)::int AS n FROM a05_analytics.question_exposures WHERE submission_id=$1",[C.submissionId]);
 assert.equal(cRow[0].n,38);
 const dRows=await db("SELECT skip_unknown,shown_count FROM a05_analytics.daily_question_counts WHERE questionnaire_version=$1 AND question_id=$2",[D270_QUESTIONNAIRE,D.exposures[0].questionId]);
 assert.ok(dRows.length>=1);
 const distribution=baseline.body.typeDistribution;
 assert.ok(distribution.some(x=>x.phase==="BASE_30"));
 assert.ok(distribution.some(x=>x.phase==="FINAL_AFTER_YN"));
 for(const phase of ["BASE_30","FINAL_AFTER_YN"]){
  const rows=distribution.filter(x=>x.phase===phase);
  assert.equal(rows.reduce((n,r)=>n+Number(r.n),0),5);
  assert.ok(rows.every(x=>x.classification_version==="A05-D255-YN-PROVISIONAL-CLASSIFIER-1"));
 }
 report("PostgreSQL-classifications-all-eight-axis-snapshots-and-aggregate-denominators");
 const retry=await api("/v1/d270-synthetic/submissions",{
  method:"POST",role:"ingestion-service",body:B});
 assert.equal(retry.status,200);
 assert.equal(retry.body.deletionToken,undefined);
 const conflict={...B,exposures:B.exposures.map(q=>({...q}))};
 conflict.exposures[0].scaleValue=1;
 assert.equal((await api("/v1/d270-synthetic/submissions",{
  method:"POST",role:"ingestion-service",body:conflict})).status,409);
 assert.equal(await core(),5);
 report("same-payload-idempotency-and-conflicting-replay-blocked");

 assert.equal((await api("/v1/d270-synthetic/submissions/"+B.submissionId,{
  method:"DELETE",token:"f".repeat(64)})).status,404);
 assert.equal(await core(),5);
 const del=await api("/v1/d270-synthetic/submissions/"+B.submissionId,{
  method:"DELETE",token:receipts[1]});
 assert.equal(del.status,204);
 assert.equal(await core(),4);
 assert.equal((await api("/v1/d270-synthetic/submissions/"+B.submissionId,{
  method:"DELETE",token:receipts[1]})).status,404);
 assert.equal((await api("/v1/d270-synthetic/submissions",{
  method:"POST",role:"ingestion-service",body:B})).status,409);
 const erased=await db("SELECT count(*)::int AS n FROM a05_analytics.axis_snapshots WHERE submission_id=$1",[B.submissionId]);
 assert.equal(erased[0].n,0);
 const removed=await db("SELECT count(*)::int AS n FROM a05_analytics.question_exposures WHERE submission_id=$1",[B.submissionId]);
 assert.equal(removed[0].n,0);
 const redacted=await db("SELECT state,payload_sha256,deletion_token_sha256 FROM a05_analytics.d267_synthetic_receipts WHERE submission_id=$1",[B.submissionId]);
 assert.equal(redacted[0].state,"DELETED");
 assert.equal(redacted[0].payload_sha256,null);
 assert.equal(redacted[0].deletion_token_sha256,null);
 assert.equal(await legacy(),prior);
 const after=await api("/v1/d270-synthetic/admin/metrics",{role:"reviewer"});
 assert.equal(after.body.submissions,4);
 assert.equal(after.body.typeDistribution.filter(r=>r.phase==="BASE_30")
  .reduce((n,r)=>n+Number(r.n),0),4);
 assert.equal(after.body.typeDistribution.filter(r=>r.phase==="FINAL_AFTER_YN")
  .reduce((n,r)=>n+Number(r.n),0),4);
 report("recipient-token-delete-cascades-and-rebuilds-actual-A05-distributions");

 assert.equal((await api("/v1/d270-synthetic/admin/rebuild",{
  method:"POST",role:"aggregator"})).status,200);
 assert.equal(await core(),4);
 assert.equal(await legacy(),prior);
 const rebuild=await api("/v1/d270-synthetic/admin/metrics",{role:"reviewer"});
 assert.deepEqual(rebuild.body.questions,after.body.questions);
 assert.deepEqual(rebuild.body.typeDistribution,after.body.typeDistribution);
 report("full-rebuild-idempotence-and-D267-version-isolation");

 const audit=await api("/v1/d270-synthetic/admin/audit",{role:"security-admin"});
 assert.equal(audit.status,200);
 const log=JSON.stringify(audit.body);
 assert.ok(log.includes("SUBMISSION_ACCEPTED")&&log.includes("DELETE_COMPLETED")&&
  log.includes("AUTH_DENIED"));
 assert.ok(!log.includes(receipts[1])&&!log.includes(B.submissionId));
 assert.equal((await api("/v1/d270-synthetic/nonexistent")).status,404);
 const oversized=await fetch(origin+"/v1/d270-synthetic/submissions",{
  method:"POST",headers:{"content-type":"application/json",
   authorization:"Bearer "+tokens["ingestion-service"]},
  body:JSON.stringify({bad:"x".repeat(66000)})});
 assert.equal(oversized.status,413);
 assert.equal(await core(),4);
 report("audit-privacy-no-public-route-and-body-size-cap");
 console.log("A05_D270_REAL_CLASSIFIER_POSTGRES_INTEGRATION_PASS "+JSON.stringify({
  manifestsValidated:128,syntheticMatrix:1024,
  invalidCases:cases.length,persistedScenarios:5,removedScenarios:1,
  legacyD267Retained:prior,baselineAndYNCountsCorrect:true,
  axisSnapshotsWritten:8,realD269D255ResearchLogic:true,
  productionDataCollected:false,publicAPI:false,noScoringChanges:true
 }));
}
try{await verify();}
finally{
 if(server)await new Promise(done=>server.close(done));
 await pool.end();
}
