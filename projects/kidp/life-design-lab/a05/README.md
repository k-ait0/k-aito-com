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

## D-26 protected-history recovery

The history page now displays structurally checked legacy snapshots in
read-only mode, with an explicit **not verified** label. Any unknown legacy
presentation strings are HTML-escaped, not rendered as markup. Quarantined
records are shown as opaque recovery entries without their contents.

Users can explicitly delete a *single* legacy or quarantined history entry
after confirmation instead of being forced to erase all verified results.
The storage controller stays locked after such a deletion: **reload to
verify the current persisted state** before regular writes are allowed.
Records with unusable IDs require export and full cleanup rather than
attempting an unsafe guess at their identity.

The browser QA runner now injects one legacy and one malformed entry alongside
one verified result; it asserts independent classification, escaped legacy
presentation, and record-specific deletion preserving the verified history.
Those tests are not yet executed in real Chromium.

A source-level V8 evaluation of the actual renderHistory() from this branch
matched seven safety/visibility invariants. This is not a full DOM/browser
acceptance test.

## D-27 native QA evidence (2026-10-25)

The historical D-24/D-25/D-26 notes above describe what was known at
those stages; they are retained rather than overwritten.

GitHub Actions run 40166061103 passed:
- Node 22 domain: 66/66; simulated IndexedDB storage contract: 13/13.
- Real Chrome browser acceptance: 12/12, including full 30 questions,
  consent/reload, export, deletion, conflict, recovery and 320/390/1440px.
- Site-wide local preflight: 12/12; git diff --check passed.
- Existing KIDP Wave A browser QA passed; SEO audit had 0 errors and
  12 nonblocking warnings on other pages.

The existing KIDP workflow is reused with A05-only conditional checks;
no separate workflow was added. The PR remains Draft and unmerged.

## D-28 review and accessibility changes

See docs/A05_D28_REVIEW_20261025.md for question-quality risks, especially
the E-axis and E05's arbitrary fixed money/time comparison. The questionnaire
is still draft, and its validity has not been demonstrated. Do not rewrite
the current versioned question bank in place.

A05 now gives the 7-point scale a descriptive legend and meaningful
accessible labels for 1/4/7, and moves keyboard focus to the new heading
on view changes. Real-Chrome keyboard regression is included in the
browser runner. Manual iOS VoiceOver, zoom/contrast and editorial reviews
remain required before publication.

## D-32 failure-injection acceptance (2026-10-26)

The Chrome QA runner now includes a deterministic, temporary
`QuotaExceededError` thrown by a draft-store `IDBObjectStore.put()`.
It checks that an in-flight failed answer edit locks normal writes, then a
reload restores the last committed draft answer without accepting the rejected
edit. This is a fault-injection test, **not** proof of behavior for every
browser quota policy or forced termination. The new case is pending a native
Chrome CI run; historical D-27–D-30 pass evidence remains as recorded.

### D-32 acceptance result

GitHub Actions run **40205839032** completed successfully on the Draft
branch: Node scoring **66/66**, simulated storage **13/13**, named real-Chrome
acceptance **16/16** (including injected quota-failure rollback), and the
site-wide preflight and existing KIDP P0 QA. SEO audit **40205837919**
succeeded. This supersedes only the earlier D-32 *pending CI* status;
the historical notes remain intact.

## D-33 question quality gate (2026-10-26)

Added a source-matched 30-item editorial audit at
`docs/A05_D33_ITEM_AUDIT_AND_VALIDATION_PLAN_20261026.md`
(**7 BLOCK, 13 REVISE, 10 TRIAL**) plus a cognitive interview
preparation protocol at
`docs/A05_D33_COGNITIVE_INTERVIEW_PROTOCOL_20261026.md`.

These documents are **hypotheses and preparation materials**, not completed
interviews or validated psychometrics. E05 has two provisional new
comparison scenarios; neither is approved. Do not amend the present
`questions.mjs` or existing saved assessments. No new functional tests
are claimed for this documentation-only change. Public release and
new version adoption remain blocked pending participant review and
explicit approval.

## D-34 editorial comparison (2026-10-26)

`docs/A05_D34_BLOCKER_REWRITE_COMPARISON_20261026.md` compares two draft
wordings for each of the seven D-33 blocked items (14 question pairs).
A third, research-only E05 approach considers independent money/time
importance ratings. None of these drafts is adopted or scored by the
existing engine. All seven blockers require participant interviews and
editorial approval. No production module or historical result changed.

