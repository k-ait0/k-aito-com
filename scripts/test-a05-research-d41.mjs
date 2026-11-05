import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {inspectD41PolicySet,evaluateD41Scenario,D41_REVIEW_SCENARIOS} from "./a05-research-d41-withdrawal-review.mjs";
import {inspectG1Readiness} from "./a05-research-g1-gate.mjs";

const manifest=JSON.parse(readFileSync(new URL("../docs/A05_D41_WITHDRAWAL_POLICY_OPTIONS_20261026.json",import.meta.url),"utf8"));
const g1=JSON.parse(readFileSync(new URL("../docs/A05_D38_G1_APPROVAL_REGISTER_20261026.json",import.meta.url),"utf8"));
const clone=x=>structuredClone(x);
const evaluate=(p,s)=>evaluateD41Scenario(manifest,p,s);
const A="A_30DAY_ALIGNMENT", B="B_90DAY_ALIGNMENT", C="C_NO_IDENTIFIABLE_NOTES";

test("D-41 three policies remain proposals, G1 12/12 pending and final signoff pending",()=>{
  assert.equal(inspectD41PolicySet(manifest).authorized,false);
  assert.equal(inspectD41PolicySet(manifest).policyCount,3);
  assert.deepEqual(manifest.policies.map(x=>x.id),[A,B,C]);
  assert.equal(manifest.state,"OPTIONS_UNAPPROVED");
  assert.equal(g1.operationalDecisions.length,12);
  assert.ok(g1.operationalDecisions.every(x=>x.status==="PENDING"));
  assert.equal(g1.finalSignoff.state,"PENDING");
  assert.equal(inspectG1Readiness(g1).authorized,false);
  assert.equal(manifest.approval.realTokenSystemApproved,false);
  assert.equal(manifest.approval.realDeletionSystemApproved,false);
});

test("D-41 A day-30 matched mapping and notes expire together, not at day 90",()=>{
  const day29=evaluate(A,"day29-match"),day30=evaluate(A,"day30-match");
  assert.equal(day29.pseudonymLinkMarker,true);
  assert.equal(day29.rawNoteMarker,true);
  assert.equal(day29.reviewState,"SYNTHETIC_MATCH_HUMAN_REVIEW_ONLY");
  assert.equal(day29.realIdentityVerified,false);
  assert.equal(day30.pseudonymLinkMarker,false);
  assert.equal(day30.rawNoteMarker,false);
  assert.equal(day30.reviewState,"NO_INDIVIDUAL_RECORD_REMAINS_IN_MODEL");
  assert.equal(evaluate(A,"day31-match").rawNoteMarker,false);
  assert.equal(evaluate(A,"day89-match").rawNoteMarker,false);
});

test("D-41 contact expires at day 14 without making identity verification real",()=>{
  for(const p of [A,B]){
    assert.equal(evaluate(p,"day0-match").contactMarker,true);
    assert.equal(evaluate(p,"day14-match").contactMarker,false);
    assert.equal(evaluate(p,"day15-match").contactMarker,false);
    assert.equal(evaluate(p,"day15-match").pseudonymLinkMarker,true);
    assert.equal(evaluate(p,"day15-match").realIdentityVerified,false);
    assert.equal(evaluate(p,"day15-match").authorized,false);
  }
});

test("D-41 B retains mapping and notes until day 90, with explicit added exposure",()=>{
  assert.equal(manifest.policies[1].linkDays,90);
  assert.equal(manifest.policies[1].noteDays,90);
  assert.ok(manifest.policies[1].costs.some(x=>x.includes("90")));
  assert.equal(evaluate(B,"day31-match").pseudonymLinkMarker,true);
  assert.equal(evaluate(B,"day31-match").rawNoteMarker,true);
  assert.equal(evaluate(B,"day89-match").reviewState,"SYNTHETIC_MATCH_HUMAN_REVIEW_ONLY");
  assert.equal(evaluate(B,"day90-match").pseudonymLinkMarker,false);
  assert.equal(evaluate(B,"day90-match").rawNoteMarker,false);
  assert.equal(evaluate(B,"day90-match").reviewState,"NO_INDIVIDUAL_RECORD_REMAINS_IN_MODEL");
});

