import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {inspectD42Acceptance,D42_REQUIRED_IDS,D42_STATE}
  from "./a05-research-d42-acceptance-audit.mjs";
import {evaluateD41Scenario} from "./a05-research-d41-withdrawal-review.mjs";

const load=x=>JSON.parse(readFileSync(new URL("../docs/"+x,import.meta.url),"utf8"));
const register=load("A05_D42_30DAY_ACCEPTANCE_REGISTER_20261026.json");
const g1=load("A05_D38_G1_APPROVAL_REGISTER_20261026.json");
const policies=load("A05_D41_WITHDRAWAL_POLICY_OPTIONS_20261026.json");
const clone=value=>structuredClone(value);
const check=(...args)=>inspectD42Acceptance(args.length>0?args[0]:register,args.length>1?args[1]:g1,args.length>2?args[2]:policies);

test("D-42 all 16 acceptance checks are pending, mapped to each G1 control",()=>{
  assert.equal(register.schema,"A05-D42-30DAY-ACCEPTANCE-1");
  assert.deepEqual(register.acceptanceChecks.map(x=>x.id),D42_REQUIRED_IDS);
  assert.equal(new Set(register.acceptanceChecks.map(x=>x.id)).size,16);
  assert.equal(register.acceptanceChecks.length,16);
  assert.deepEqual(
    [...new Set(register.acceptanceChecks.map(x=>x.g1))].sort(),
    g1.operationalDecisions.map(x=>x.id).sort());
  assert.ok(register.acceptanceChecks.every(x=>x.status==="PENDING"));
  assert.equal(register.approval.state,"PENDING");
});

test("D-42 draft audit explicitly blocks approval, recruitment and physical deletion claims",()=>{
  const r=check();
  assert.equal(r.state,D42_STATE);
  assert.equal(r.authorized,false);
  assert.equal(r.participantRecruitmentAuthorized,false);
  assert.equal(r.physicalDeletionVerified,false);
  assert.equal(r.structuralEvidenceFieldsComplete,false);
  assert.equal(r.manualExternalReviewEligible,false);
  assert.equal(r.pendingChecks.length,16);
  assert.equal(r.blockers.filter(s=>s.endsWith(": pending")).length,16);
});

test("D-42 complete synthetic evidence metadata never becomes authorization",()=>{
  const fake=clone(register);
  fake.acceptanceChecks=fake.acceptanceChecks.map((x,i)=>({
    ...x,status:"REVIEWED",humanEvidenceRef:"fictional-review/"+(i+1),
    reviewerRole:"fictional-role",reviewedAt:"2000-01-01"
  }));
  const result=check(fake);
  assert.equal(result.structuralEvidenceFieldsComplete,true);
  assert.equal(result.authorized,false);
  assert.equal(result.physicalDeletionVerified,false);
  assert.equal(result.manualExternalReviewEligible,false);
  assert.equal(result.pendingChecks.length,0);
  assert.equal(g1.operationalDecisions.filter(x=>x.status==="PENDING").length,12);
});

test("D-42 claimed reviewed check without evidence remains blocked",()=>{
  const fake=clone(register);
  fake.acceptanceChecks[0].status="REVIEWED";
  fake.acceptanceChecks[0].humanEvidenceRef="fixture-ref";
  fake.acceptanceChecks[0].reviewerRole="";
  assert.equal(check(fake).structuralEvidenceFieldsComplete,false);
  assert.ok(check(fake).blockers.some(s=>s.includes("AC-01: evidence fields")));
});

test("D-42 rejects missing, duplicate and unknown control IDs",()=>{
  const missing=clone(register);
  missing.acceptanceChecks.pop();
  assert.ok(check(missing).blockers.some(s=>s.includes("Exactly sixteen")));
  assert.ok(check(missing).blockers.some(s=>s.includes("AC-16: absent")));
  const duplicate=clone(register);
  duplicate.acceptanceChecks[15].id="AC-15";
  assert.ok(check(duplicate).blockers.some(s=>s.includes("Duplicated")));
  const unknown=clone(register);
  unknown.acceptanceChecks[15].id="AC-99";
  assert.ok(check(unknown).blockers.some(s=>s.includes("unknown")));
});

test("D-42 rejects altered periods and forged policy approval",()=>{
  const bad=clone(register);
  bad.periods.rawNotesDays=90;
  assert.ok(check(bad).blockers.some(s=>s.includes("30-day proposed policy")));
  const authorized=clone(register);
  authorized.safeBaseline.recruitmentAuthorized=true;
  assert.ok(check(authorized).blockers.some(s=>s.includes("no-authorization")));
  const signed=clone(register);
  signed.approval.state="APPROVED";
  signed.approval.humanAuthorizerRole="fictional-role";
  signed.approval.authorizationEvidenceRef="fictional-proof";
  assert.ok(check(signed).blockers.some(s=>s.includes("signoff must be pending")));
});

test("D-42 refuses D-39 unmatched 30/90 candidate as policy source",()=>{
  const invalid=clone(policies);
  invalid.policies[0].noteDays=90;
  invalid.policies[0].individualWithdrawalWindowDays=90;
  assert.ok(check(register,g1,invalid).blockers.some(s=>s.includes("D41 candidate policy invalid")));
  const adopted=clone(policies);
  adopted.policies[0].status="APPROVED";
  assert.ok(check(register,g1,adopted).blockers.some(s=>s.includes("D41 candidate policy invalid")));
});

test("D-42 rejects source G1 false decision or signoff",()=>{
  const modified=clone(g1);
  modified.operationalDecisions[0].status="DECIDED";
  assert.ok(check(register,modified).blockers.some(s=>s.includes("G1 must remain pending")));
  const signed=clone(g1);
  signed.finalSignoff.state="APPROVED";
  assert.ok(check(register,signed).blockers.some(s=>s.includes("G1 must remain pending")));
});

test("D-42 rejects live-data/recording/physical-deletion claims in baseline",()=>{
  for(const field of ["dataCollectionAuthorized","realTokenImplemented",
    "physicalDeletionValidated","productionReleaseAuthorized","participantRecordsExist"]){
    const fake=clone(register);
    fake.safeBaseline[field]=true;
    assert.equal(check(fake).authorized,false,field);
    assert.ok(check(fake).blockers.some(s=>s.includes("no-authorization")),field);
  }
  const fake=clone(register);
  fake.evidencePolicy.rehearsalMayUse="REAL_RECORDS";
  assert.ok(check(fake).blockers.some(s=>s.includes("Synthetic-only")));
});

test("D-42 thirty-day day-29/day-30 model boundaries never imply actual erasure",()=>{
  const day29=evaluateD41Scenario(policies,"A_30DAY_ALIGNMENT","day29-match");
  const day30=evaluateD41Scenario(policies,"A_30DAY_ALIGNMENT","day30-match");
  assert.equal(day29.rawNoteMarker,true);
  assert.equal(day30.rawNoteMarker,false);
  assert.equal(day29.realIdentityVerified,false);
  assert.equal(day30.actualDeletionPerformed,false);
  assert.equal(check().physicalDeletionVerified,false);
});

test("D-42 malformed acceptance registers never authorize actions",()=>{
  for(const item of [null,undefined,3,"signed",[],{}]){
    const r=check(item);
    assert.equal(r.authorized,false);
    assert.equal(r.manualExternalReviewEligible,false);
    assert.ok(r.blockers.length>0);
  }
});
