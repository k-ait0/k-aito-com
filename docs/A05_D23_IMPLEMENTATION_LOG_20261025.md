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

## 2026-10-25 — A05-D27-001

**Scope:** First native Node 22 verification, real Chromium acceptance, and
repository-wide preflight for A05 Draft PR #61.

**Before:**
- Prior isolated V8 domain and simulated IndexedDB results were not native
  Node or real-browser evidence.
- The first Chromium runner assumed Playwright's default downloaded Chromium
  executable, which is not installed on the GitHub runner.
- Fast consecutive answer/next interactions could be discarded while an
  asynchronous save was in flight; the QA runner also reloaded or inspected
  state before the IndexedDB commit finished.
- The existing repository workflow verified KIDP P0, not A05.

**After:**
- Reuse existing `.github/workflows/kidp-wave-a-browser-qa.yml` rather than
  create another workflow. Detect A05 changes via merge-commit diff and run
  A05 Node tests, repository preflight/diff check and A05 Chrome QA only for
  such changes. The existing KIDP P0 QA remains in place.
- Browser runner uses the installed `channel: "chrome"`.
- A05 UI disables controls while asynchronous persistence runs, derives the
  Next button state again from the stored answer, and exposes `aria-busy`.
- QA waits for both the updated question and `aria-busy=false` before
  reload; waits for save/finish/purge/recovery acknowledgements before
  inspecting persisted state. Per-question assertions detect skipped steps.
- No changes to P0's application code, production navigation or deployment.

**Native GitHub Actions evidence:**
- Run 40165404398: Node domain 66/66 and storage contract 13/13 passed; A05
  browser runner failed to launch (missing default Playwright executable).
- Later runs identified a rapid-tap/save ordering problem, and premature
  UI assertions/reloads before IndexedDB operations settled. Both production
  UI and QA runner were corrected; no tests were marked passed prematurely.
- Run 40165964282: A05 Chromium acceptance **12/12 passed**, Node domain
  **66/66 passed**, simulated storage contract **13/13 passed**, existing
  KIDP Wave A browser QA passed, SEO static audit succeeded.
- Final verification run **40166061103**: success. A05 Node **66/66**,
  simulated storage contract **13/13**, real Chrome A05 acceptance **12/12**,
  site-wide `node scripts/local-preflight.cjs` **12/12**, `git diff
  --check HEAD^1 HEAD` passed, existing KIDP P0 Chrome QA passed.
  SEO audit: 0 errors and 12 existing warnings (missing JSON-LD on
  non-A05 pages); warnings did not fail the gate.
- The A05 Chrome suite verified consent/no-consent reload, full 30-answer
  scoring to T16/time, history reload, JSON export, raw answer purge,
  verified+legacy+quarantined mixed records, escaped HTML,
  targeted protected-record deletion, two-tab conflict protection,
  explicit A05 database deletion, viewport 320/390/1440px,
  and no unexpected external network/page errors.

**Limits and remaining release gates:**
- The 13 storage contract cases use an in-memory IndexedDB simulator;
  they are separate from the real Chrome acceptance flows.
- No actual Safari/iOS or screen-reader manual acceptance yet.
- No independent psychometric validation or editorial approval of the 30
  draft questions and E-axis trade-offs. This is not a clinical assessment.
- No D-12/D-19 legacy prototype data migration or A01/MY LIFE NOTE API
  integration. Earlier data remains untouched.
- No proof of behavior under quota exhaustion, forced browser termination,
  storage corruption beyond test fixtures, or real multi-device sync.
- No production merge, deployment or navigation link. PR #61 remains Draft.

**Reason:** Turn proposed quality gates into reproducible, traceable native
tests while minimizing Actions cost by reusing one existing KIDP QA workflow
and limiting A05 steps to A05-modifying PRs.

**Status:** D-27 engineering QA gate passed in GitHub Actions; release gate
remains pending content/accessibility review and explicit publish decision.

## 2026-10-25 — A05-D28-001

**Scope:** Accessibility improvements and preliminary questionnaire content review.

**Before:** Seven-point scale screen-reader labels only conveyed numeric
positions; screen changes could leave focus on a removed button. No dedicated
written risk register for the draft 30-item instrument.

**After:** Each question's fieldset legend includes the two actual alternatives.
Scale 1/4/7 have descriptive accessible labels. Navigation via show() moves
focus to the destination heading, preserving keyboard/screen-reader context.
A Chromium keyboard acceptance case verifies Enter, Space, focus movement and
the accessible scale descriptions. A separate review document at
`docs/A05_D28_REVIEW_20261025.md` flags A/B/C construct confounds,
D context coverage, and especially E05's arbitrary money/time trade-off.
Question text and scoring versions remain unchanged.

**Verification:** GitHub Actions run **40166414295** passed. Node domain
**66/66**, simulated storage contract **13/13**, site-wide local preflight
**12/12**, A05 real Chrome acceptance **13/13** (including the new keyboard
case), existing KIDP Chrome QA passed. SEO run **40166414297** succeeded.

**Limitations:** Automated Chromium tests are not real iOS VoiceOver,
NVDA/JAWS, contrast/zoom testing, or psychometric validation. Content review
is a risk inventory, not editorial approval. D-12/D-19 migration and
publication remain out of scope. PR #61 remains Draft, unmerged.

