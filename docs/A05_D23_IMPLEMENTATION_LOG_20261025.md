# A05 implementation log — append-only

## 2026-10-25 — A05-D23-001

**Scope:** K. Aito LIFE DESIGN LAB / A05 人生価値観診断

**Before:** D-1–D-22 consisted of in-chat prototypes, design proposals and
unexecuted test harnesses. The repository held a KIDP-003 P0 WANT/MAYBE/PASS
swipe prototype, and its P0 specification explicitly excluded 16-type
classification from P0.

**After (draft feature branch):**
- Add a *separate*, unlinked and noindex/nofollow A05 prototype directory.
- Implement versioned 30-question definitions, alternate left/right
  polarity, exact integer-threshold classification, 16 T-types + auxiliary
  E-axis variants (money/time/neutral/withheld).
- Preserve RGBY order G1 Blue / G2 Green / G3 Red / G4 Yellow.
- Add a standalone static-site interface with question/review/result/catalog/
  history and optional browser-local persistence.
- Add IndexedDB consent, revision conflict handling, atomic finalization,
  raw answer deletion, explicit JSON export and new-A05 data deletion.
- Add snapshot integrity classification (verified/legacy/quarantined).
- Add Node built-in regression script without new dependencies.

**Reason:** Remove duplication between D-16–D-21 sample engines, support
an actual repository-level code review, and keep P0 intact.

**Unchanged:** P0 scope, existing P0 HTML, existing publication routes,
previous design history, public navigation, live production deployment.
No merge or live release is included.

**Verification status:** Implementation draft committed; Node tests, browser
acceptance, accessibility and deploy verification **not yet executed**.
The built-in crypto.subtle hash is used, but real question validity and
measurement properties have not been experimentally established.

**Known exclusions:** Old D-12/D-19 migration, cross-tab UI merge,
live-site integration to A01 / MY LIFE NOTE, character asset production,
analytics and anonymous-response aggregation.

**Next release gate:** Node engine tests pass; local site preflight passes;
real browser verifies consent, saved draft after reload, history integrity,
corrupt/legacy lockdown, export, individual raw purge and deletion; user reviews
the content and approves a separate release PR.


## 2026-10-25 — A05-D24-001

**Scope:** First source-level verification and hardening of Draft PR #61.

**Before:** D-23 snapshot validation returned "legacy" based on version before
checking each axis's structure; current presentation content was verified by
type ID and group but not against the complete versioned registry.

**After:**
- Validate legacy snapshot's basic axis structure, type ID, and enums
  before allowing read-only legacy categorization.
- For current versions, verify name, emoji, summary, action and RGBY tint
  against the versioned type registry.
- Compare scores field-by-field instead of raw JSON insertion order.
- Add regression cases for corrupt legacy data, tampered presentation,
  property ordering and simulated IndexedDB adapter behavior.

**Verified in isolated V8, using the actual GitHub branch source files:**
- 72/72 pure-function scoring, classification and integrity checks matched.
- 6/6 JavaScript modules parsed after stripping import/export declarations.
  This is NOT native Node ESM module loading or a build.
- 10/10 static dependency/HTML invariants matched.
- 15/15 ad hoc simulated IndexedDB transaction checks matched.
- 9/9 checks from the committed storage test file matched with mocked
  IndexedDB and queueMicrotask/structuredClone/assertion adapters.

**Not executed:** Native Node commands:
- node --test scripts/test-a05-engine.mjs
- node --test scripts/test-a05-storage.mjs
- node scripts/local-preflight.cjs

Also pending: real browser IndexedDB, cross-tab, quota, reload, screen readers
and production verification. This environment cannot clone GitHub through
normal DNS; V8-based checks must not be represented as Node/browser passes.

**Status:** Draft PR only. NO merge, no navigation changes, no deployment.
**Next gate:** Run native Node 22 tests and site preflight in an actual
checkout, record results in the PR, then proceed to browser acceptance.


## 2026-10-25 — A05-D25-001

**Scope:** Atomic restore/read, error-state classification, reproducible
browser acceptance test specification and script.

**Before:**
- restoreState() used separate readonly transactions for consent, draft and
  history, possibly mixing snapshots across other-tab commits.
- enableSaving() used a put() of consent, allowing silent replacement when
  no active draft remained.
- UI treated validation errors and missing-history errors as fatal storage
  failures, unnecessarily locking otherwise healthy data.
- Browser acceptance was described in prose, without a reproducible script.

