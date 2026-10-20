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