**Reason:** Improve input comprehension and focus continuity while keeping
versioned responses reproducible, and surface conceptual risks before
public release.

## 2026-10-25 — A05-D29-001

**Scope:** Responsive text enlargement, touch target size, reduced-motion
and high-contrast support.

**Before:** The A05 CSS did not respect prefers-reduced-motion or
prefers-contrast:more. Narrow-screen answer layout had no explicit
long-text wrapping or text-enlargement acceptance.

**After:** Added media-query overrides to remove scroll/progress animation
under reduced-motion, strengthen contrast/focus/selection borders when the
OS requests more contrast, wrap long answer options and stack the two
answer alternatives below 400px. Keep answer buttons at least 44px high.
Added real-Chrome checks at 320px with root text-size factors 1, 1.5, 2
and for both OS media preferences.

**Verification:** GitHub Actions run **40166842747** succeeded.
A05 Chrome acceptance **15/15**, Node scoring **66/66**, simulated storage
**13/13**, site-wide local preflight **12/12**, existing KIDP Chrome QA
passed. SEO static audit run **40166842783** succeeded.

**Limitations:** Root text-size emulation is not equivalent to iOS Dynamic
Type or 200–400% browser page zoom. No real Safari/VoiceOver or manual
contrast audit has yet been completed. No psychometric validation.
No merge, production deploy, or public navigation link.

**Reason:** Remove common accessibility barriers without changing
versioned answers, existing KIDP P0, or the production release state.

## A05-D30-001 (2026-10-25)

Before: Browser acceptance covered text sizing but not CSS layout zoom. No version-two question proposal existed.

After: Added CSS layout zoom checks at 200 and 400 percent. Added a separate version-two wording proposal. The original questionnaire and stored results remain unchanged.

Evidence: Actions 40177149557 passed, including 16 browser cases, 66 scoring cases, 13 storage cases, and 12 site preflight checks. SEO audit 40177149569 passed.

Limitations: CSS zoom is not native browser zoom. Screen reader and psychometric reviews remain pending. No merge or release.

## A05-D31-001 (2026-10-25)

Before: D-30 recorded an unapproved sample of revised questions, not all 30 items.

After: Added docs/A05_D31_FULL_QUESTION_REVIEW_20261025.md with 30 source-matched items, polarity-normalized old/new wording, E05 review priority, and version/scoring/storage compatibility gates. No production question or scoring changes.

Evidence: Confirmed 30 unique questions from the current source. D-30 test baseline remains Actions 40177149557: browser 16/16, scoring 66/66, storage 13/13, site 12/12. D-31 is documentation only and has no new acceptance claim.

Limitations: The new wording is not validated or approved. No automatic migration, merge, or release.

## A05-D32-001 (2026-10-26)

**Scope:** Fail-closed recovery under a simulated IndexedDB write/quota failure.

**Before:** A05 real-Chrome acceptance covered valid persistence, cross-tab revision
conflict, and corrupted stored records, but not an exception thrown during an
in-flight draft write. The prior QA suite could not distinguish an optimistic
in-memory answer update from an atomic, durable answer change under quota failure.

**After:** Extend `scripts/qa_a05_browser.cjs` with a deterministic failure
injection: after saving answer 7 with explicit consent, temporarily make
`IDBObjectStore.put()` throw `QuotaExceededError` for the draft store.
Verify that the UI switches to the write-locked home state, advises against
automatic overwrite, and after reload restores the previously committed answer
7 instead of the rejected answer 1. The override is scoped to the QA page and
removed by reload. No production data or real quota is manipulated.

**Reason:** Verify the transaction abort / UI error boundary with a real
Chromium IndexedDB transaction rather than relying only on the in-memory
adapter. Reject-and-reload must not lose the last durably committed draft.

**Evidence:** Test implementation and JavaScript syntax check completed.
Native Chrome acceptance **pending the next CI verification**; no PASS claim
until logs confirm it. Existing D-31 scoring/content contracts unchanged.

**Release state:** Draft PR #61, no merge/deploy or P0 changes.

### A05-D32-001 — native acceptance result (2026-10-26 JST)

**Verified:** GitHub Actions run **40205839032** completed successfully.
The actual Node 22 and Chrome logs show scoring **66/66**, simulated
IndexedDB storage contract **13/13**, and **16/16** named real-Chrome
acceptance cases passed, including D-32's injected quota failure and
the independent check for unexpected network/page errors. The
existing KIDP P0 browser QA, site-wide preflight and diff checks also
completed successfully. SEO static audit run **40205837919** succeeded.

**Interpretation:** This proves the tested `IDBObjectStore.put()` exception
path rejects the uncommitted edit and restores previously committed data
upon reload in Chromium. It does **not** emulate OS-level disk exhaustion,
Safari quota eviction, sudden browser termination, or every failure mode.
The question set and psychometric validity remain unreviewed.

**State:** Draft PR #61; no merge, production rollout, or P0 modification.

## A05-D33-001 (2026-10-26)

**Scope:** Structured content-quality review of all 30 D-31 questionnaire
candidates, particularly the distinction among A/D, the coexistence of
B/C preferences, and the E-axis money/time comparison.

**Before:** D-31 paired the present question text with 30 initial v2
wording candidates and named a few broad risks. It did not classify each
candidate or supply a consent-aware participant protocol.

