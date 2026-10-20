# MONO BASE integration status — 2026-10-21

## Release policy
**Full v3.4 only.** Do not merge or deploy the eight-page scaffold. PR #33 remains Draft until the complete source package, assets, visual QA, SEO and live verification are finished.

## Source and integration state
- The original `MONOBASE202610140518450C233D9B8841DCD7IntegratedV34.zip` was recovered from the owner's ChatGPT file Library.
- The verified local integration candidate `MONO_BASE_v34_staging_candidate_r2.zip` contains **9 HTML pages, 1 CSS file and 13 original JPEG filenames representing 6 distinct image payloads**.
- The 13 JPEGs in the candidate were compared byte-for-byte against the original v3.4 ZIP. GitHub now contains the original SHA-256 hashes under `mono-base/ASSET_MANIFEST.sha256`.
- Source files and binary images from v3.4 **are not yet integrated into this PR**. Current `mono-base/` is still the eight-page scaffold with a separate prototype viewer.
- The importer (`scripts/import-mono-base.py`) checks the archive's 13 hashes, image headers, local links and replacement conflicts. Import does not happen automatically.
- After importing the complete candidate into `mono-base/`, `.github/workflows/mono-base-qa.yml` selects the full v3.4 browser gate and verifies original asset hashes; before import, only scaffold QA runs.

## Findings from local visual preflight of the candidate
- Chromium rendered eight site pages using in-memory documents and original JPEG data at 1440px, 390px and 320px (24 visual checks). No broken JPEG rendering, JavaScript exceptions or horizontal overflow remained.
- Fixed the TECHNOLOGY heading at 390px and the ENGINEERING JOURNAL heading at 320px **in the candidate ZIP**, not yet in GitHub site files.
- Managed browser policy blocked direct URL navigation; these static visual checks **do not prove Three.js/CDN/iframe CAD runtime behavior**.
- Dedicated full-version browser tests are prepared in `scripts/test-mono-base-v34-browser.py` but will only run after importing `cad-viewer.html` and images.

## Completion gates
1. Import all nine HTML pages, CSS and 13 original JPEG files in one reviewed candidate without discarding the distinct 3D features.
2. Run local static and source-hash verification; collect latest PR CI on the full candidate and fix defects.
3. Review desktop/mobile screenshot artifacts and live CAD interaction including failure fallback, on a normal browser.
4. Finalize metadata, canonical, OpenGraph, sitemap and public indexing when release approved.
5. Merge, deploy to XServer and verify the actual public pages and all image/3D functions; log evidence.

**Current state: candidate built and statically reviewed; full GitHub import, real 3D QA, and production release incomplete.**
