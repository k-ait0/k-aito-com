import test from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS } from "../projects/kidp/life-design-lab/a05/questions.mjs";
import { newDraft, makeSnapshot } from "../projects/kidp/life-design-lab/a05/engine.mjs";
import { inspectA05RestorePlan } from "../projects/kidp/life-design-lab/a05/restore-review.mjs";

const HASH = "f".repeat(64);
const empty = () => ({
  drafts:0, history:0, preferences:0, migrations:0, legacyBackups:0
});
const clone = x => structuredClone(x);
function sampleBackup() {
  const draft = newDraft("sample-no-person", HASH);
  draft.answers = Object.fromEntries(QUESTIONS.map(q => [q.id, 4]));
  const snapshot = makeSnapshot(draft,HASH,false);
  return {
    schema:"A05-EXPORT-1",
    exportedAt:"2026-10-26T03:00:00.000Z",
    stores:{
      drafts:[],history:[snapshot],
      preferences:[],migrations:[],legacyBackups:[]
    }
  };
}
const review = (...args) =>
  inspectA05RestorePlan(args.length>0?args[0]:sampleBackup(),
    args.length>1?args[1]:empty(),args.length>2?args[2]:HASH);

test("D-53 an empty browser with a valid test snapshot is still never authorized for restoration", () => {
  const r=review();
  assert.equal(r.status,"PLAN_ONLY_REQUIRES_HUMAN_REVIEW");
  assert.equal(r.restoreImplemented,false);
  assert.equal(r.restoreAuthorized,false);
  assert.equal(r.anyDataWritten,false);
  assert.equal(r.identityOrIntegrityVerified,false);
  assert.equal(r.targetInventoryAtomicWithAnyFutureWrite,false);
  assert.deepEqual(r.analysis.history,{verified:1,legacy:0,quarantined:0});
  assert.ok(r.blockers.includes("RESTORE_ENGINE_NOT_IMPLEMENTED"));
  assert.ok(r.blockers.includes("BACKUP_ORIGIN_AND_INTEGRITY_UNVERIFIED"));
});

test("D-53 any existing local record blocks a proposed restore without showing IDs", () => {
  for(const key of Object.keys(empty())) {
    const counts=empty();
    counts[key]=1;
    const r=review(sampleBackup(),counts);
    assert.equal(r.status,"BLOCKED_EXISTING_LOCAL_DATA",key);
    assert.equal(r.restoreAuthorized,false);
    assert.ok(r.blockers.includes("TARGET_NOT_EMPTY_NO_OVERWRITE"));
    assert.equal(r.analysis.target[key],1);
  }
});

test("D-53 provenance never assumed; current user consent cannot be inferred from backed-up consent", () => {
  const backup=sampleBackup();
  backup.stores.preferences=[{id:"consent",enabled:true,retainRaw:true,email:"private@example.invalid"}];
  const r=review(backup);
  assert.ok(r.blockers.includes("CONSENT_MUST_NOT_BE_IMPORTED"));
  assert.equal(r.restoreAuthorized,false);
  assert.equal(r.anyDataWritten,false);
  assert.equal(JSON.stringify(r).includes("private@example.invalid"),false);
  assert.equal(JSON.stringify(r).includes("sample-no-person"),false);
});

test("D-53 old and corrupted history are count-only categories, never auto-migrated", () => {
  const backup=sampleBackup();
  const old=clone(backup.stores.history[0]);
  old.id="synthetic-legacy";
  old.versions.scoring="old-research-version";
  const bad=clone(backup.stores.history[0]);
  bad.id="synthetic-corrupted";
  bad.result.axes[0].n=-1;
  backup.stores.history.push(old,bad);
  const r=review(backup);
  assert.deepEqual(r.analysis.history,{verified:1,legacy:1,quarantined:1});
  assert.ok(r.blockers.includes("HISTORY_REQUIRES_MANUAL_VERSION_REVIEW"));
  assert.equal(r.status,"BLOCKED_BACKUP_INCOMPATIBLE");
  assert.equal(r.restoreAuthorized,false);
  assert.equal(JSON.stringify(r).includes("synthetic-legacy"),false);
});