**After:** Added
`docs/A05_D33_ITEM_AUDIT_AND_VALIDATION_PLAN_20261026.md`, containing
30 individually identified editorial decisions: **7 BLOCK, 13 REVISE,
10 TRIAL**, including replacement text for the seven blocked items
(two alternative E05 drafts), operating definitions, a conditional E-axis
instruction, and interview/pilot gates. Added
`docs/A05_D33_COGNITIVE_INTERVIEW_PROTOCOL_20261026.md`, setting out
voluntary participation, consent/privacy requirements, common prompts
for 30 items, specific probes for blocked items, counterbalanced E05
presentation, and aggregation rules.

**Reason:** A wording revision or passed software test must not be mistaken
for construct validity. Record explicit editorial blockers before creating
a new scored or versioned question bank.

**Evidence:** Full source comparison against `questions.mjs` and the
D-31 document completed; the audit matrix programmatically confirmed
30 distinct question IDs and classification counts. These are **editorial
hypotheses**, not responses from interviews, statistical reliability
estimates, or external expert approval. The changes are documentation only;
there is no new Node or browser acceptance claim.

**Unchanged:** Existing questionnaire, question hash, assessment/scoring
logic, 16-type mapping, IndexedDB, P0, live site, GitHub Actions
configuration. Draft PR #61 must remain unmerged and unpublished.

## A05-D34-001 (2026-10-26)

**Scope:** Second-pass rewrite of the seven questionnaire candidates whose
editorial status remains BLOCK (A04, A05, B02, C04, D03, E04, E05).

**Before:** D-33 documented one primary wording substitute for each blocker
and two E05 alternatives, but there was no consistent pairwise editorial
comparison covering all seven blockers. The bipolar 7-point answer format
remained a substantial risk, especially for money versus time.

**After:** Created
`docs/A05_D34_BLOCKER_REWRITE_COMPARISON_20261026.md`. It contains
two unapproved negative/positive question pairs for each of the seven IDs
(**14 pairs total**), candidate-specific construct and overlap notes,
non-leading interview probes, within- and cross-axis redundancy checks,
and explicit editorial decision gates. Added a third E05 **research-only**
format that asks about money and time **independently** rather than deriving
a forced bipolar preference. Its scores must not be substituted into
the existing E-axis scoring or used to recalculate saved snapshots.

**Reason:** Candidate wording needs a competing alternative and an
explanation of potential construct contamination before any content approval.
E05's fixed monetary/time tradeoff cannot be repaired merely by removing
the numbers.

**Evidence:** Checked the new proposal against the actual versioned
`questions.mjs` and D-33 blocker list: exactly seven unique matched
BLOCK IDs, each with two wording pairs; independent E05 format included.
This is a source/structure consistency check, **not** a validated
psychological instrument, participant interview, or a native Node/Chrome
test. No participants have been enrolled.

**Status:** All seven D-33 BLOCK flags remain open pending cognitive
interviews and editorial approval. No existing A05 module, scoring,
snapshot, database, site navigation, P0 or Actions workflow was changed.
Draft PR #61 remains unmerged and unpublished.

## A05-D35-001 (2026-10-26)

**Scope:** Consolidate draft question wording into a traceable, non-scoring
cognitive-interview candidate set while preserving all existing A05
data and version contracts.

**Before:** D-31's 30 candidates, D-33's 7 BLOCK/13 REVISE/10 TRIAL
decisions, and D-34's seven alternate question pairs were split across
Markdown files. There was no single machine-readable source of
participant-facing candidate wording, order, display polarity, and
research-only prohibition flags.

**After:**
- Created `docs/A05_D35_INTERVIEW_CANDIDATES_20261026.json`:
  30 ID-preserving entries in the original A01,B01,C01,D01,E01,...
  sequence, 37 bipolar candidate pairs (one primary candidate for
  each of the 23 non-blockers, A/B alternatives for the seven blockers),
  a separately identified research-only independent E05 money/time
  format, participant-facing left/right presentation, editorial status,
  and proposed construct-overlap links.
- Explicit `RESEARCH_ONLY_UNAPPROVED` metadata and five false permission
  flags prohibit scoring, production use, old-result compatibility,
  personal-data collection approval, and auto-save. New research version
  `A05-R-2.0.0-alpha.1` is **not** a published question-set version.
- Created `docs/A05_D35_INTERVIEW_CANDIDATE_GUIDE_20261026.md`
  specifying a 30-item core, A/B counterbalancing at blocked items,
  conditional follow-up probes, privacy and recruitment gates, and
  unresolved duplication and question-quality issues.
- Added `scripts/test-a05-research-manifest.mjs` (seven Node test cases)
  to verify ID/order, D-31/D-33/D-34 provenance, all 37 candidate
  wordings and polarity, E05 independent format, overlap references,
  and research-only safeguards.

**Defect found during integration:** Markdown extraction initially read
later non-question tables from D-34 and accidentally substituted prose
into B02 and E04 question variants. The manifest was corrected to use
only D-34 Section 2's question-pair table and the test fixture was
hardened to the same scoped table.

**Evidence:** All seven actual source-backed contract assertions passed
in isolated JavaScript execution with an assertion shim. This is
**not** a native `node --test` result and not browser acceptance.
Native Node 22 execution remains pending. D-32 production-facing
Chrome evidence is unchanged and cannot be transferred to this
research-only manifest. No participant interviews or psychometric
validation have been conducted.

