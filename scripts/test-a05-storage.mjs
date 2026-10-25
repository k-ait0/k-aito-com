"use strict";
/**
 * Dependency-free Node adapter contract tests using an in-memory event-driven
 * IndexedDB simulator. Not a browser compatibility/transaction test.
 *
 * Run: node --test scripts/test-a05-storage.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS } from "../projects/kidp/life-design-lab/a05/questions.mjs";
import { newDraft } from "../projects/kidp/life-design-lab/a05/engine.mjs";
import {
  enableSaving, saveDraft, finalizeDraft, restoreState, read,
  readRecoverySnapshot, readExportSnapshot, readA05StoreCounts, removeRawAnswers, deleteAssessment, eraseA05DatabaseContents
} from "../projects/kidp/life-design-lab/a05/storage.mjs";

const HASH = "f".repeat(64);
const NAMES = ["drafts", "history", "preferences", "migrations", "legacyBackups"];
const copy = value => value === undefined ? undefined : structuredClone(value);

/** Minimal asynchronous request semantics with transactional rollback. */
class SimulatedDatabase {
  constructor() {
    this.stores = Object.fromEntries(NAMES.map(name => [name, new Map()]));
  }

  transaction(names, mode) {
    const db = this;
    const working = Object.fromEntries(names.map(name => [
      name,
      new Map(Array.from(db.stores[name], ([key, value]) => [key, copy(value)]))
    ]));
    let pending = 0;
    let aborted = false;
    let finished = false;

    const tx = {
      oncomplete: null,
      onabort: null,
      error: null,
      abort() {
        if (aborted || finished) return;
        aborted = true;
        queueMicrotask(() => tx.onabort?.());
      },
      objectStore(name) {
        if (!Object.hasOwn(working, name)) throw new Error("Unknown object store");
        const map = working[name];

        function maybeComplete() {
          queueMicrotask(() => {
            if (aborted || finished || pending !== 0) return;
            finished = true;
            if (mode === "readwrite") {
              for (const store of names) db.stores[store] = working[store];
            }
            tx.oncomplete?.();
          });
        }

        function request(operation) {
          const req = { result: undefined, error: null, onsuccess: null };
          pending++;
          queueMicrotask(() => {
            if (aborted) { pending--; return; }
            try {
              req.result = operation();
              req.onsuccess?.();
            } catch (error) {
              req.error = error;
              tx.error = error;
              tx.abort();
            }
            pending--;
            maybeComplete();
          });
          return req;
        }

        return {
          get: key => request(() => copy(map.get(key))),
          getAll: () => request(() => Array.from(map.values()).map(copy)),
          count: () => request(() => map.size),
          put: value => request(() => {
            if (mode !== "readwrite") throw Error("Read-only transaction");
            map.set(value.id, copy(value));
            return value.id;
          }),
          add: value => request(() => {
            if (mode !== "readwrite") throw Error("Read-only transaction");
            if (map.has(value.id)) throw Error("ConstraintError");
            map.set(value.id, copy(value));
            return value.id;
          }),
          delete: key => request(() => {
            if (mode !== "readwrite") throw Error("Read-only transaction");
            map.delete(key);
          }),
          clear: () => request(() => {
            if (mode !== "readwrite") throw Error("Read-only transaction");
            map.clear();
          })
        };
      }
    };
    return tx;
  }
}

function fixture(id = "case-11", typeNumber = 11, wealth = "time") {
  const draft = newDraft(id, HASH);
  const index = typeNumber - 1;
  const group = Math.floor(index / 4);
  const within = index % 4;
  const signs = [
    group >= 2 ? 1 : -1,
    group % 2 ? 1 : -1,
    within >= 2 ? 1 : -1,
    within % 2 ? 1 : -1,
    wealth === "time" ? 1 : wealth === "money" ? -1 : 0
  ];
  draft.answers = Object.fromEntries(QUESTIONS.map(question => {
    const sign = signs["ABCDE".indexOf(question.axis)];
    return [question.id, sign === 0 ? 4 : 4 + 3 * sign * question.direction];
  }));
  return draft;
}