## D-35 unscored cognitive-interview candidate set (2026-10-26)

- `docs/A05_D35_INTERVIEW_CANDIDATES_20261026.json` is a
  **research-only, unapproved** manifest of 30 items, 37 bipolar
  wording variants and a separate two-item E05 independent
  money/time option. It preserves current question IDs and
  presentational direction, not score comparability.
- `docs/A05_D35_INTERVIEW_CANDIDATE_GUIDE_20261026.md` describes
  complete wording, construct overlaps and the opt-in, participant-
  sensitive interview plan. The remaining 13 REVISE and seven BLOCK
  statuses are not cleared.
- Run `node --test scripts/test-a05-research-manifest.mjs` to check
  the manifest against D-31, D-33, D-34 and the existing question
  source. Seven source-backed JavaScript assertions passed in an
  isolated test shim; **native Node was not run yet**.
- No research participant data has been collected. Privacy operations
  and recruiting need separate approval. The manifest's permission
  flags explicitly prohibit scoring, production adoption, old
  snapshot compatibility and automatic answer retention.
- Existing A05 browser functionality, question hash, P0 and
  deployed content remain unchanged.

## D-36 prioritized item audit and research contract checks (2026-10-26)

The D-35 research-only 30-item/37-pair manifest remains unchanged.
`docs/A05_D36_REVISE_CANDIDATES_20261026.json` holds **26 additional
unapproved pairs for all 13 REVISE items**. Combined editorial candidates
across both files total 63 pairs, but the survey is still 30 item IDs
and no participant is required to answer all variants.

`docs/A05_D36_PRIORITIZED_30ITEM_REVIEW_20261026.md` assigns
P0=15 (7 BLOCK + 8 REVISE), P1=5 (remaining REVISE), P2=10 (TRIAL).
These are editorial triage groups, not study findings. The major E-axis
redundancy and B/C two-pole interpretation problems are unresolved.

Validation commands from the repository root:

    node --test scripts/test-a05-research-manifest.mjs scripts/test-a05-research-d36.mjs

The six new D-36 assertions were evaluated using an isolated JavaScript
shim (6/6). The existing A05-scoped Node workflow has been extended to
execute both research test files as part of its existing test step;
**native results are pending** at this entry's creation. This has not
added a separate Actions job or workflow. No human interviews have
occurred; no approvals for collection, scoring or publication have
been granted.

### D-36 native test verification

GitHub Actions **40209295560** passed: D-35+D-36 research contracts
**13/13 native Node 22**, existing scoring **66/66**, simulated
storage **13/13**, real Chromium A05 **16/16**, existing P0 and
site-wide preflight. SEO run **40209295397** passed. This supersedes
only the D-36 *pending native test* note above; revision history
and scientific/release restrictions remain unchanged.

## D-37 interview scheduling and release safeguards (2026-10-26)

`docs/A05_D37_INTERVIEW_READINESS_AND_DECISION_GATES_20261026.md`
defines the **unapproved** G0–G5 gates for candidate research,
including the missing consent/recording, storage, access, deletion
and research-ownership decisions. **Do not recruit participants
or capture any user answers until G1 is explicitly approved.**

`scripts/a05-research-assignment.mjs` is a pure, no-I/O research
schedule proposal: twelve numeric slots, 30 primary item prompts
per slot, four separately labelled alternate-wording comparisons,
and E05 independent money/time prompts. Every BLOCK wording is
primary 6/6, every REVISE wording 4/4/4, and E05 variant by
timing has four cells of three planned slots. Allocations are
planning counts and not evidence of human participation.

Five D-37 contract checks were appended to the existing D-36
research test file; eleven D-36+D-37 assertions passed in an
isolated JS test shim. Native Node execution **pending** at the
time of this note; the existing conditional Node workflow
includes the updated test file, with no extra CI job/workflow.

Local verification:

    node --test scripts/test-a05-research-manifest.mjs scripts/test-a05-research-d36.mjs

The protocol does **not** score responses, collect personal
data, change old snapshots or authorize a new version or release.

### D-37 verified Node and Chrome checks