**Reason:** Provide one non-production reference set that can be
audited against the question/design history without accidentally
treating unapproved edits as score-compatible.

**Change boundary:** No edits to deployed `questions.mjs`,
`engine.mjs`, `storage.mjs`, public navigation, P0, or existing
Actions workflow. No stored assessments transformed. Draft PR #61
remains unmerged and unpublished.

### A05-D35-001 — existing CI verification after documentation integration

**GitHub Actions run 40208344965: succeeded.** The existing A05
native scoring (66/66), simulated storage (13/13), existing Chrome
acceptance (16/16), site-wide preflight and KIDP P0 browser QA
succeeded; SEO static audit **40208345038** also succeeded.

**Important test boundary:** The new
`scripts/test-a05-research-manifest.mjs` was **not executed** by this
workflow. Its seven contract tests were executed only using an
isolated JavaScript assertion shim (7/7). The baseline browser run
does not establish native acceptance of the new research JSON.
No extra GitHub Actions workflow or research-specific CI gate was
added, to limit Actions usage until the interview format is approved.

## A05-D36-001 (2026-10-26)

**Scope:** Prioritize the 20 unresolved candidate questions (seven BLOCK and
13 REVISE) without treating revised wording as psychometric approval.

**Before:** D-35 stored 30 questions, 37 wording variants, D-33 editorial
flags, and a research-only independent E05 format. The 13 REVISE items
still had only one initial D-31 candidate, and there was no unified
30-item P0/P1/P2 priority matrix.

**After:**
- Created `docs/A05_D36_REVISE_CANDIDATES_20261026.json`, a
  separate research-only overlay of **13 REVISE questions × 2 additional
  alternatives = 26 candidate pairs**, with construct hypotheses,
  cross-question overlap links, P0/P1 review priority and non-leading
  interview probes.
- Preserved the D-35 30-item, 37-pair research manifest unchanged:
  combined **63 wording pairs** are available across D-35/D-36, **not**
  63 respondent questions and not 63 independently validated items.
- Created `docs/A05_D36_PRIORITIZED_30ITEM_REVIEW_20261026.md`.
  Priority assignment: **P0 15** (seven BLOCK + eight high-impact
  REVISE: A06/B06/C02/C06/D04/E02/E03/E06),
  **P1 five** (A01/B03/B05/C05/D06), and **P2 ten**
  pre-interview TRIAL candidates. No BLOCK or REVISE status was cleared.
- Added six source-linked invariant cases in
  `scripts/test-a05-research-d36.mjs`, checking old/new version
  boundaries, 13 IDs/26 candidates, display polarity, priority groups,
  overlap references, consent/production prohibitions and combined count.
- Extended the **existing** KIDP A05-only Node verification step to run
  D-35 and D-36 research contracts; **no extra job or workflow** was
  created. The existing conditional scope still limits A05-specific
  test execution to relevant A05 changes.

**Reason:** Separate editorial drafting from production implementation
and identify the most consequential conceptual risks before recruiting
participants. Repeated E-axis question wording may be a structural
problem that no superficial edit fixes.

**Verification:** All six D-36 source-linked assertions passed via an
isolated JavaScript assertion shim. A native Node 22 GitHub Actions
run for the combined D-35/D-36 research contracts is **pending**.
No interviews, respondent data, manual screen-reader QA or
psychometric analysis have been conducted.

**Unchanged:** `questions.mjs`, versioned scoring, data persistence,
old results, type mapping, P0, production, deploy and public
navigation. Draft PR #61 must remain unmerged.

### A05-D36-001 — native CI evidence (2026-10-26 JST)

GitHub Actions run **40209295560** completed successfully. The
existing A05 Node 22 verification step executed **both new research
files** via
`node --test scripts/test-a05-research-manifest.mjs scripts/test-a05-research-d36.mjs`
and returned **13/13 tests passed** (D-35: seven, D-36: six).
Existing native domain scoring **66/66**, simulated IndexedDB storage
**13/13**, actual Chromium A05 acceptance **16/16** named cases,
existing KIDP P0 Chrome checks, site preflight and `git diff --check`
passed. SEO static audit run **40209295397** succeeded.

The original D-36 pre-CI isolated JS assertions remain recorded above
as historical test provenance; the present section reports later
**native Node execution**. This is engineering/source-contract evidence
only; it does not validate question quality, response interpretation
or psychometric properties. No participants were recruited and
no candidate question or stored assessment was published or modified.

## A05-D37-001 (2026-10-26)

**Scope:** Turn the research-only D-35/D-36 item candidates into a
reproducible but unapproved cognitive-interview scheduling and
quality-decision protocol, with explicit protection against collecting
participant data before consent operations are approved.

**Before:** D-36 identified 30 items, 63 editorial wording pairs,
seven BLOCK and 13 REVISE issues, but interview assignment,
variant balance, privacy operating responsibilities and editorial
Go/No-Go criteria were not executable or finalized.

**After:**
- Created `scripts/a05-research-assignment.mjs`, a deterministic
  pure function accepting only research manifests and a numeric
  presentation slot (1–12). It checks research-only flags and creates
  30 primary question prompts per slot plus exactly four follow-up
  comparison prompts (three P0 and one P1).
