/**
 * A05 browser-only storage. No remote transmission and no localStorage writes.
 * "active" is a single in-progress draft; history snapshots are immutable.
 * Old D-12/D-19 stores are not read or deleted by this adapter.
 */
import { verifyDraft, makeSnapshot, classifySnapshot } from "./engine.mjs";

export const DB_NAME = "kaito-a05-values-v1";
const STORES = ["drafts", "history", "preferences", "migrations", "legacyBackups"];

export class StorageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "StorageError";
    this.code = code;
  }
}

export function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new StorageError("STORAGE_UNAVAILABLE", "IndexedDBを利用できません"));
      return;
    }
    let req;
    try { req = indexedDB.open(DB_NAME, 1); }
    catch (e) { reject(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error("Database open failed"));
    req.onblocked = () => reject(new StorageError("STORAGE_UNAVAILABLE", "別タブを閉じてください"));
  });
}

function transaction(db, stores, mode, operation) {
  return new Promise((resolve, reject) => {
    let tx;
    try { tx = db.transaction(stores, mode); }
    catch (e) { reject(e); return; }
    let output;
    let failure;
    const ctl = {
      result(value) { output = value; },
      abort(error) {
        failure = error;
        try { tx.abort(); } catch (_) { /* already aborted */ }
      }
    };
    tx.oncomplete = () => resolve(output);
    tx.onabort = () => reject(failure ?? tx.error ?? new Error("Transaction aborted"));
    try { operation(tx, ctl); }
    catch (e) { ctl.abort(e); }
  });
}

export function read(db, store, id) {
  return transaction(db, [store], "readonly", (tx, ctl) => {
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => ctl.result(req.result);
  });
}

export function readAll(db, store) {
  return transaction(db, [store], "readonly", (tx, ctl) => {
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => ctl.result(req.result);
  });
}

export async function restoreState(db, questionHash) {
  const [consent, draft, history] = await Promise.all([
    read(db, "preferences", "consent"),
    read(db, "drafts", "active"),
    readAll(db, "history")
  ]);
  const report = { verified: [], legacy: [], quarantined: [], warnings: [] };
  const seen = new Set();
  for (const item of history) {
    let status = classifySnapshot(item, questionHash);
    if (typeof item?.id !== "string" || seen.has(item.id)) status = "quarantined";
    else seen.add(item.id);
    report[status].push(item);
  }
  let currentDraft = null;
  if (draft !== undefined) {
    try {
      verifyDraft(draft, questionHash);
      currentDraft = draft;
    } catch (e) {
      report.warnings.push("下書きの版または内容が非互換です");
    }
  }
  if (report.legacy.length) report.warnings.push("未検証の旧版履歴があります");
  if (report.quarantined.length) report.warnings.push("不整合のある履歴を検出しました");
  if (!consent?.enabled && (draft !== undefined || history.length)) {
    report.warnings.push("保存同意と保存内容の整合性を確認できません");
  }
  return {
    consent: consent?.enabled === true,
    retainRaw: consent?.retainRaw === true,
    draft: currentDraft,
    report,
    readOnly: report.warnings.length > 0
  };
}

export function enableSaving(db, draft, questionHash, retainRaw = false) {
  verifyDraft(draft, questionHash);
  return transaction(db, ["drafts", "preferences"], "readwrite", (tx) => {
    // add() fails rather than overwrite an unknown existing draft.
    tx.objectStore("drafts").add({ ...draft, revision: 0 });
    tx.objectStore("preferences").put({
      id: "consent",
      enabled: true,
      retainRaw: retainRaw === true,
      grantedAt: new Date().toISOString()
    });
  }).then(() => 0);
}

