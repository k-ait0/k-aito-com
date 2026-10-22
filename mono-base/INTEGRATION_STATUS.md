# MONO BASE v3.4 integration — 2026-10-22

## Release policy
**Full v3.4 only; no automatic production release.** PR #33 must remain a Draft until visual review, release metadata, approval, XServer deployment and live verification are complete.

## Integrated source
- Branch `feature/mono-base-kaito-integration` now includes **nine HTML files** (eight content pages plus `cad-viewer.html`), site stylesheet, and 13 original JPEG filenames (six unique payloads).
- Initial complete import commit: `a3023ac`.
- The original JPEG bytes are verified against `ASSET_MANIFEST.sha256`; no asset substitutions.
- 3D WebGL fallback fix commit: `b02c550`.

## Test results before visual fixes
- Local image integrity, site-wide static checks and MONO BASE preview gate: **PASS**.
- GitHub SEO static audit and MONO BASE site QA: **PASS** at `b02c550`.
- Chromium desktop 1440px, mobile 390px, and small mobile 320px all passed the automated CAD interaction and dependency-error fallback checks.
- Screenshot review of the successful run found two *additional* design issues not covered by the original tests: CAD iframe controls clipped beneath its fixed viewport, and the site footer displayed before the CAD section.

## Visual QA correction in this change
- Moves the 3D exhibit inside the main document before the footer.
- Makes the same-origin iframe height track its content, avoiding inaccessible controls and unnecessary nested scrolling.
- Uses stable stage heights in the embedded CAD viewer to prevent viewport-height feedback loops.
- Corrects stale static-gallery copy that claimed 3D would be integrated in a later phase.
- Adds browser regression checks for iframe content fit and correct footer order.

## Remaining gates
1. **Run the updated GitHub Actions checks**, then inspect refreshed desktop/mobile screenshots (not just test pass/fail).
2. Confirm full real-browser WebGL/CDN behavior, responsive menu and keyboard/screen-reader accessibility.
3. Decide public URLs and metadata: keep the 3D utility page noindex; when public release is approved, remove noindex from the eight content pages, add canonical/OG/Twitter metadata and sitemap entries.
4. Approve release, merge and deploy to XServer.
5. Verify real published images, links and 3D controls after deployment. Record evidence and mark release complete only then.

**Current status: sources integrated; visual fixes pending re-test; Draft PR, not deployed.**