- Across the proposed 12 slots, each BLOCK A/B candidate is primary
  six times, each REVISE D31/A/B candidate four times, and each of
  the 20 unresolved question IDs receives two or three targeted
  follow-up allocations.
- E05 independent money/time prompts appear before the main set in
  six slots and after it in six; **E05 wording A/B × timing before/after**
  forms four cells of three slots each, avoiding exact confounding.
  These are design counts, not participant outcomes.
- Created `docs/A05_D37_INTERVIEW_READINESS_AND_DECISION_GATES_20261026.md`
  with a G0–G5 review chain, explicit G1 unresolved fields
  (research owner, participant consent, custody/access, deletion and
  retention), participant stop/withdraw conditions, non-identifying
  aggregation categories and a separate E-axis structural decision
  (bipolar, independent, withheld).
- Appended five D-37 contract cases to the existing
  `scripts/test-a05-research-d36.mjs` rather than creating a new
  CI job or workflow. These test the 12-slot core, exact variant
  balance, focused comparison schedules, E05 2×2, and mandatory
  research-only and no-data restrictions.

**Defect prevented:** The initial timing rule used slot parity,
which aligned exactly with E05 A/B wording assignment and would
confound timing with wording. The schedule now changes timing in
blocks of two slots; the new 2×2 test asserts 3 allocations per cell.

**Reason:** Prevent post-hoc presentation assignment, falsely
interpreting follow-ups as independent samples, nonconsensual data
collection and excessive psychometric claims from a qualitative
small-sample study.

**Verification:** Eleven D-36+D-37 contract assertions passed
against the actual branch files in an isolated JavaScript V8
assertion shim. **Native Node 22 and browser results for the
current commit are not yet recorded.** Passing allocation tests
does not mean any research participant was recruited, consented or
assessed. G1 through G5 remain blocked.

**Unchanged:** Scored question-set version/hash, 16 types,
production UI, IndexedDB, old assessments, P0, public site.
PR #61 stays Draft; no merge/deployment.

### A05-D37-001 — native verification result (2026-10-26 JST)

**GitHub Actions run 40210242723: SUCCESS.** Existing conditional
A05 Node step executed all three research sources, including the
five new D-37 scheduling cases appended to the D-36 file. Native
Node 22 research contract suite **18/18 passed** (D-35 seven,
D-36 six, D-37 five). Existing domain scoring **66/66** and
simulated IndexedDB contract **13/13** passed. Real Chrome A05
acceptance **16/16**, plus the separate no-unexpected-network/
page-error check, passed. Existing KIDP P0 browser QA, site-wide
local preflight and diff check passed. SEO audit
**40210242730: SUCCESS**.

The full D-37 12-slot presentation generator is validated only for
deterministic structure, balance and permission restrictions. There
is still **no completed cognitive interview**, approved retention
or consent plan, psychometric validation, participant recruitment,
production merge or deployment. The existing CI workflow was reused
without adding a job.

## A05-D38-001 (2026-10-26)

**Scope:** Prepare the human-controlled G1 research-operations approval
packet without accepting participants, personal data, or recruitment.

**Before:** D-37 documented the 12-slot candidate allocation and
the qualitative validation plan, but research responsibility,
participant information, consent, retention/deletion, incident
response and final G1 approval were unresolved prose decisions.

**After:**
- Added `docs/A05_D38_G1_APPROVAL_REGISTER_20261026.json` with
  **12 pending decisions**, an independently pending final sign-off,
  explicit prohibited activities, a `dataCollected:false` marker
  and zero recorded interviews. No approver or personal identifier
  was invented.
- Added draft participant notice/consent:
  `docs/A05_D38_PARTICIPANT_INFORMATION_AND_CONSENT_DRAFT_20261026.md`
  (nonclinical purpose; optional/withdrawable participation; distinct
  consent for recording, screen capture, data recording and contact).
  **Not authorized for distribution.**
- Added draft data-handling SOP:
  `docs/A05_D38_DATA_HANDLING_SOP_DRAFT_20261026.md`. It separates
  private storage from GitHub and production IndexedDB, describes
  access, withdrawal, deletion and incident steps, and explicitly
  labels suggested retention periods as **unapproved proposals**.
- Added `docs/A05_D38_G1_DECISION_PACKET_20261026.md` with
  an ordered sign-off agenda, stop/go boundaries and dependencies.
- Added pure `scripts/a05-research-g1-gate.mjs` and seven
  `scripts/test-a05-research-g1.mjs` contract cases. The check
  inspects completeness but **always returns `authorized:false`**.
  Even a fully populated synthetic decision register is only
  eligible for **external/manual review**. A forged approval state
  fails closed. Existing conditional A05 Node CI is extended by a
  single test command, without adding a job or workflow.

**Reason:** Engineering QA and the presence of AI-authored documents
cannot substitute for authorization to conduct real participant
research or for consent to handle their answers.

**Evidence:** Source-backed JavaScript checks verified the 12-item
register is pending, with 13 blockers (12 decisions plus external
sign-off), that a hypothetical fully documented register remains
unauthorized, and that a forged approval is rejected. **Native Node
CI for this commit is pending** at this point. This is a document
and gate-contract check, not legal compliance certification.