Native GitHub Actions run **40210242723 succeeded**. Research contracts
**18/18 Node 22** (seven D-35, six D-36, five D-37), existing
scoring **66/66**, storage simulator **13/13**, Chrome A05
acceptance **16/16**, independent network/page-error check,
existing P0 browser QA and site preflight passed.
SEO static audit **40210242730** passed. This updates the
prior D-37 pending-test statement without replacing the history.
It **does not** authorize actual interviews, data collection,
questionnaire adoption, merge or production release.

## D-38 G1 research approval packet — NO RECRUITMENT (2026-10-26)

`docs/A05_D38_G1_DECISION_PACKET_20261026.md` coordinates a
pending G1 approval register, draft participant consent notice,
and research data-handling SOP. All **12 required operational
decisions remain PENDING** and human final sign-off is absent.
Do **not** recruit, record, collect responses or store participant
data based on this documentation.

`scripts/a05-research-g1-gate.mjs` audits completeness but **never
grants research permission**. The tracked register at
`docs/A05_D38_G1_APPROVAL_REGISTER_20261026.json` is initially
blocked; the seven native Node contract cases are located at
`scripts/test-a05-research-g1.mjs`. In a source-backed JavaScript
check the pending register failed closed and a synthetic forged
approval was rejected. **Native Node testing was pending** at
the time of this history entry.

Local commands:

    node --test scripts/test-a05-research-manifest.mjs scripts/test-a05-research-d36.mjs scripts/test-a05-research-g1.mjs

Existing A05 conditional workflow runs the same files without a
new job/workflow. G1 sign-off, participant-level consent,
and separate publication/adoption approval all remain required.

### D-38 CI verification (2026-10-26)

GitHub Actions run **40211128156** passed: native G1 approval-gate tests **7/7**, other research contract tests **18/18**, scoring **66/66**, storage **13/13**, real Chromium A05 cases **16/16**, existing KIDP P0, and site preflight. SEO run **40211128155** passed. These are technical checks only: all twelve G1 operations decisions and final human authorization remain outstanding. No participant research or production deployment occurred.

## D-39 G1 human decision options and retention date proposal (2026-10-26)

`docs/A05_D39_HUMAN_DECISIONS_AND_RETENTION_20261026.md`
and its companion
`docs/A05_D39_G1_DECISION_OPTIONS_20261026.json`
present **eight prioritized G1 decisions**, each with two candidate
operational approaches, risks, and information an actual human
owner must approve. The original 12-item G1 approval register and
external final sign-off remain **entirely PENDING**; preferences
within D-39 are NOT decisions.

`scripts/a05-research-retention-proposal.mjs` is an isolated
date-only calculation aid for **hypothetical** 14/30/90-day
upper-limit proposals counted from each participant session.
It does not store, collect, expire or delete any data. The
proposal must not be used as an approved retention policy. The
corresponding extra four tests live in the existing G1 suite:

    node --test scripts/test-a05-research-g1.mjs

These append to the prior seven G1 checks. Native Node CI result
was pending at the time of this entry. No questions, scoring,
storage, saved assessments, P0 site or production release changed.

### D-39 native CI verification

GitHub Actions **40212412443 passed** after a test-only
`assert.throws` argument correction (the first run
**40212345408** failed in that assertion). Native Node 22
G1/D-39 **11/11**, previous research contracts **18/18**,
scoring **66/66**, storage **13/13**, Chromium A05 **16/16**,
KIDP P0 browser QA and site preflight passed.
SEO **40212412394** passed.

The current G1 decision register is still 12/12 pending;
the D-39 14/30/90-day deadlines and operator options are
unapproved proposals. No participant data processed and
no release or deployment occurred.

## D-40 synthetic consent, withdrawal and retention desk checks (2026-10-26)

`docs/A05_D40_SYNTHETIC_CONSENT_WITHDRAWAL_DELETION_REVIEW_20261026.md`
records **nine** hardcoded, non-respondent scenarios from
`scripts/a05-research-d40-simulator.mjs`: refusal, separate
note/contact/recording consent, withdrawal before and after
expiry of the identification map, verified-token assumptions,
non-verified withdrawal, repeated withdrawal and proposed
14/30/90-day marker expiry.

The module is **pure and synthetic-only**. It does not accept
real contact details, identifiers, answers or data; every result
has `authorized:false` and `actualDeletionPerformed:false`.
The ten contract checks are at
`scripts/test-a05-research-d40.mjs`, included in the existing
conditional A05 Node step.

    node --test scripts/test-a05-research-d40.mjs

