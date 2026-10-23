# MONO BASE v3.4 — release readiness (2026-10-22)

## Non-negotiable release policy

**PR #33 remains Draft. No merge or production deployment without release approval.** Full v3.4 source (nine HTML pages including the 3D viewer), 13 original JPEG filenames (six distinct byte payloads) and CSS are on the integration branch. Completing CI is not equivalent to deployment: XServer and live-device evidence remain mandatory.

## Completed on integration branch

- Original asset integrity: `mono-base/ASSET_MANIFEST.sha256`, 13/13 verified in GitHub Actions.
- Embedded interactive CAD: normal desktop, 390px and 320px operation; keyboard, view modes, geometry, fallback when the Three.js dependency cannot load.
- Visual QA: fixed overflowing iframe, incorrect footer order, stale gallery explanation and desktop unused space; checked six screenshots.
- Metadata staged: eight page-specific descriptions, canonical URLs, OpenGraph and Twitter large cards; `assets/hero_final.jpg` used for image. All nine pages still **noindex,follow**, sitemap has no MONO BASE URLs.
- Commit `4247304`: both SEO static audit and full MONO BASE Chromium browser QA **PASS**. [PR #33](https://github.com/k-ait0/k-aito-com/pull/33)
- The KAITO `/projects/` project-notes column now includes an internal MONO BASE discovery link; this does not alter the existing four-card project registry or its generated markers.

## Publication compatibility fix — subject to fresh CI

KAITO traditionally indexes /directory/ routes, whereas seven MONO BASE content URLs are explicit `.html` paths. The original three production scripts would have rejected these URLs or assumed the ordinary KAITO white/search shell.

- `scripts/public-sitemap-routes.cjs` provides an exact, eight-URL MONO BASE content allowlist, alongside existing KAITO directory routes. Neither `cad-viewer.html` nor unknown HTML paths may enter the sitemap.
- `scripts/audit-seo.cjs` resolves the exact public file for each sitemap URL.
- `scripts/browser-smoke.cjs` applies MONO BASE-specific dark-shell, canonical/indexability, responsive menu, image loading and 3D iframe/control checks rather than requiring KAITO's white search layout.
- `scripts/live-production-check.cjs` validates the eight indexed MONO BASE pages as well as the embedded CAD viewer, CSS and all 13 original JPEG files **byte-for-byte** on XServer, but only when the eight routes have been formally added to the sitemap.
- `scripts/test-mono-base-preview.cjs` now enforces complete **preview or release** mode, rejecting partially indexed pages. Standalone `cad-viewer.html` stays noindex in either state.
- `scripts/prepare-mono-base-publication.cjs` provides a read-only readiness check by default; its opt-in `--apply` requires explicit approval environment flag and updates eight content pages plus sitemap. It does not merge or deploy.
- `.github/workflows/mono-base-qa.yml` validates the route contract, publication dry-run and script syntax on the integration branch.

## What remains before release

1. Confirm new GitHub Actions checks pass on the compatibility commit. Review failures if any; do not bypass the gate.
2. Perform a real normal-browser acceptance run including touch/keyboard/CDN failure, and review the UI against the intended design.
3. Obtain final release approval. At that point prepare one **reviewed** public-mode commit removing noindex from the eight content pages and adding their eight sitemap URLs; leave the CAD utility noindex.
4. Validate updated sitemap, SEO, page links, image bytes and full browser QA before merge.
5. Merge then deploy through XServer Static, inspect any deployment mismatch (tracked separately in KAITO issue #52), rerun live byte-for-byte comparison and responsive 3D tests, and record evidence.

**State: Draft PR; source and visual QA passed prior to compatibility change; indexing off; not merged or deployed.**

## 2026-10-23 — KAITO main conflict resolution and generator isolation (append-only update)

- Draft PR #33 previously could not merge because KAITO main advanced by 42 commits. Non-conflicting MONO BASE changes were preserved while `projects/index.html`, `scripts/browser-smoke.cjs`, and `scripts/live-production-check.cjs` were reconciled with current main; the merge commit has parents from both branches. `main` itself was not changed.
- Browser QA continues to use KAITO's latest six-viewport shared search, header, footer, breadcrumb and accessibility checks, with a separate branch for MONO BASE's independent dark layout.
- Additional release-risk audit identified **four KAITO content generators** that would have failed on the seven MONO BASE file-style `.html` routes after indexing: site shell, site breadcrumbs, white reading surface CSS, and generated search-script links. They are now restricted to KAITO sitemap routes while retaining the same existing 24-page behavior.
- The corresponding four regression suites also filter the distinct MONO BASE routes; the dedicated `test-mono-base-generator-isolation.cjs` simulates adding all eight public routes **without changing the real sitemap** and verifies that the original dark designs remain isolated.
- The updated MONO BASE workflow now tests the generator scope, syntax, release-mode eligibility, and existing KAITO generator regressions before performing browser QA.
- Noindex/robots and sitemap remain in **preview mode**; public-mode conversion has NOT been performed. The changes in this addendum still require the new merge-head CI run.
- KAITO [Issue #52](https://github.com/k-ait0/k-aito-com/issues/52) remains open; investigation identified a previous Actions-generated HTML revision that did not match the version served by XServer. Current live state and XServer deployment history are not confirmed. Draft [PR #54](https://github.com/k-ait0/k-aito-com/pull/54) proposes manual-only article-index generation to prevent recurrence; it is not merged.

## 2026-10-23 — Public-mode end-to-end fixture and copy audit

- The latest browser QA artifact was inspected at 1440px desktop, 390px phone and 320px small-phone. Interactive CAD controls are fully visible; the standalone utility and gallery remain concept-only rather than manufactured engineering drawings.
- The MONO BASE homepage still described the 3D feature as future work even though the standalone viewer is integrated into DESIGN LAB. Its preview ribbon, explanatory text and principal CTA now distinguish **static homepage concept images** from the **working interactive viewer on DESIGN LAB**.
- `scripts/test-mono-base-publication-fixture.cjs` creates a disposable **OS temporary directory**, copies the existing KAITO sitemap/HTML and MONO BASE assets, executes the actual release preparation script **only inside that temporary directory**, runs all four KAITO generators, then verifies all eight MONO BASE public HTML pages and the noindex CAD utility are unchanged by the KAITO generators. It also verifies the KAITO site-shell, breadcrumb and MONO BASE public-mode regression checks. The original working tree is never written.
- The MONO BASE QA workflow now invokes the end-to-end publication fixture without deploying, merging or enabling indexing in the real branch.
- Important: XServer's actual served content and deployment history have **not** been verified. This local fixture is a publication simulation, not a live production acceptance test.

## Actions cost-policy update — 2026-10-23 (Draft review)

- The preceding full browser/3D regression run [39878441039](https://github.com/k-ait0/k-aito-com/actions/runs/39878441039) **passed** at source commit `c2db0b6`; [SEO static audit 39878441017](https://github.com/k-ait0/k-aito-com/actions/runs/39878441017) passed on that same commit.
- MONO BASE's own QA workflow is split into **`static-qa` on scoped Draft PR changes** and **`browser-qa` only on an explicit manual event**. This avoids repeatedly installing Chromium, system packages and Playwright on routine HTML/CSS/docs edits.
- For the Draft PR, apply the repository label **`mono-base-full-qa`** to trigger one full browser run. The job runs **only for the exact `labeled` event**, not for subsequent pushes while the label stays in place. Remove then re-apply the label for a deliberate later run. The repository label must exist before it can be applied.
- Once this workflow exists on the default branch, **`workflow_dispatch`** is another supported manual trigger; do not assume branch-only `workflow_dispatch` works before merge.
- Pull request events with relevant source/workflow changes still run lightweight tests: no broken links, exact original JPEG hashes, preview/public indexing gates, real public-mode sandbox rehearsal, compatibility checks and KAITO generator regressions.
- Explicit release criterion: confirm **one successful `browser-qa` run at the exact publication candidate head SHA** after the public-mode commit and before merge/deploy. A static-only green check must **not** be misrepresented as full 3D/browser clearance.
- GitHub public-repo billing and account spending-limit settings have not been verified; no assumptions about available minutes or budget should be used as test evidence.
- **No change to main, PR Draft status, noindex or XServer** is authorized by this workflow adjustment. Historical production mismatch [Issue #52](https://github.com/k-ait0/k-aito-com/issues/52) remains a separate live deployment blocker.

## Local-first QA launcher — 2026-10-23

- `node scripts/mono-base-local-qa.cjs` now runs **11 inexpensive checks** in the current checkout without relying on GitHub Actions: eight MONO BASE preview/release and KAITO regression checks, site static/SEO audit, and original 13-JPEG SHA-256 verification.
- Requires the already-used Node.js and Python runtimes; no browser package download, account authorization or GitHub action is needed. On Windows, Python launcher fallback is supported.
- Runs are **read-only** against the checked-out source. The published-mode rehearsal only modifies a disposable OS temporary directory that is cleaned afterward.
- Outputs named PASS/FAIL entries and a final aggregate exit status. The local launcher does **not** replace the deliberately manual Chromium/WebGL browser QA or live XServer deployment checks.
- The MONO BASE workflow checks the syntax of this launcher but continues to perform its own lightweight tests on each scoped PR update.