**Unchanged:** Scored questions, question/version hash, 16 types,
storage, past results, P0, site navigation and live production.
No interviews or respondent records. PR #61 remains Draft,
unmerged and undeployed.

### A05-D38-001 — native GitHub Actions verification (2026-10-26 JST)

**KIDP Wave A Browser QA run 40211128156: SUCCESS.**
The existing Node 22 A05 step ran G1 checks
`node --test scripts/test-a05-research-g1.mjs` with **7/7 PASS**,
including the 12 pending operations and final human sign-off
boundary, missing approval evidence, missing/duplicate IDs,
forged approval, privacy restrictions and malformed inputs.
The existing research contracts **18/18**, scoring domain
**66/66**, simulated IndexedDB storage **13/13**, real Chrome A05
acceptance **16/16** (plus the independent unexpected-network/
page-error check) and existing KIDP P0 browser QA all passed.
Local preflight and diff checks passed.
**SEO audit run 40211128155: SUCCESS.**

**Interpretation:** Technical controls prove the submitted approval
register cannot be read as research authorization through this
gate helper. They do **not** satisfy the outstanding 12 human
decisions, authorize any participant contact or certify legal/
research-ethics compliance. G1 final approval, interviews and
psychometric validation remain **not performed**. No merge or
production deployment.

## A05-D39-001 (2026-10-26)

**Scope:** Convert high-priority pending G1 research-operation questions into
actual human-decision options while leaving authorization exclusively with
a real accountable person.

**Before:** D-38 had a comprehensive 12-item G1 approval register and
draft notice/SOP, but no specific A/B tradeoff table or executable
definition of draft retention-date anchors. The SOP's draft "90 days
after the editorial decision" could extend preservation indefinitely
if review completion slipped.

**After:**
- Created `docs/A05_D39_G1_DECISION_OPTIONS_20261026.json` with
  two concrete alternatives, rationale, risks and required human
  evidence for **eight priority G1 decisions**:
  G1-01/03/05/06/07/08/09/12. G1-02/04/10/11 and
  all eight prioritised decisions remain unapproved. The source
  D-38 G1 register remains **12×PENDING** with signoff pending.
- Created `docs/A05_D39_HUMAN_DECISIONS_AND_RETENTION_20261026.md`,
  comparing internal owner/roles, local encrypted private storage
  vs reviewed provider storage, no-default-recording, contact
  separation, withdrawal windows, the prior D-38 retention proposal,
  and which parts of the participant-facing explanation still
  require human decisions.
- Created pure, no-I/O `scripts/a05-research-retention-proposal.mjs`:
  accepts only a *hypothetical date string* and calculates
  **unapproved** calendar-date upper limits of 14/30/90 days
  from each interview date for contact, pseudonym-ID map, and
  raw notes. It explicitly cannot collect, store or delete answers
  and `authorized:false` never changes. Unlike a review-end
  anchor, deadlines cannot silently extend when editing is delayed.
  The limitation of withdrawal matching after the 30-day ID-map
  deletion proposal is explicitly called out for the consent notice.
- Appended four D-39 native Node test cases to
  `scripts/test-a05-research-g1.mjs`. They verify alternatives
  cover exactly the 12 G1 IDs without changing the source PENDING
  register; no proposal is signed; no research is authorized;
  proposed dates match leap-year and ordinary calendar arithmetic,
  and invalid dates are rejected.

**Reason:** Stop adding abstract research documentation and present
actual choices an accountable operator can decide, with safe date-only
arithmetic and explicit costs of withdrawing after pseudonym lookup
deletion.

**Evidence:** Source-backed isolated JavaScript verification confirmed
the tracked G1 register is still all PENDING and that the ordinary and
leap-year deadline examples match the new calculator. Native
`node --test` on the amended cases and full browser QA were **pending**
at this history entry. The calculator has no interaction with A05
assessment storage, participant data, consent or external systems.

**Change boundary:** No study participants, recruitment, response
collection, scoring/manifest update, old-result migration, merge,
production deploy or P0 change. Draft PR #61 stays unmerged.

### A05-D39-001 — verified native CI and defect correction (2026-10-26 JST)

**First run 40212345408: FAILURE.** The initial D-39 Node test
supplied the numeric invalid-date example `42` as the
second argument to `assert.throws()`, which Node interprets as
an expected error specification. Node correctly rejected the
test harness argument (`ERR_INVALID_ARG_TYPE`) even though
the proposed retention calculation itself was correct.
No scoring, storage, respondent or production functionality was
implicated.

**Correction:** Updated `scripts/test-a05-research-g1.mjs` to
pass a valid expected-error regular expression and use
`String(invalid)` as its display message, so every invalid-date
fixture is checked correctly.

**Retest GitHub Actions 40212412443: SUCCESS.**
Native Node 22 G1/D-39 contracts **11/11 passed** (previous G1
seven plus D-39 four), D-35–D-37 research contracts **18/18**,
existing scoring **66/66**, and simulated IndexedDB storage
**13/13**. Real Chromium A05 acceptance **16/16** plus
the independent network/page-error check passed.
Existing KIDP P0 browser QA, local preflight and diff checks
passed. SEO static audit **40212412394: SUCCESS**.

**Boundaries unchanged:** D-39 alternative choices and deletion
windows are only planning proposals. The tracked G1 register is
still 12/12 PENDING plus final human sign-off, and the D-39
calculator performs **no retention, deletion, collection, storage
or authorization action**. Neither human interviews nor
psychometric validation have occurred. No production merge/release.