test("consent and draft registration succeed together", async () => {
  const db = new SimulatedDatabase();
  assert.equal((await restoreState(db, HASH)).consent, false);
  assert.equal(await enableSaving(db, fixture(), HASH, false), 0);
  assert.equal((await read(db, "preferences", "consent")).enabled, true);
  assert.equal((await read(db, "drafts", "active")).revision, 0);
});

test("duplicate initial draft rejects without overwriting data", async () => {
  const db = new SimulatedDatabase();
  await enableSaving(db, fixture(), HASH, false);
  await assert.rejects(enableSaving(db, fixture("second"), HASH, true));
  assert.equal((await read(db, "drafts", "active")).assessmentId, "case-11");
  assert.equal((await read(db, "preferences", "consent")).retainRaw, false);
});

test("optimistic revision check prevents stale overwrite", async () => {
  const db = new SimulatedDatabase();
  const draft = fixture();
  await enableSaving(db, draft, HASH, false);
  draft.revision = 0;
  assert.equal(await saveDraft(db, draft, HASH, 0), 1);
  await assert.rejects(saveDraft(db, draft, HASH, 0));
  assert.equal((await read(db, "drafts", "active")).revision, 1);
});

test("finalize rejects missing raw-consent and old revision atomically", async () => {
  const db = new SimulatedDatabase();
  await enableSaving(db, fixture(), HASH, false);
  await assert.rejects(finalizeDraft(db, "case-11", 0, HASH, true));
  await assert.rejects(finalizeDraft(db, "case-11", 99, HASH, false));
  assert.equal((await read(db, "drafts", "active")).revision, 0);
  assert.equal(await read(db, "history", "case-11"), undefined);
});

test("finalize succeeds, removes the draft, and verifies the snapshot", async () => {
  const db = new SimulatedDatabase();
  await enableSaving(db, fixture(), HASH, false);
  const snapshot = await finalizeDraft(db, "case-11", 0, HASH, false);
  assert.equal(snapshot.result.typeId, "T11");
  assert.equal(Object.hasOwn(snapshot, "rawAnswers"), false);
  assert.equal(await read(db, "drafts", "active"), undefined);
  const restored = await restoreState(db, HASH);
  assert.equal(restored.report.verified.length, 1);
  assert.equal(restored.readOnly, false);
});

test("incomplete finalization aborts without losing the draft", async () => {
  const db = new SimulatedDatabase();
  const draft = fixture();
  delete draft.answers.A01;
  await enableSaving(db, draft, HASH, false);
  await assert.rejects(finalizeDraft(db, "case-11", 0, HASH, false));
  assert.equal(await read(db, "history", "case-11"), undefined);
  assert.equal((await read(db, "drafts", "active")).assessmentId, "case-11");
});

test("duplicate historical ID aborts finalization and keeps new draft", async () => {
  const db = new SimulatedDatabase();
  await enableSaving(db, fixture(), HASH, false);
  await finalizeDraft(db, "case-11", 0, HASH, false);
  // A new draft is accepted, but cannot overwrite the existing history ID.
  const second = fixture();
  second.revision = null;
  // An active consent exists; saveDraft creates the next draft with revision 0.
  assert.equal(await saveDraft(db, second, HASH, null), 0);
  await assert.rejects(finalizeDraft(db, "case-11", 0, HASH, false));
  assert.equal((await read(db, "drafts", "active")).assessmentId, "case-11");
  assert.equal((await read(db, "history", "case-11")).result.typeId, "T11");
});

test("raw answer retention is opt-in and raw-only removal preserves results", async () => {
  const db = new SimulatedDatabase();
  await enableSaving(db, fixture("case-14", 14, "money"), HASH, true);
  const snapshot = await finalizeDraft(db, "case-14", 0, HASH, true);
  assert.ok(Object.hasOwn(snapshot, "rawAnswers"));
  await removeRawAnswers(db, "case-14");
  const updated = await read(db, "history", "case-14");
  assert.equal(Object.hasOwn(updated, "rawAnswers"), false);
  assert.deepEqual(updated.result, snapshot.result);
});

