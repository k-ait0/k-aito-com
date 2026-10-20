# KAITO: Actions-minimal verification policy (draft)

Date: 2026-10-20. This document is a proposal in Draft PR #51, not an indication that production settings have changed.

## Goals
- Preserve correctness of published pages and metadata while reducing GitHub-hosted runner usage.
- Do not merge or deploy unverified changes solely because a workflow was disabled.

## Routine changes (local verification before PR)
Run from the repository root with Node.js 22:

```sh
node scripts/site-static-check.cjs
node scripts/test-published-content.cjs
node scripts/test-site-search-core.cjs
node scripts/test-site-search-ui.cjs
node scripts/test-site-shell.cjs
node scripts/test-site-breadcrumbs.cjs
node scripts/test-article-navigation.cjs
git diff --check
```

If a script is missing or fails, record the failure and do not label the change verified. Run the applicable generation/sync tests and inspect `git diff` before committing generated output.

## Browser QA (manual)
- Run `Browser and metadata QA` using the GitHub Actions UI (workflow_dispatch) on the release candidate branch when layout, search dialog, navigation, responsive CSS, or shared shell changes.
- Review Chromium assertions and screenshots for 320/375/390/430/768/1440px where relevant.
- Preserve the existing test job, commands, and artifacts; only the automatic triggers change in PR #51.

## Content synchronization (unchanged)
- `.github/workflows/sync-published-content.yml` still runs on selected pushes to `main` and can commit generated files. Do not disable it without a verified replacement that preserves index/sitemap consistency.

## Before merging PR #51
1. Inspect repository rulesets / branch protection and required status checks. If Browser and metadata QA is required, update the policy or provide an equivalent required check before removing automatic triggers.
2. Inventory all workflows and check for duplicate browser tests, deployment dependencies, and workflow chaining.
3. Verify local checks and one manually triggered browser QA run on a release candidate, if the runner budget permits.
4. Keep PR #51 as Draft until these gates are met. Do not merge or deploy automatically.

## Release verification
- Confirm source SHA, published asset versions, sitemap, and a representative set of desktop/mobile pages after deployment.
- Record results and distinguish local QA, Actions QA, and production verification.

## Audit update: 2026-10-20

Repository files inspected:
- `.github/workflows/browser-qa.yml`: automatic PR and main triggers are removed **only in this Draft PR**; manual browser QA remains.
- `.github/workflows/sync-published-content.yml`: selected `main` pushes trigger generation; it may push a generated commit to `main`.
- `.github/workflows/live-production-check.yml`: **both** selected `main` pushes and successful completion of `Sync published article index` can trigger production verification; manual dispatch also exists. It installs Chromium after a full file-by-file production match.

### Duplication and safety assessment
A content update can trigger content sync and production verification; completion of sync can also trigger another production verification. The concurrency group `kaito-live-verification` with `cancel-in-progress: true` reduces simultaneous runs but does not guarantee zero billed runtime for superseded runs. Do not remove either trigger without confirming deployment timing and which run is needed.

### Current publication blocker (from progress ledger, last entry 2026-10-17)
- `/notes/kidp-002-whynot/` failed byte-for-byte comparison while 61/62 files matched.
- GitHub index sync success does not prove that XServer deployed the updated HTML.
- Inspect XServer deployment history, deployed commit SHA, destination path, and cache behavior before claiming production success.
- Run a single manual `Live XServer deployment verification` after the hosting-side discrepancy is addressed, rather than repeated speculative CI runs.

### Progress ledger correction
The later entries in `docs/KAITO_PUBLIC_SITE_REVIEW_STATUS_20261014.md` supersede its earlier summary table: S-10B2 was merged and production-verified; S-11 was substantially merged. Do not repeat these completed changes. The remaining S-11 gate is the production mismatch noted above.

### Tracking issue
- Hosting-side deployment mismatch: https://github.com/k-ait0/k-aito-com/issues/52. Do not mark S-11 production verification complete until this issue's acceptance criteria are met.

### Local command inventory verified (2026-10-20)
All seven `node scripts/*.cjs` paths in the Routine changes block were individually fetched from `main` and confirmed to exist: `site-static-check`, `test-published-content`, `test-site-search-core`, `test-site-search-ui`, `test-site-shell`, `test-site-breadcrumbs`, and `test-article-navigation`. **File existence is not test execution**: no PASS result is asserted for these checks. `git diff --check` also remains unexecuted. Keep these distinct in any release report.
