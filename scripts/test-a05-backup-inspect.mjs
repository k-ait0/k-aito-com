import test from "node:test";
import assert from "node:assert/strict";
import {inspectA05Backup, A05_BACKUP_STORES, A05_BACKUP_MAX_BYTES}
  from "../projects/kidp/life-design-lab/a05/backup-inspect.mjs";

function fixture() {
  return {
    schema: "A05-EXPORT-1",
    exportedAt: "2026-10-26T03:00:00.000Z",
    notice: "Synthetic test file, no respondent answers",
    stores: {
      drafts: [{id:"active"}],
      history: [{id:"synthetic-history-1"}, {id:"synthetic-history-2"}],
      preferences: [{id:"consent"}],
      migrations: [],
      legacyBackups: [{id:"synthetic-legacy-1"}]
    }
  };
}

test("D-52 structurally valid export produces five counts, no content or restore claims", () => {
  const data = fixture();
  const result = inspectA05Backup(data);
  assert.equal(result.ok, true);
  assert.equal(result.restored, false);
  assert.equal(result.verifiedIntegrity, false);
  assert.equal(result.total, 5);
  assert.deepEqual(result.counts, {
    drafts:1, history:2, preferences:1, migrations:0, legacyBackups:1
  });
  assert.deepEqual(A05_BACKUP_STORES,
    ["drafts","history","preferences","migrations","legacyBackups"]);
  assert.equal(A05_BACKUP_MAX_BYTES, 10485760);
  data.stores.history.push({id:"synthetic-history-3"});
  assert.equal(result.counts.history, 2, "report is detached from input");
});

test("D-52 rejects unsupported schema, malformed timestamp and non-object roots", () => {
  for(const bad of [null,undefined,[],12,"{}",{}]) {
    const report=inspectA05Backup(bad);
    assert.equal(report.ok,false);
    assert.equal(report.restored,false);
  }
  for(const value of ["A05-EXPORT-2","A05-BACKUP",null,""]) {
    const f=fixture(); f.schema=value;
    assert.equal(inspectA05Backup(f).ok,false);
  }
  for(const value of ["bad", "2026-13-44", 20261026, null]) {
    const f=fixture(); f.exportedAt=value;
    assert.equal(inspectA05Backup(f).ok,false);
  }
});

test("D-52 rejects missing, extra or incorrectly typed data stores", () => {
  const missing=fixture(); delete missing.stores.preferences;
  assert.equal(inspectA05Backup(missing).ok,false);
  const extra=fixture(); extra.stores.extra=[];
  assert.equal(inspectA05Backup(extra).ok,false);
  const nonarray=fixture(); nonarray.stores.history={};
  assert.equal(inspectA05Backup(nonarray).ok,false);
  const invalid=fixture(); invalid.stores=null;
  assert.equal(inspectA05Backup(invalid).ok,false);
});

test("D-52 detects missing, duplicate and malformed IDs without returning any identifiers", () => {
  for(const records of [
    [{ id:"synthetic" },{ id:"synthetic" }],
    [{ id:"" }],
    [{ id:7 }],
    [null],
    [1],
    [["not-a-record"]]
  ]) {
    const f=fixture(); f.stores.history=records;
    const result=inspectA05Backup(f);
    assert.equal(result.ok,false);
    assert.equal(result.counts,null);
    assert.equal(result.total,0);
    assert.equal(JSON.stringify(result).includes("synthetic"),false);
  }
});

test("D-52 immutable summary does not return personal content or saved responses", () => {
  const data=fixture();
  data.stores.history[0].rawAnswers={A01:7};
  data.stores.history[0].email="alice@example.invalid";
  const report=inspectA05Backup(data);
  assert.equal(report.ok,true);
  const serialized=JSON.stringify(report);
  assert.equal(serialized.includes("alice"),false);
  assert.equal(serialized.includes("A01"),false);
  assert.equal(serialized.includes("synthetic-history"),false);
  assert.equal(Object.isFrozen(report),true);
  assert.equal(Object.isFrozen(report.counts),true);
});