test("D-53 malformed/multiple drafts remain non-importable; no raw answers returned", () => {
  const source=sampleBackup();
  const valid=newDraft("synthetic-11", HASH);
  valid.answers = {A01:7};
  const malformed=clone(valid);
  malformed.id="another-draft";
  malformed.assessmentId="synthetic-12";
  malformed.revision=-1;
  source.stores.drafts=[valid,malformed];
  const r=review(source);
  assert.equal(r.analysis.compatibleDrafts,1);
  assert.ok(r.blockers.includes("MULTIPLE_DRAFTS_NOT_IMPORTABLE"));
  assert.ok(r.blockers.includes("DRAFT_NOT_COMPATIBLE_WITH_CURRENT_VERSION"));
  assert.equal(r.status,"BLOCKED_BACKUP_INCOMPATIBLE");
  assert.equal(r.restoreAuthorized,false);
  assert.equal(JSON.stringify(r).includes("A01"),false);
});

test("D-53 protected domains must be reviewed manually", () => {
  const source=sampleBackup();
  source.stores.migrations=[{id:"synth-migration"}];
  source.stores.legacyBackups=[{id:"synth-legacy-backup"}];
  const r=review(source);
  assert.ok(r.blockers.includes("PROTECTED_DOMAINS_REQUIRE_MANUAL_REVIEW"));
  assert.equal(r.status,"BLOCKED_BACKUP_INCOMPATIBLE");
  assert.equal(r.restoreAuthorized,false);
});

test("D-53 invalid original export and unknown local inventory are not considered safe", () => {
  const source=sampleBackup();
  source.schema="A05-EXPORT-99";
  assert.equal(review(source).status,"BLOCKED_STRUCTURE");
  const valid=sampleBackup();
  assert.equal(review(valid,null).status,"BLOCKED_UNKNOWN_TARGET_OR_VERSION");
  for(const faulty of [undefined,{},[],{...empty(),history:-1},{...empty(),drafts:"0"}]) {
    const r=review(valid,faulty);
    assert.equal(r.restoreAuthorized,false);
    assert.ok(r.blockers.includes("LOCAL_INVENTORY_UNAVAILABLE"));
  }
  assert.equal(review(valid,empty(),"not-a-hash").status,"BLOCKED_UNKNOWN_TARGET_OR_VERSION");
});

test("D-53 summary contains only aggregated numbers and generic flags, no imported objects", () => {
  const source=sampleBackup();
  source.stores.history[0].rawAnswers={A01:4};
  source.stores.history[0].email="synthetic-privacy@example.invalid";
  const r=review(source,empty());
  const text=JSON.stringify(r);
  assert.equal(text.includes("synthetic-privacy"),false);
  assert.equal(text.includes("rawAnswers"),false);
  assert.equal(text.includes("A01"),false);
  assert.equal(text.includes("sample-no-person"),false);
  assert.equal(Object.isFrozen(r),true);
  assert.equal(Object.isFrozen(r.blockers),true);
  assert.equal(Object.isFrozen(r.analysis.history),true);
  assert.equal(r.anyDataWritten,false);
});

test("D-55 no empty-target backup with incompatible history is labelled planning-only",()=>{
  for(const kind of ["legacy","quarantined"]){
    const backup=sampleBackup();
    if(kind==="legacy") backup.stores.history[0].versions.scoring="unrecognized-old-score";
    else backup.stores.history[0].result.axes[0].n=-1;
    const r=review(backup,empty());
    assert.equal(r.status,"BLOCKED_BACKUP_INCOMPATIBLE",kind);
    assert.equal(r.analysis.history[kind],1);
    assert.equal(r.analysis.target.history,0);
    assert.equal(r.restoreAuthorized,false);
    assert.equal(r.anyDataWritten,false);
  }
});

test("D-55 only fully compatible synthetic records can keep a nonauthorizing plan state",()=>{
  const good=review(sampleBackup(),empty());
  assert.equal(good.status,"PLAN_ONLY_REQUIRES_HUMAN_REVIEW");
  assert.equal(good.restoreImplemented,false);
  const withConsent=sampleBackup();
  withConsent.stores.preferences=[{id:"consent",enabled:true,retainRaw:true}];
  const check=review(withConsent,empty());
  assert.equal(check.status,"PLAN_ONLY_REQUIRES_HUMAN_REVIEW");
  assert.ok(check.blockers.includes("CONSENT_MUST_NOT_BE_IMPORTED"));
  assert.equal(check.restoreAuthorized,false);
  assert.equal(check.identityOrIntegrityVerified,false);
});