## A05-D40-001 (2026-10-26)

**Scope:** Test the unapproved G1 consent, withdrawal and
retention proposals using **synthetic-only, in-memory desk cases**,
without building actual participant data collection or deletion.

**Before:** D-39 had A/B alternatives for eight human G1
decisions and proposed 14/30/90-day maximum periods calculated
from interview dates. It had not exercised refusal to record,
separate consent, withdrawal before/after pseudonym-link deletion,
or the difference between logical markers and actual record deletion.

**After:**
- Added `scripts/a05-research-d40-simulator.mjs`, a pure
  scenario-name-only function containing **nine fixed fictional
  cases**. No personal identifiers, real records, external inputs,
  IO, IndexedDB, recording or network access can be supplied.
  Every result explicitly reports `authorized:false`,
  `actualDataCollected:false`, and
  `actualDeletionPerformed:false`.
- Added `scripts/test-a05-research-d40.mjs` with **ten**
  synthetic-safety cases: explicit consent boundaries, separate
  contact consent, refusal to record, time-bounded pseudonym
  linkage, withdrawal with/without assumed identity verification,
  repeated withdrawal, proposed deadlines, and original G1
  nonauthorization.
- Added `docs/A05_D40_SYNTHETIC_CONSENT_WITHDRAWAL_DELETION_REVIEW_20261026.md`
  containing the nine-case matrix, confirmed design limits and
  unresolved human G1 decisions.
- Extended the existing *conditional A05 Node step* with one
  research test command. No new job or workflow.

**Important findings:** Consent to record research notes must NOT
automatically imply consent to retain contact information. Removing
contact after 14 days does not prove the participant can be
verified to submit a deletion request while a mapping still
exists. When the pseudonym-ID lookup expires after 30 days,
individual notes retained until day 90 may be impossible to
match to a specific withdrawal request. The simulation reports
an **unmatchable/unverified request**, not a fabricated successful
deletion. It also never claims that simulated marker deletion
means physical deletion from storage/backups.

**Reason:** Expose internal contradictions before deciding the
retention/withdrawal policy. Options include extending the
lookup window to match identifiable notes, retiring the notes
earlier, using a carefully reviewed opt-in withdrawal token,
or collecting no records until the process is viable. Each
requires responsible human approval.

**Evidence at creation:** Source-backed JavaScript review of
the earlier seven cases confirmed fail-closed states and
nonauthorization; the scenarios were expanded to nine with
explicit separate contact consent and verification checks.
**Native Node CI is pending at this entry.** These checks do not
establish research-ethics or legal compliance.

**Unchanged:** G1 register 12/12 PENDING, no human sign-off;
no participant recruitment, recording, research answers,
personal data, actual deletion, production scoring changes,
stored-result migration, P0 changes, merge or deployment.
Draft PR #61 remains unmerged.

### A05-D40-001 — native QA, failed first run and verified correction

**First run 40213379022: FAILURE.** The synthetic scenario list
was expanded from seven to nine cases, but the uniqueness
assertion still expected **7** rather than 9. Nine of the ten
new D-40 cases passed; the other native A05 suites passed.
This was a test expectation typo, not an actual collection,
storage or deletion of any data.

**Correction:** Updated the uniqueness assertion in
`scripts/test-a05-research-d40.mjs` to exactly nine names,
consistent with the exported internal cases.

**Retest GitHub Actions 40213430442: SUCCESS.**
D-40 pure synthetic-simulation safety tests **10/10 PASS**.
Other research contracts **18/18 PASS**, G1/D-39 tests
**11/11 PASS**, existing domain scoring **66/66 PASS**,
simulated IndexedDB **13/13 PASS**, existing real Chromium A05
acceptance **16/16 PASS** plus the independent page/network
error check. Existing P0 browser acceptance and site
preflight passed. SEO audit run **40213430495: SUCCESS**.

**Interpretation:** Synthetic-only trace assertions expose
the identity/withdrawal contradiction but do not resolve it.
No participant identity proof, consent collection, actual
storage, scheduled deletion, backup erasure or operational
approval was implemented or tested. The G1 human decision
register remains entirely PENDING, with no sign-off.

## A05-D41-001 (2026-10-26)

**Scope:** Resolve D-40's contradictory *proposal* of a
30-day lookup plus 90-day identifiable note retention by
comparing aligned withdrawal/retention windows and defining
identity proof as an explicit, still unimplemented prerequisite.

**Before:** D-39 proposed contacts 14 days / pseudonym mapping
30 days / raw notes 90 days, leaving days 30–90 with potentially
unmatchable notes. D-40 modeled hypothetical identity
matches but never implemented real authentication or deletion.

**After:**
- Added `docs/A05_D41_WITHDRAWAL_POLICY_OPTIONS_20261026.json`
  with **three unapproved alternatives**:
  A = contacts 14 / link 30 / notes 30;
  B = contacts 14 / link 90 / notes 90;
  C = no individually identifiable contact/link/raw notes.
  A is preferred only for **human review**; no option was adopted.
- Added `docs/A05_D41_WITHDRAWAL_IDENTITY_AND_RETENTION_DECISION_20261026.md`,
  explaining benefits, costs, boundary days, independent human
  G1 approvals, small-sample risk of supposed anonymous
  aggregation, and the need to disclose lookup/token-loss limits.
