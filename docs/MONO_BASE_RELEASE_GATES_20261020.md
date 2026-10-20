# MONO BASE release gates (2026-10-20)

## Scope and release decision
Draft PR #33 currently contains eight concept-stage HTML pages under `/mono-base/`. The PR description explicitly excludes the intended v3.1 visual assets and 3D viewer. **This is not a finished public release.** Do not merge the PR or claim production completion without the owner's decision on a limited concept preview versus the full experience.

## Verified from GitHub branch (source inspection only)
- All eight pages (`index`, `about`, `aircraft`, `robotics`, `space`, `design-lab`, `technology`, `journal`) contain `<meta name="robots" content="noindex,follow">`.
- `sitemap.xml` does not contain a `https://k-aito.com/mono-base` location.
- Historical browser workflow run [38516560214](https://github.com/k-ait0/k-aito-com/actions/runs/38516560214) stopped at `site-static-check.cjs` with `Canonical mismatch mono-base/about.html`; it **did not reach Playwright**. This historical failure predates the noindex edits.
- The static checker exempts noindex pages from canonical, OpenGraph URL/image, Twitter card, and sitemap requirements; it still checks titles, descriptions, viewport, anchors and local resources.

## Required before any release
1. Run `node scripts/site-static-check.cjs`, `node scripts/test-published-content.cjs`, `node scripts/test-site-shell.cjs`, and MONO BASE-specific QA on the final PR merge ref; fix all failures.
2. Decide whether to ship a deliberately limited concept preview (noindex, with explicit concept-stage labeling) or to complete the full v3.1 visual package, image assets and 3D viewer before public release. Do not silently change scope.
3. For a full public release, add validated canonical, OpenGraph metadata, share image, and sitemap entries as appropriate; remove noindex only after the pages are ready for indexing.
4. Run desktop/mobile browser QA once on the final candidate, review screenshot and interaction results. Avoid repeated speculative GitHub Actions runs.
5. Confirm required status checks and branch rules, merge only after approval, and verify deployed content and browser behavior on XServer.
6. Record production verification evidence in the main KAITO progress ledger.

## Status
Source-level metadata issue addressed provisionally; **tests unexecuted on current head**, deployment not attempted, full launch blocked by missing intended visual package and QA.