test("explicit delete and erase only affect this simulated database", async () => {
  const db = new SimulatedDatabase();
  await enableSaving(db, fixture(), HASH, false);
  await finalizeDraft(db, "case-11", 0, HASH, false);
  await deleteAssessment(db, "case-11");
  assert.equal(await read(db, "history", "case-11"), undefined);
  await assert.rejects(deleteAssessment(db, "missing"));
  await eraseA05DatabaseContents(db);
  assert.equal(await read(db, "preferences", "consent"), undefined);
  assert.equal((await restoreState(db, HASH)).consent, false);
});


test("restoration reads consent/draft/history from a single transaction", async () => {
  const db = new SimulatedDatabase();
  await enableSaving(db, fixture(), HASH, false);
  await finalizeDraft(db, "case-11", 0, HASH, false);
  let transactionCount = 0;
  const original = db.transaction.bind(db);
  db.transaction = (...args) => {
    transactionCount++;
    assert.deepEqual(new Set(args[0]), new Set(["preferences", "drafts", "history"]));
    assert.equal(args[1], "readonly");
    return original(...args);
  };
  const restored = await restoreState(db, HASH);
  assert.equal(transactionCount, 1);
  assert.equal(restored.consent, true);
  assert.equal(restored.draft, null);
  assert.equal(restored.report.verified.length, 1);
});

test("re-registering consent cannot overwrite prior choices after finalization", async () => {
  const db = new SimulatedDatabase();
  await enableSaving(db, fixture(), HASH, false);
  await finalizeDraft(db, "case-11", 0, HASH, false);
  const before = await read(db, "preferences", "consent");
  await assert.rejects(enableSaving(db, fixture("second"), HASH, true));
  assert.deepEqual(await read(db, "preferences", "consent"), before);
  assert.equal(await read(db, "drafts", "active"), undefined);
  assert.equal((await read(db, "history", "case-11")).result.typeId, "T11");
});

test("restore quarantines damaged history individually, preserving verified records", async () => {
  const db = new SimulatedDatabase();
  await enableSaving(db, fixture(), HASH, false);
  await finalizeDraft(db, "case-11", 0, HASH, false);
  db.stores.history.set("broken", {
    id: "broken",
    schemaVersion: 1,
    completedAt: new Date().toISOString(),
    versions: { question: "legacy", scoring: "legacy", type: "legacy", content: "legacy" },
    questionHash: HASH,
    result: { axes: [null, null, null, null, null], typeId: "T99", classification: "classified", wealth: "time" },
    presentation: { id: "T99", name: "Unknown", summary: "" }
  });
  const restored = await restoreState(db, HASH);
  assert.equal(restored.report.verified.length, 1);
  assert.equal(restored.report.quarantined.length, 1);
  assert.equal(restored.readOnly, true);
  assert.ok(restored.report.warnings.length);
});

test("snapshot API returns a coherent set of recovery domains", async () => {
  const db = new SimulatedDatabase();
  await enableSaving(db, fixture(), HASH, true);
  const { consent, draft, history } = await readRecoverySnapshot(db);
  assert.equal(consent.enabled, true);
  assert.equal(consent.retainRaw, true);
  assert.equal(draft.assessmentId, "case-11");
  assert.equal(history.length, 0);
});

test("D-51 full export reads all five A05 stores with exactly one readonly transaction", async () => {
  const db = new SimulatedDatabase();
  await enableSaving(db, fixture(), HASH, true);
  db.stores.migrations.set("m1", { id: "m1", status: "fixture-only" });
  db.stores.legacyBackups.set("b1", { id: "b1", status: "fixture-only" });
  const expected = ["drafts", "history", "preferences", "migrations", "legacyBackups"];
  let count = 0;
  const original = db.transaction.bind(db);
  db.transaction = (stores, mode) => {
    count++;
    assert.deepEqual(stores, expected);
    assert.equal(mode, "readonly");
    return original(stores, mode);
  };
  const snapshot = await readExportSnapshot(db);
  assert.equal(count, 1, "exporting separate stores must not mix different transaction points");
  assert.deepEqual(Object.keys(snapshot), expected);
  assert.equal(snapshot.drafts[0].assessmentId, "case-11");
  assert.equal(snapshot.preferences[0].retainRaw, true);
  assert.deepEqual(snapshot.migrations.map(x => x.id), ["m1"]);
  assert.deepEqual(snapshot.legacyBackups.map(x => x.id), ["b1"]);
  assert.deepEqual(snapshot.history, []);
});

