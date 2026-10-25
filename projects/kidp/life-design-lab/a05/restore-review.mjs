/**
 * D-53 no-write recovery plan for A05 backups.
 * No importing, restoring, granting consent, copying records, or ID exposure.
 * Every output is a data-minimal planning note, NEVER permission to restore.
 */
import { inspectA05Backup, A05_BACKUP_STORES } from "./backup-inspect.mjs";
import { classifySnapshot, verifyDraft } from "./engine.mjs";

const NO_AUTHORITY = "PLANNING_ONLY_RESTORE_NOT_IMPLEMENTED";
const TYPES = Object.freeze(["verified", "legacy", "quarantined"]);
const counter = () => ({ verified: 0, legacy: 0, quarantined: 0 });
const base = () => ({
  state: NO_AUTHORITY,
  restoreAuthorized: false,
  restoreImplemented: false,
  anyDataWritten: false,
  identityOrIntegrityVerified: false,
  targetInventoryAtomicWithAnyFutureWrite: false,
  analysis: { source: null, target: null, history: counter(), compatibleDrafts: 0 },
  blockers: []
});

/**
 * @param {object} backup parsed A05-EXPORT-1 JSON; held in caller memory only.
 * @param {object|null} localCounts five aggregate IDB counts from one readonly tx.
 * @param {string} currentQuestionHash SHA-256 for current A05 question set.
 */
export function inspectA05RestorePlan(backup, localCounts, currentQuestionHash) {
  const report = base();
  const add = (reason) => { if (!report.blockers.includes(reason)) report.blockers.push(reason); };
  const structured = inspectA05Backup(backup);
  if (!structured.ok) {
    add("BACKUP_STRUCTURE_INVALID");
  } else {
    report.analysis.source = structured.counts;
  }
  const validHash = typeof currentQuestionHash === "string" &&
    /^[a-f0-9]{64}$/i.test(currentQuestionHash);
  if (!validHash) add("CURRENT_QUESTION_HASH_UNKNOWN");

  const validCounts = !!localCounts && typeof localCounts === "object" &&
    !Array.isArray(localCounts) &&
    Object.keys(localCounts).length === A05_BACKUP_STORES.length &&
    A05_BACKUP_STORES.every(name =>
      Object.hasOwn(localCounts, name) &&
      Number.isSafeInteger(localCounts[name]) && localCounts[name] >= 0);
  if (!validCounts) {
    add("LOCAL_INVENTORY_UNAVAILABLE");
  } else {
    // Local counts are non-personal metadata, deliberately not record IDs.
    report.analysis.target = Object.freeze(
      Object.fromEntries(A05_BACKUP_STORES.map(name => [name, localCounts[name]]))
    );
    if (A05_BACKUP_STORES.some(name => localCounts[name] !== 0)) {
      add("TARGET_NOT_EMPTY_NO_OVERWRITE");
    }
  }

  if (structured.ok && validHash) {
    const { drafts, history, preferences, migrations, legacyBackups } = backup.stores;
    for (const snapshot of history) {
      let kind = "quarantined";
      try {
        const classified = classifySnapshot(snapshot, currentQuestionHash);
        if (TYPES.includes(classified)) kind = classified;
      } catch { /* untrusted backup: do not expose exception / record */ }
      report.analysis.history[kind]++;
    }
    if (report.analysis.history.legacy || report.analysis.history.quarantined)
      add("HISTORY_REQUIRES_MANUAL_VERSION_REVIEW");

    if (drafts.length > 1) add("MULTIPLE_DRAFTS_NOT_IMPORTABLE");
    for (const draft of drafts) {
      try {
        verifyDraft(draft, currentQuestionHash);
        report.analysis.compatibleDrafts++;
      } catch { add("DRAFT_NOT_COMPATIBLE_WITH_CURRENT_VERSION"); }
    }
    if (preferences.length) {
      // Consent from another origin/device cannot be transferred by backup.
      add("CONSENT_MUST_NOT_BE_IMPORTED");
    }
    if (migrations.length || legacyBackups.length) {
      add("PROTECTED_DOMAINS_REQUIRE_MANUAL_REVIEW");
    }
    // Even all-current files are not authenticated: backup contents could
    // have been edited, and the identity of the record owner is unknown.
    add("BACKUP_ORIGIN_AND_INTEGRITY_UNVERIFIED");
  }
  add("RESTORE_ENGINE_NOT_IMPLEMENTED");
  const status = !structured.ok ? "BLOCKED_STRUCTURE" :
    !validCounts || !validHash ? "BLOCKED_UNKNOWN_TARGET_OR_VERSION" :
    A05_BACKUP_STORES.some(name => localCounts[name] > 0) ? "BLOCKED_EXISTING_LOCAL_DATA" :
    "PLAN_ONLY_REQUIRES_HUMAN_REVIEW";
  return Object.freeze({
    ...report,
    status,
    analysis: Object.freeze({
      source: report.analysis.source,
      target: report.analysis.target,
      history: Object.freeze(report.analysis.history),
      compatibleDrafts: report.analysis.compatibleDrafts
    }),
    blockers: Object.freeze(report.blockers)
  });
}