**Unresolved:** A 30-day ID mapping and 90-day raw-note retention
may prevent individual withdrawal after the mapping is
removed; even before then, genuine identity/token verification
is unimplemented. All G1 operational choices remain PENDING.
This test does **not** authorize recruiting participants or
storing/releasing any real research data. Native CI outcome
was pending at the time of this history entry.

### D-40 verified native synthetic QA

First Actions run **40213379022** failed because the synthetic
scenario uniqueness assertion expected seven cases after nine
had been defined (9/10 passing). This expectation was corrected
and **40213430442 PASSED**: D-40 **10/10 native Node 22**,
prior research contracts **18/18**, G1/D-39 contracts
**11/11**, scoring **66/66**, simulated storage **13/13**,
real Chromium acceptance **16/16** and the independent
no-network/page-error check, plus P0 browser QA and preflight.
SEO audit **40213430495** passed.

This validates **only logical fake markers in a pure function**:
it cannot verify participant identity, physical deletion,
backup erasure, informed consent or research authorization.
All G1 decisions remain pending and PR #61 remains Draft.

## D-41 withdrawal matching and retention-policy choices (2026-10-26)

`docs/A05_D41_WITHDRAWAL_IDENTITY_AND_RETENTION_DECISION_20261026.md`
and its machine-readable companion
`docs/A05_D41_WITHDRAWAL_POLICY_OPTIONS_20261026.json`
compare three **unapproved** G1-05/08/09 choices:

- A: contacts 14d, pseudonym mapping **30d**, raw notes **30d**;
  preferred for **human review only**.
- B: contacts 14d, mapping **90d**, notes **90d**;
  longer retention and associated privacy risk.
- C: no persistent identifiable contact, mapping or raw notes;
  limits per-question audit, requires separate scrutiny of
  nonidentifying aggregation.

`scripts/a05-research-d41-withdrawal-review.mjs` is a
pure no-I/O review model with 12 hard-coded synthetic scenarios
and no real withdrawal token, identity check, consent, data
storage, record deletion or backup erasure. It rejects any
new policy with mapping shorter than identifiable note
retention. The 10 engineering tests are in
`scripts/test-a05-research-d41.mjs`, included in the
existing scoped A05 Node command:

    node --test scripts/test-a05-research-d41.mjs

Native CI status was pending at this history entry.
**All G1 decisions remain PENDING**. An engineering test
does not permit recruitment, collection, recording, real
deletion, release or modifying old assessment histories.

### D-41 native verification evidence

KIDP GitHub Actions **40214353407 succeeded**:
D-41 **10/10 native Node**, D-40 **10/10**, G1/D-39
**11/11**, D-35–37 research **18/18**, A05 scoring
**66/66**, storage simulator **13/13**, Chromium A05
**16/16** plus no-error check, P0 QA and preflight.
SEO audit **40214353357** passed.

Three D-41 retention policies remain **unapproved human
options**. No real authentication, recording, data
storage or physical deletion was tested or implemented.
G1 12/12 PENDING, final signoff PENDING; Draft PR only.

## D-42 operational acceptance gate for the unapproved 30-day proposal

The D-41 A variant (contact 14d, ID mapping 30d, raw notes
30d) has a **16-row, all-PENDING operational evidence register**:
`docs/A05_D42_30DAY_ACCEPTANCE_REGISTER_20261026.json`.
`docs/A05_D42_30DAY_OPERATIONAL_ACCEPTANCE_20261026.md`
records each item and its relationship to the 12 human G1
decisions, including withdrawal identity proof and actual
record/backup deletion evidence.

`scripts/a05-research-d42-acceptance-audit.mjs` is a
**pure static check**. It never issues research
authorization or verifies actual physical deletion,
even if every evidence metadata field is present.
Eleven additional contract cases reside in
`scripts/test-a05-research-d42.mjs`, running in the
existing conditional A05 Node QA job:

    node --test scripts/test-a05-research-d42.mjs

The G1 human owner/signoff and all 12 decisions are still
PENDING; the D-42 16 controls are PENDING. No participant
data, production record, token or browser storage is
created/modified. The D-42 native CI result is pending
at this chronological entry.