export function saveDraft(db, draft, questionHash, expectedRevision) {
  verifyDraft(draft, questionHash);
  return transaction(db, ["drafts", "preferences"], "readwrite", (tx, ctl) => {
    const consentReq = tx.objectStore("preferences").get("consent");
    const drafts = tx.objectStore("drafts");
    const request = drafts.get("active");
    request.onsuccess = () => {
      try {
        if (!consentReq.result?.enabled) {
          throw new StorageError("NO_CONSENT", "保存同意がありません");
        }
        const current = request.result;
        const actual = current?.revision ?? null;
        if (actual !== expectedRevision ||
            (current && current.assessmentId !== draft.assessmentId)) {
          throw new StorageError("REVISION_CONFLICT", "別のタブで回答が更新されました");
        }
        const newRevision = actual === null ? 0 : actual + 1;
        drafts.put({ ...draft, revision: newRevision });
        ctl.result(newRevision);
      } catch (e) { ctl.abort(e); }
    };
  });
}

export function replaceDraft(db, nextDraft, questionHash, expectedRevision) {
  verifyDraft(nextDraft, questionHash);
  return transaction(db, ["drafts", "preferences"], "readwrite", (tx, ctl) => {
    const prefReq = tx.objectStore("preferences").get("consent");
    const drafts = tx.objectStore("drafts");
    const request = drafts.get("active");
    request.onsuccess = () => {
      try {
        if (!prefReq.result?.enabled) throw new StorageError("NO_CONSENT", "保存同意がありません");
        const current = request.result;
        const actual = current?.revision ?? null;
        if (actual !== expectedRevision) throw new StorageError("REVISION_CONFLICT", "下書きが更新されました");
        const revision = actual === null ? 0 : actual + 1;
        drafts.put({ ...nextDraft, revision });
        ctl.result(revision);
      } catch (e) { ctl.abort(e); }
    };
  });
}

export function finalizeDraft(db, assessmentId, expectedRevision, questionHash, retainRaw) {
  return transaction(db, ["drafts", "history", "preferences"], "readwrite", (tx, ctl) => {
    const prefReq = tx.objectStore("preferences").get("consent");
    const drafts = tx.objectStore("drafts");
    const history = tx.objectStore("history");
    const request = drafts.get("active");
    request.onsuccess = () => {
      try {
        if (!prefReq.result?.enabled) throw new StorageError("NO_CONSENT", "保存同意がありません");
        const stored = request.result;
        if (!stored || stored.assessmentId !== assessmentId ||
            stored.revision !== expectedRevision) {
          throw new StorageError("REVISION_CONFLICT", "診断が別タブで変更されました");
        }
        if (retainRaw && !prefReq.result.retainRaw) {
          throw new StorageError("NO_CONSENT", "生回答の保存同意がありません");
        }
        const snapshot = makeSnapshot(stored, questionHash, retainRaw);
        history.add(snapshot); // Duplicate ID => whole transaction aborts.
        drafts.delete("active");
        ctl.result(snapshot);
      } catch (e) { ctl.abort(e); }
    };
  });
}

export function setRawRetention(db, enabled) {
  return transaction(db, ["preferences"], "readwrite", (tx, ctl) => {
    const st = tx.objectStore("preferences");
    const request = st.get("consent");
    request.onsuccess = () => {
      if (!request.result?.enabled) {
        ctl.abort(new StorageError("NO_CONSENT", "保存同意がありません"));
      } else {
        st.put({ ...request.result, retainRaw: enabled === true });
      }
    };
  });
}

export function removeRawAnswers(db, id) {
  return transaction(db, ["history"], "readwrite", (tx, ctl) => {
    const st = tx.objectStore("history");
    const request = st.get(id);
    request.onsuccess = () => {
      if (!request.result) {
        ctl.abort(new StorageError("NOT_FOUND", "対象の履歴がありません"));
        return;
      }
      const { rawAnswers: _removed, ...snapshot } = request.result;
      st.put(snapshot);
    };
  });
}

export function deleteAssessment(db, id) {
  return transaction(db, ["history"], "readwrite", (tx, ctl) => {
    const st = tx.objectStore("history");
    const request = st.get(id);
    request.onsuccess = () => {
      if (!request.result) ctl.abort(new StorageError("NOT_FOUND", "対象の履歴がありません"));
      else st.delete(id);
    };
  });
}

/** Only this new A05 database. Old experimental stores require a separate migration/deletion review. */
export function eraseA05DatabaseContents(db) {
  return transaction(db, STORES, "readwrite", tx => {
    for (const name of STORES) tx.objectStore(name).clear();
  });
}
