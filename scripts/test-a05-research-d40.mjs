import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {D40_SCENARIOS,runSyntheticD40Scenario} from "./a05-research-d40-simulator.mjs";
import {inspectG1Readiness} from "./a05-research-g1-gate.mjs";

const register=JSON.parse(readFileSync(new URL("../docs/A05_D38_G1_APPROVAL_REGISTER_20261026.json",import.meta.url),"utf8"));
const run=name=>runSyntheticD40Scenario(name);
const last=x=>x.trace.at(-1);

test("D-40 only nine predefined synthetic scenario names are accepted",()=>{
  assert.equal(D40_SCENARIOS.length,9);
  assert.equal(new Set(D40_SCENARIOS).size,9);
  for(const invalid of [null,undefined,17,{},[],"actual-person",""])
    assert.throws(()=>runSyntheticD40Scenario(invalid),RangeError);
  for(const scenario of D40_SCENARIOS){
    const a=run(scenario),b=run(scenario);
    assert.deepEqual(a,b,"the exercise must be deterministic");
    assert.equal(a.authorized,false);
    assert.equal(a.actualDataCollected,false);
    assert.equal(a.actualDeletionPerformed,false);
    assert.equal(a.participantIdentifiersHandled,false);
    assert.equal(a.state,"SYNTHETIC_ONLY_G1_NOT_APPROVED");
    assert.equal(a.retentionApproval,"UNAPPROVED_14_30_90_DAY_PROPOSAL");
    assert.equal(a.remaining.recording,false);
  }
});

test("D-40 no-consent state refuses note collection",()=>{
  const x=run("consent-refused");
  assert.equal(x.remaining.rawNote,false);
  assert.equal(x.remaining.contact,false);
  assert.equal(x.remaining.pseudonymLink,false);
  assert.equal(last(x).outcome,"NOT_RECORDED_WITHOUT_CONSENT");
});

test("D-40 consented synthetic note is cleared along with linkage on timely withdrawal",()=>{
  const x=run("consented-withdrawal");
  assert.equal(x.trace[2].noteMarker,true);
  assert.equal(x.trace[3].outcome,"SYNTHETIC_MARKERS_CLEARED");
  assert.deepEqual(x.remaining,{contact:false,pseudonymLink:false,rawNote:false,recording:false});
  assert.equal(x.withdrawalStatus,"SIMULATED_IDENTIFIABLE_RECORDS_CLEARED");
});

test("D-40 after contact expiry, per-person deletion still depends on an unbuilt verified token",()=>{
  const x=run("withdrawal-after-contact-expiry");
  assert.equal(x.trace[3].day,"2026-11-10");
  assert.equal(x.trace[3].contactMarker,false);
  assert.equal(x.trace[3].linkMarker,true);
  assert.equal(last(x).outcome,"SYNTHETIC_MARKERS_CLEARED");
  assert.equal(x.remaining.rawNote,false);
  assert.equal(x.actualDeletionPerformed,false);
  // A successful marker transition ASSUMES identity verification, not proof
  // that a real participant could furnish a safe removal token.
});

test("D-40 unverified withdrawal cannot delete or falsely confirm a specific person's note",()=>{
  const x=run("unverified-withdrawal");
  assert.equal(x.trace[1].noteMarker,true);
  assert.equal(last(x).outcome,"UNVERIFIED_NO_VERIFIABLE_INDIVIDUAL_DELETION");
  assert.equal(x.withdrawalStatus,"UNVERIFIED_REQUEST_REQUIRES_HUMAN_REVIEW");
  assert.equal(x.remaining.rawNote,true);
  assert.equal(x.remaining.pseudonymLink,true);
  assert.equal(x.authorized,false);
});

test("D-40 linkage expires on day 30 while notes may remain until day 90",()=>{
  const x=run("withdrawal-after-link-expiry");
  assert.equal(x.trace[3].linkMarker,false);
  assert.equal(x.trace[3].noteMarker,true);
  assert.equal(x.trace[4].outcome,"WITHDRAWAL_NOT_VERIFIABLY_DELETED");
  assert.equal(x.withdrawalStatus,"UNMATCHABLE_REQUIRES_HUMAN_REVIEW");
  assert.equal(x.remaining.rawNote,true,
    "never report full individual withdrawal deletion without matching ability");
  assert.equal(x.remaining.pseudonymLink,false);
});

test("D-40 proposed 14/30/90 day retention markers expire at explicit boundaries",()=>{
  const x=run("retention-deadlines");
  assert.equal(x.trace[2].noteMarker,true);
  assert.equal(x.trace[3].day,"2026-11-09");
  assert.equal(x.trace[3].contactMarker,false);
  assert.equal(x.trace[3].linkMarker,true);
  assert.equal(x.trace[4].day,"2026-11-25");
  assert.equal(x.trace[4].linkMarker,false);
  assert.equal(x.trace[4].noteMarker,true);
  assert.equal(x.trace[5].day,"2027-01-24");
  assert.equal(x.trace[5].noteMarker,false);
  assert.deepEqual(x.remaining,{contact:false,pseudonymLink:false,rawNote:false,recording:false});
  assert.equal(x.actualDeletionPerformed,false,
    "a simulated transition never deletes data on a real system");
});

test("D-40 repeated withdrawal is idempotent, and later consent cannot resurrect closure",()=>{
  const repeat=run("repeat-withdrawal");
  assert.deepEqual(repeat.remaining,{contact:false,pseudonymLink:false,rawNote:false,recording:false});
  assert.equal(repeat.trace[3].outcome,"SYNTHETIC_MARKERS_CLEARED");
  const before=run("withdrawal-before-consent");
  assert.equal(before.trace[1].outcome,"REFUSED_AFTER_CLOSURE");
  assert.equal(last(before).outcome,"NOT_RECORDED_WITHOUT_CONSENT");
  assert.equal(before.remaining.rawNote,false);
});

test("D-40 note consent does not imply recording consent",()=>{
  const x=run("recording-not-consented");
  assert.equal(x.trace[0].outcome,"SYNTHETIC_CONSENT_MARKER_ONLY");
  assert.equal(last(x).outcome,"RECORDING_REJECTED_NO_SEPARATE_CONSENT");
  assert.equal(x.remaining.recording,false);
  assert.equal(x.remaining.contact,false,
    "consent for notes must not imply consent for contact storage");
  assert.equal(x.remaining.pseudonymLink,true,
    "pseudonym mapping is a separate disclosed condition of research notes");
});

test("D-40 simulation must never bypass the pending human G1 operations gate",()=>{
  const readiness=inspectG1Readiness(register);
  assert.equal(register.operationalDecisions.length,12);
  assert.ok(register.operationalDecisions.every(item=>item.status==="PENDING"));
  assert.equal(register.finalSignoff.state,"PENDING");
  assert.equal(readiness.authorized,false);
  assert.equal(readiness.manualReviewEligible,false);
  for(const name of D40_SCENARIOS)assert.equal(run(name).authorized,false);
});