test("D-51 export snapshot is a detached copy and does not mutate source stores", async () => {
  const db = new SimulatedDatabase();
  await enableSaving(db, fixture(), HASH, false);
  await finalizeDraft(db, "case-11", 0, HASH, false);
  const snapshot = await readExportSnapshot(db);
  assert.equal(snapshot.history.length, 1);
  const id = snapshot.history[0].id;
  snapshot.history[0].presentation.name = "changed-in-export-memory";
  snapshot.history.push({ id: "made-up-export-record" });
  snapshot.preferences[0].retainRaw = true;
  assert.equal((await read(db, "history", id)).presentation.name ===
    "changed-in-export-memory", false);
  assert.equal((await read(db, "preferences", "consent")).retainRaw, false);
  assert.equal((await readAllForD51(db, "history")).length, 1);
});

async function readAllForD51(db, store) {
  const request = db.transaction([store], "readonly").objectStore(store).getAll();
  return new Promise(resolve => { request.onsuccess = () => resolve(request.result); });
}

test("D-53 restore planning inventory reads counts in one readonly multi-store transaction", async () => {
  const db = new SimulatedDatabase();
  await enableSaving(db, fixture(), HASH, false);
  db.stores.migrations.set("fixture-migration", {id:"fixture-migration"});
  let called = 0;
  const original = db.transaction.bind(db);
  db.transaction = (names, mode) => {
    called++;
    assert.deepEqual(names, NAMES);
    assert.equal(mode, "readonly");
    return original(names, mode);
  };
  const counts = await readA05StoreCounts(db);
  assert.equal(called, 1);
  assert.deepEqual(counts, {
    drafts:1, history:0, preferences:1, migrations:1, legacyBackups:0
  });
  assert.equal(Object.values(counts).reduce((x,y)=>x+y),3);
});

test("D-53 inventory of empty stores reports zero without erasing any records", async () => {
  const db = new SimulatedDatabase();
  assert.deepEqual(await readA05StoreCounts(db),
    {drafts:0, history:0, preferences:0, migrations:0, legacyBackups:0});
  await enableSaving(db, fixture(), HASH, false);
  assert.deepEqual(await readA05StoreCounts(db),
    {drafts:1, history:0, preferences:1, migrations:0, legacyBackups:0});
  assert.equal((await read(db, "drafts", "active")).assessmentId, "case-11");
});

test("D-55 stale type/content draft versions fail closed without touching persisted consent",async()=>{
  for(const dimension of ["type","content"]){
    const db=new SimulatedDatabase();
    const candidate=fixture("synthetic-version-"+dimension);
    candidate.versions[dimension]="legacy-"+dimension;
    assert.throws(()=>enableSaving(db,candidate,HASH,false),
      /Unsupported or corrupted draft/);
    assert.equal(await read(db,"drafts","active"),undefined);
    assert.equal(await read(db,"preferences","consent"),undefined);

    await enableSaving(db,fixture("good-"+dimension),HASH,false);
    // Simulate a draft originating from an older type/presentation version.
    db.stores.drafts.get("active").versions[dimension]="legacy-"+dimension;
    const result=await restoreState(db,HASH);
    assert.equal(result.draft,null,dimension);
    assert.equal(result.consent,true,dimension);
    assert.equal(result.readOnly,true,dimension);
    assert.ok(result.report.warnings.some(x=>x.includes("下書きの版")),dimension);
    assert.equal((await read(db,"drafts","active")).versions[dimension],
      "legacy-"+dimension,"quarantining an old draft must not delete it");
  }
});
