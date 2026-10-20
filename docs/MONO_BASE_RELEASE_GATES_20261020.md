# MONO BASE release gates (2026-10-20)

## Scope and release decision
Draft PR #33 currently contains eight concept-stage HTML pages under `/mono-base/`. The v3.1 visual assets remain unintegrated, while DESIGN LAB already contains a procedural Three.js viewer prototype. **This is not a finished public release.** The owner decided on 2026-10-21 to release the full version only; no concept-preview deployment.

## Verified from GitHub branch (source inspection only)
- All eight pages (`index`, `about`, `aircraft`, `robotics`, `space`, `design-lab`, `technology`, `journal`) contain `<meta name="robots" content="noindex,follow">`.
- `sitemap.xml` does not contain a `https://k-aito.com/mono-base` location.
- Historical browser workflow run [38516560214](https://github.com/k-ait0/k-aito-com/actions/runs/38516560214) stopped at `site-static-check.cjs` with `Canonical mismatch mono-base/about.html`; it **did not reach Playwright**. This historical failure predates the noindex edits.
- The static checker exempts noindex pages from canonical, OpenGraph URL/image, Twitter card, and sitemap requirements; it still checks titles, descriptions, viewport, anchors and local resources.

## Required before any release
1. Run `node scripts/site-static-check.cjs`, `node scripts/test-published-content.cjs`, `node scripts/test-site-shell.cjs`, and MONO BASE-specific QA on the final PR merge ref; fix all failures.
2. Complete the full v3.1 visual package and image assets, and verify the current 3D viewer meets the intended final experience. A limited concept preview is **not** authorized for deployment.
3. For a full public release, add validated canonical, OpenGraph metadata, share image, and sitemap entries as appropriate; remove noindex only after the pages are ready for indexing.
4. Run desktop/mobile browser QA once on the final candidate, review screenshot and interaction results. Avoid repeated speculative GitHub Actions runs.
5. Confirm required status checks and branch rules, merge only after approval, and verify deployed content and browser behavior on XServer.
6. Record production verification evidence in the main KAITO progress ledger.

## Status
Concept metadata addressed provisionally; the MONO BASE QA run at commit `4ad5a8a891704ae1a21d80915b3863b5eb193d55` passed Chromium rendering, desktop/mobile controls and simulated CDN failure handling ([run 39470795076](https://github.com/k-ait0/k-aito-com/actions/runs/39470795076)); the SEO static audit also passed ([run 39470794717](https://github.com/k-ait0/k-aito-com/actions/runs/39470794717)). A subsequent script-only tweak at `38bd9cb` has **not** been re-executed on its own head. The complete visual asset package and manual visual/device review remain outstanding. Deployment has **not** been attempted.

## Added lightweight preview gate
Run `node scripts/test-mono-base-preview.cjs` from the repository root before requesting a browser QA run. This checks all eight HTML files, their staging noindex metadata, absence from the sitemap, and local links without a hosted runner. The gate **passed in run 39470795076**, but is only a staging guard: remove/replace it appropriately when final production indexing and metadata are enabled.

## Owner release decision — 2026-10-21
**Decision: full version only.** Do not merge or deploy the current eight-page concept preview. Finish the intended visual assets and functional 3D viewer, then complete desktop/mobile and accessibility QA, final metadata/sitemap, merge/deployment and live verification. The `noindex` markers are temporary staging safeguards, not the final launch configuration. The three GitHub QA workflows succeeded at commit `c7efbc65a00445d8b120904032c338ed89f95587`, but that success validates the existing scaffold only; it does not establish completion of the intended visual package. Keep PR #33 in Draft until these acceptance criteria are met.

## Source audit correction — 2026-10-21
The DESIGN LAB page **already includes a prototype Three.js WebGL viewer** using a pinned CDN import, procedural fixed-wing concept geometry, pointer rotation, wheel zoom, sweep/explode sliders, wireframe toggle and view/reset buttons. Do not describe the viewer as entirely absent. The remaining gate is to verify this implementation in a real desktop/mobile browser (including external CDN load/failure behavior), resolve interaction/accessibility issues, and decide whether the prototype meets the intended v3.1 quality. The other seven pages currently have no image elements; the promised visual assets are not yet integrated. Browser QA success for the repository does not by itself prove all interactive 3D controls function correctly.

## Interactive viewer implementation and test (2026-10-21)
- Added two-pointer pinch zoom (in addition to pointer drag and wheel), keyboard arrows/zoom/Home, keyboard focus and accessible loading/error status.
- If the pinned CDN dependency or WebGL fails to initialize, expose an alert and disable the inactive controls rather than leaving deceptive interaction affordances.
- Added `scripts/test-mono-base-browser.py` and wired `.github/workflows/mono-base-qa.yml` to assert WebGL canvas readiness, desktop/mobile functionality, view/reset buttons, slider outputs, no horizontal overflow, and the forced dependency-failure fallback.
- Browser QA run 39470795076: `PASS desktop`, `PASS mobile`, `PASS dependency failure`. This is automated Chromium coverage, **not** physical iOS/Android device validation or an assessment of final artwork.

## Original v3.4 source recovery and preflight — 2026-10-21
- Located the owner's original `MONOBASE202610140518450C233D9B8841DCD7IntegratedV34.zip` in the ChatGPT file Library. The original archive is **not yet committed** to this GitHub PR.
- Source package includes 9 HTML pages (the existing eight plus `cad-viewer.html`), `site.css`, and 13 JPEG filenames. SHA-256 comparisons show **6 distinct image payloads**; the other filenames are deliberate duplicate/alias files. Do not count these as 13 unique artworks.
- Archive source inspection found the v3.4 CAD viewer uses Three.js 0.170.0, OrbitControls and additional model modes; it is a different and more elaborate implementation than the existing PR viewer. Do not overwrite either codepath without a deliberate merge/retest.
- Local staging candidate created with all 13 original JPEG bytes preserved, `noindex,follow` on 9 pages, corrected title/description/viewport metadata for KAITO static rules, and strengthened CAD viewer error and keyboard handling. Static checks on candidate found no missing local links or JavaScript syntax errors. Local browser execution could **not** be completed because navigation was blocked by the execution environment; no v3.4 browser success is claimed.
- The source candidate currently resides outside GitHub and must be imported as a coordinated HTML/CSS/images/CAD/QA change. The existing Actions success for PR #33 covers the older staging viewer, **not** this v3.4 package. Final indexing, sitemap, production visual QA, merge and XServer verification remain pending.
