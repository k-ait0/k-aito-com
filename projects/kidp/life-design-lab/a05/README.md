# A05 人生価値観診断 — D-23 modular prototype

**Status: draft / unverified / not published through the main branch.**

This is a standalone ES Modules prototype within LIFE DESIGN LAB.
The existing KIDP-003 **P0 swipe experiment is unchanged**. A05 does not claim
to be a psychometrically validated assessment.

## Structure

- index.html, style.css: mobile-first standalone page (noindex).
- questions.mjs: versioned 30-question manifest and SHA-256.
- types.mjs: provisional T01–T16 profiles, RGBY group tokens.
- engine.mjs: pure scoring, 5-axis/32-variant classification, snapshot integrity.
- storage.mjs: consent-first IndexedDB, optimistic revision checks,
  atomic finalization, history export/delete integration.
- export.mjs: explicit user-triggered JSON export, including raw data if present.
- app.mjs: presentation and interaction; no direct IndexedDB access.

## Local verification (required before merge)

From repository root, using Node.js 22:

    node --test scripts/test-a05-engine.mjs
    node --test scripts/test-a05-storage.mjs
    node scripts/local-preflight.cjs
    git diff --check

Host the repository on HTTPS or localhost (WebCrypto SHA-256 requires a secure
context). Navigate to:

    /projects/kidp/life-design-lab/a05/

Do not open as a file:// page. Manually check at widths 320px, 390px and
desktop: all 30 questions, edit an answer, null vs midpoint, result, all 16
catalog entries, sample not overwriting draft, history, data export, raw-answer
deletion and full deletion. Use browser DevTools to verify the absence of
unexpected network requests. Test keyboard and screen reader operation.

## Data decisions

- No personal answers are persisted without explicit consent.
- Storage is **only in this browser**, in kaito-a05-values-v1.
- Persisted draft, consent and history are kept in the same IndexedDB.
- The selected result's question/scoring/type/content versions and SHA-256
  question-manifest hash are immutable snapshots.
- On restore, records are classified individually as verified / legacy /
  quarantined. Unresolved records switch normal writes to read-only mode;
  export and explicit deletion remain available.
- The user's export may contain raw answers; the UI explicitly warns them.
- **No migration from D-12 / D-19 prototype data is performed**. These old
  stores remain untouched until a separately reviewed, explicit migration.
- A05's "delete all" affects this new DB only; it does not falsely claim
  to delete P0 or earlier prototypes.

## Blocking follow-ups

1. **Execute tests locally** and capture exact output. Code existence does not
   imply tests have passed.
2. Validate IndexedDB conflict, rollback, quota, two tabs, reload, and export
   in real browsers.
3. Implement and test a non-destructive D-12/D-19 import, with version-specific
   validators and explicit user approval.
4. Accessibility audit: keyboard focus on answer, heading on step change,
   320px width, screen reader behavior, contrast.
5. Psychological/content review before any public release. In particular E05
   compares +¥30,000/month to +3 free hours/week; these are not calibrated.

No GitHub Actions workflow is added or automatically enabled.

## D-24 source QA note

Pure scoring and integrity code matched 72 isolated V8 checks; nine
committed storage contract cases matched with an in-memory IndexedDB
simulator. Native Node, real-browser and site-wide preflight results are
**not yet available**. See docs/A05_D23_IMPLEMENTATION_LOG_20261025.md.


## D-25 browser acceptance runner

Use the repository's existing Playwright QA installation. It must be run
**locally against a checked-out copy of the draft branch**; it does not
contact the live domain or production database.

    NODE_PATH=/tmp/kaito-qa/node_modules node scripts/qa_a05_browser.cjs

The script serves the checked-out site on 127.0.0.1 and automates:
- persistence off -> reload discards unpersisted answers;
- explicit consent -> reload restores in-progress answers;
- complete 30 questions -> T16 / time result;
- history restored after reload, JSON export, raw-answer purge;
- stale second tab cannot overwrite a different active assessment;
- explicit all-data deletion and responsive widths of 320/390/1440px;
- no unexpected external network or JavaScript page errors.

The runner requires Playwright+Chromium to be available; its source was
syntax-checked but the real browser suite has **not been executed** yet.

### D-25 storage controller hardening

D-25 reads consent, draft and history in **one readonly IndexedDB
transaction** to avoid mixing values from different cross-tab commits.
Re-enabling saving uses insert-only consent registration; it cannot silently
overwrite an existing consent record. Invalid answers now raise
VALIDATION_ERROR, which the UI handles without locking healthy storage.
Recovery / consent / damaged-history cases have new regression tests.

**Status:** isolated V8 domain regression 66/66; storage regression 13/13.
Both use testing shims and are NOT native Node or real IndexedDB passes.
All release gates in the main checklist still apply.
