# MONO BASE v3.4 — release readiness (2026-10-22)

## Non-negotiable release policy

**PR #33 remains Draft. No merge or production deployment without release approval.** Full v3.4 source (nine HTML pages including the 3D viewer), 13 original JPEG filenames (six distinct byte payloads) and CSS are on the integration branch. Completing CI is not equivalent to deployment: XServer and live-device evidence remain mandatory.

## Completed on integration branch

- Original asset integrity: `mono-base/ASSET_MANIFEST.sha256`, 13/13 verified in GitHub Actions.
- Embedded interactive CAD: normal desktop, 390px and 320px operation; keyboard, view modes, geometry, fallback when the Three.js dependency cannot load.
- Visual QA: fixed overflowing iframe, incorrect footer order, stale gallery explanation and desktop unused space; checked six screenshots.
- Metadata staged: eight page-specific descriptions, canonical URLs, OpenGraph and Twitter large cards; `assets/hero_final.jpg` used for image. All nine pages still **noindex,follow**, sitemap has no MONO BASE URLs.
- Commit `4247304`: both SEO static audit and full MONO BASE Chromium browser QA **PASS**. [PR #33](https://github.com/k-ait0/k-aito-com/pull/33)

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
