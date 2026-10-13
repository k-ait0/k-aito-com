# MONO BASE integration status

## Current GitHub branch
- `mono-base/` contains the eight navigation pages, shared stylesheet, and an interactive concept viewer in `design-lab.html`.
- `.github/workflows/mono-base-qa.yml` provides static link checks and browser screenshot steps.
- This branch is a **staging implementation**, not the full local v3.3 package.

## Local v3.3 package (not yet committed)
- Eight content pages plus `cad-viewer.html`, `site.css`, and 13 image assets.
- The local package and the GitHub branch currently have **different versions** of `index.html`, `design-lab.html`, and `site.css`. Do not merge to main assuming they match.
- Keep original binary assets; do not replace them with crops or generated stand-ins.

## Merge gate
1. Import the exact v3.3 HTML, CSS, and binary images into `mono-base/`.
2. Review links, asset MIME types, image sizes, and base-path behavior.
3. Run desktop/mobile browser QA and test the interactive 3D viewer.
4. Confirm no fabricated performance data or project results.
5. Merge draft PR only after screenshots and runtime checks pass.

Production `main` is intentionally unchanged.