**After (Draft PR #61 only):**
- readRecoverySnapshot() obtains consent, draft and history from the same
  readonly IndexedDB transaction; restoreState() uses this snapshot.
- Initial consent registration uses add(), not put(), and rejects duplicate
  consent even after a draft has been finalized.
- AssessmentValidationError(code=VALIDATION_ERROR) identifies invalid answers.
  The UI allows correction without globally locking the storage controller;
  genuine revision conflicts continue to block automatic writes.
- QA runner scripts/qa_a05_browser.cjs added with 30-question completion,
  reload/resume, raw consent and purge, history export, two-tab conflict,
  explicit deletion, viewport widths, and unexpected-network checks.
- Existing favicon linked to prevent missing-asset requests.
- Existing history/data are not overwritten by these changes.

**D-25 executable-source evidence:**
- 66/66 test cases from the actual committed test-a05-engine.mjs source
  matched under isolated V8 with Node assertion/test function adapters.
  SHA-256 was stubbed (64-hex placeholder) in that shim; this is NOT a
  native Node execution or a SHA-256 integration validation.
- 13/13 test cases from the actual committed test-a05-storage.mjs source
  matched under isolated V8 with a simulated asynchronous IndexedDB.
- Browser runner parsed successfully as JavaScript, but was NOT executed
  against Chromium or the real browser IndexedDB.
- V8 results do not establish cross-tab transactional correctness,
  browser storage behavior, or a successful website preflight.

**Not executed (blocking):**
- node --test scripts/test-a05-engine.mjs
- node --test scripts/test-a05-storage.mjs
- node scripts/local-preflight.cjs
- NODE_PATH=/tmp/kaito-qa/node_modules node scripts/qa_a05_browser.cjs
- git diff --check in a checked-out repository
- live environment checks and usability/psychometric studies.

**Reason:** Remove read skew, prevent consent overwrite, ensure recoverable
user-answer errors do not unnecessarily disable saving, and turn browser
acceptance into a reproducible test. The source is kept on Draft PR #61;
P0 and production remain unchanged. No GitHub Actions workflows are added.

**Next release gate:** Native Node 22 verification + Playwright Chromium QA
on a checked-out feature branch, with captured logs and defects fixed.
Only after this, revisit the unimplemented legacy D-12/D-19 migration.

## 2026-10-25 — A05-D26-001

**Scope:** User-facing preservation and targeted recovery of incompatible and
damaged A05 assessment history.

**Before (D-25):**
- The controller protected legacy and quarantined records but the history
  screen displayed only verified records. Users could not inspect the old
  presentation or delete one problematic record without clearing the entire
  new A05 database and losing verified history.
- The Chromium acceptance runner did not inject actual legacy/corrupted
  records or check unsafe HTML in those entries.

**After (Draft PR #61 only):**
- The history screen lists legacy results with a read-only, unverified label.
  Displayed content is HTML-escaped and limited to short summary text; no
  recalculation or implicit migration is performed.
- Quarantined records display only opaque recovery information. Raw content
  is not rendered. If a stable record ID is present, the user can explicitly
  delete that one entry, independently of valid records.
- Explicit deletion requires confirmation; the UI remains locked for normal
  writes until the user reloads and restoreState() revalidates the database.
  This avoids reusing a stale in-memory draft revision after recovery.
- Extend the Playwright Chromium script to inject a well-formed old-version
  record and a damaged record next to a valid result, assert the count of
  each class, check HTML-escaped legacy content, then delete the two protected
  entries individually and ensure the verified result remains.

**Verified:** Seven source-level HTML output and injection-safety conditions
against the actual GitHub renderHistory() function passed in isolated V8:
verified record remains visible; legacy readable; HTML and script markup
escaped; deletion buttons target valid IDs; invalid IDs are not targeted;
quarantined record body is not rendered.

**Not verified:** Native Node 22 test runner, complete repository preflight,
Playwright browser execution, actual IndexedDB transaction semantics,
multi-tab end-to-end operation, production. Network restrictions still block
a normal git clone into the local Node environment. The existing V8 results
must not be labelled browser/Node acceptance.

**No change:** Existing P0 code, site navigation, production, user data, and
GitHub Actions execution. PR remains Draft and must not be merged yet.

**Next gate:** Run the checked-in node and Playwright tests on a checked-out
branch, review logs, fix any failing cases; only after verified browser QA
should the release status be reconsidered.