test("D-41 C avoids any identifiable note, linkage or contact markers in all cases",()=>{
  for(const scenario of D41_REVIEW_SCENARIOS){
    const result=evaluate(C,scenario);
    assert.equal(result.pseudonymLinkMarker,false,scenario);
    assert.equal(result.rawNoteMarker,false,scenario);
    assert.equal(result.contactMarker,false,scenario);
    assert.equal(result.authorized,false,scenario);
    assert.equal(result.actualDeletionPerformed,false,scenario);
  }
});

test("D-41 absent, wrong or replay evidence can never be processed as verified withdrawal",()=>{
  for(const p of [A,B]){
    assert.equal(evaluate(p,"day20-missing-proof").reviewState,"UNVERIFIED_NO_APPROVAL");
    assert.equal(evaluate(p,"day20-wrong-proof").reviewState,"UNVERIFIED_NO_APPROVAL");
    assert.equal(evaluate(p,"day20-replay").reviewState,"REPLAY_NO_APPROVAL");
    for(const scenario of ["day20-missing-proof","day20-wrong-proof","day20-replay"]){
      assert.equal(evaluate(p,scenario).realIdentityVerified,false);
      assert.equal(evaluate(p,scenario).actualDeletionPerformed,false);
    }
  }
});

test("D-41 no consent always blocks request processing, even with fictional match",()=>{
  for(const p of [A,B,C]){
    const result=evaluate(p,"day20-no-consent");
    assert.equal(result.reviewState,"NO_CONSENT_NO_REQUEST_PROCESSING");
    assert.equal(result.realConsentCollected,false);
    assert.equal(result.authorized,false);
  }
});

test("D-41 policy rejects old 30/90 unmatched note window and forged authorizations",()=>{
  const unsafe=clone(manifest);
  unsafe.policies[0].noteDays=90;
  unsafe.policies[0].individualWithdrawalWindowDays=90;
  assert.throws(()=>inspectD41PolicySet(unsafe),/unsafe or inconsistent/);
  const forged=clone(manifest);
  forged.approval.participantRecruitmentAuthorized=true;
  assert.throws(()=>inspectD41PolicySet(forged),/cannot support any authorized/);
  const forgedToken=clone(manifest);
  forgedToken.tokenProtocolProposal.state="IMPLEMENTED";
  assert.throws(()=>inspectD41PolicySet(forgedToken),/cannot support any authorized/);
});

test("D-41 all 12 canned cases are deterministic, with no real identity/data/deletion",()=>{
  assert.equal(D41_REVIEW_SCENARIOS.length,12);
  assert.equal(new Set(D41_REVIEW_SCENARIOS).size,12);
  for(const p of [A,B,C]){
    for(const s of D41_REVIEW_SCENARIOS){
      const x=evaluate(p,s);
      assert.deepEqual(x,evaluate(p,s));
      assert.equal(x.authorized,false);
      assert.equal(x.realIdentityVerified,false);
      assert.equal(x.realConsentCollected,false);
      assert.equal(x.actualDataCollected,false);
      assert.equal(x.actualDeletionPerformed,false);
      assert.equal(x.participantIdentifiersHandled,false);
      assert.ok(x.reviewState);
    }
  }
});

test("D-41 arbitrary tokens, participant IDs and invalid scenarios cannot be submitted",()=>{
  for(const bad of [null,undefined,{},[],42,"actual-participant","day21-match",""]){
    assert.throws(()=>evaluateD41Scenario(manifest,A,bad),RangeError);
    assert.throws(()=>evaluateD41Scenario(manifest,bad,"day0-match"),RangeError);
  }
});