- Added a pure, fixed-fixture model
  `scripts/a05-research-d41-withdrawal-review.mjs`.
  It allows only three named policy alternatives and 12
  predefined synthetic cases. It rejects a lookup duration
  shorter than raw-note retention and rejects forged research
  authorization flags. Every result reports
  `authorized:false`, `realIdentityVerified:false`,
  `actualDataCollected:false` and
  `actualDeletionPerformed:false`.
- Added 10 native Node contract cases in
  `scripts/test-a05-research-d41.mjs`, covering
  expiration on day 14, 30 and 90, absence/incorrect/replay
  evidence, absent consent, no-identifiable-record option,
  malformed cases and the old 30/90 mismatch.
- Reused the existing conditionally-scoped A05 Node CI step
  with one additional test command, **no new workflow/job**.

**Identity/withdrawal boundary:** A synthetic `FIXTURE_MATCH`
is **not** verification of an actual person's identity.
A real secure withdrawal-token system (generation, custody,
comparison, expiry, replay/theft and loss handling), private
storage, durable deletion/backups, informed consent and
human research approval remain entirely unimplemented and
unapproved. Pure tests cannot prove those properties.

**Reason:** Provide an accountable human with actionable
choices that eliminate the unmatched-record timing bug at
the planning stage without creating a falsely approved
research-data collection or deletion system.

**Evidence initially:** Isolated source-backed JS boundary
checks confirmed aligned expiry for A/B, no persistent
identifiable markers for C, rejection of D-39's prior
30/90 mismatch, and no authorization or deletion assertions.
Native Node/Chromium CI verification is pending in this
historical entry.

**Unaffected:** Original G1 register 12/12 PENDING and
final sign-off PENDING; no participants, consents, interviews,
real token generation, data, deletion, scores, past assessments,
P0, main site or public release. PR #61 stays Draft.

### A05-D41-001 — native CI evidence (2026-10-26 JST)

GitHub Actions **40214353407: SUCCESS**. D-41 aligned-policy
synthetic-only contracts **10/10 PASS (native Node 22)**.
D-40 synthetic consent/withdrawal **10/10 PASS**,
D-38/D-39 G1 contracts **11/11 PASS**, D-35–37 research
contracts **18/18 PASS**. Existing A05 scoring domain
**66/66**, simulated IndexedDB storage **13/13**, real
Chromium A05 acceptance **16/16** plus an independent
no-network/page-error check, P0 browser QA and local
preflight all passed. SEO audit run **40214353357: SUCCESS**.

**Scope:** These contracts prove only internally consistent
paper-policy alternatives and deterministic synthetic
review states. They do NOT prove participant identity,
token-security implementation, physical record/backup
deletion, policy approval or consent. Original 12 G1
decisions and final sign-off remain PENDING; no
respondents, recruitment, research data, release or
production change occurred. No new Actions job or
workflow was created.

## A05-D42-001 (2026-10-26)

**Scope:** Translate the D-41 policy A (14-day contacts,
30-day pseudonym lookup and 30-day notes) into a concrete
operational acceptance *evidence requirement* before real research.

**Before:** D-41 aligned the proposed linkage and note lifetimes,
but left actual participant rights/identity verification,
physical storage and backup erasure, authorization and
post-expiry monitoring untested and unapproved.

**After:**
- Created `docs/A05_D42_30DAY_ACCEPTANCE_REGISTER_20261026.json`
  with **16 acceptance controls** linked across all 12 G1
  decisions. Every check is PENDING, evidence/reference/role/time
  fields null, approval PENDING, and collection/recruitment/
  physical-erasure/token-implementation flags false.
- Added `docs/A05_D42_30DAY_OPERATIONAL_ACCEPTANCE_20261026.md`
  covering the evidence matrix, proposed cutoff days, safe
  withdrawal identity token, backups/sync/replicas, fail-to-delete
  handling, participant notice and release restrictions.
- Added `scripts/a05-research-d42-acceptance-audit.mjs`,
  pure structural evidence validator. It verifies check IDs,
  G1 mapping, D-41 unchanged 14/30/30 source, fake approval,
  missing evidence and candidate mismatch. **Always reports
  `authorized:false` and `physicalDeletionVerified:false`.**
  Even a hypothetical completed 16-row document is *not*
  automatically eligible for research approval.
- Added `scripts/test-a05-research-d42.mjs` with **11**
  contract cases, including forged sign-off, unsafe legacy
  30/90 durations, missing checks, pending G1 source,
  fictional metadata, malformed input, and symbolic boundary
  transitions. Extended the existing conditionally-scoped
  A05 Node step, **no new workflow or job**.

**Reason:** Prevent a passed logical simulation from being
mistaken for participant-authenticated withdrawal, actual
record/backup deletion, regulatory conformity or formal
research authorization.

**Verification at creation:** The prospective native Node
contract and existing browser QA run have **not yet been
observed at this entry**. Inspecting evidence field
completeness is not validating those external artifacts.

**Unchanged:** D-38 G1 register remains 12/12 PENDING
and final human approval absent. No actual participant,
recordings, individual records, data deletion, secret token
issuance, real storage changes, scoring, P0 or production
deployment. PR #61 stays Draft.
