# MONO BASE v3.4 integration status — 2026-10-22

## Release rule
Only the complete v3.4 may be published. Keep [Draft PR #33](https://github.com/k-ait0/k-aito-com/pull/33) unmerged; **no XServer deployment until release approval** and public metadata review. Merge alone is not completion: require live functional verification.

## Source integrated
- Eight content HTML pages plus `cad-viewer.html` (nine HTML pages), `site.css`, and 13 byte-identical original JPEG filenames (six different payloads).
- Original hashes recorded in `ASSET_MANIFEST.sha256` and verified during CI.
- Import commit `a3023ac`; WebGL/CDN failure fallback fix `b02c550`.
- Layout fix `e303744`: move exhibit before footer, same-origin iframe auto-height, stable viewer stage heights, corrected gallery explanation, and new clipping/flow regression checks.
- This revision balances the desktop stage height with the full control panel; mobile retains fixed 360/440px stage heights.

## Automated QA and visual evidence
- Local: images 13/13 match SHA256, site static check PASS (46 HTML files, 955 local references), MONO BASE preview PASS, whitespace diff check PASS.
- GitHub at `b02c550`: SEO audit PASS and MONO BASE site QA PASS including Three.js failure fallback.
- GitHub at `e303744`: SEO audit PASS; MONO BASE site QA PASS, including 1440px/390px/320px desktop/mobile WebGL interaction, complete iframe content fit and footer order.
- Inspected the six full-page visual QA screenshots produced by the `e303744` run. The iframe controls previously clipped on desktop/mobile now appear through the final reset/export buttons, and the footer appears after the CAD exhibit.
- Latest visual-only desktop refinement is pending re-run and screenshot confirmation; the previous verified version can be referenced if it regresses.

## SEO / public release proposal
- Current nine pages remain `noindex,follow`. Neither the noindex preview nor its pages belong in the production sitemap.
- At release approval: expose **eight content pages** with self-canonical URLs on `https://k-aito.com/mono-base/` (index) and their `.html` paths, add canonical/OG/Twitter meta and eight sitemap locations, and remove their noindex directives.
- Keep the utility `cad-viewer.html` **noindex** even after the public site launches; it is embedded by `design-lab.html`, which is the indexed entry point.
- Recheck XServer deployment path and CDN/Three.js dependency handling before activating public indexing.

## Outstanding release gates
1. Pass CI and review fresh screenshots for the desktop stage balancing change.
2. Check live browser interaction beyond CI (touch, keyboard, responsive menu, CDN outage and fallback); confirm target visual design.
3. Implement and review release metadata + sitemap while the PR remains Draft.
4. Explicitly approve public release, merge, deploy to XServer, and verify all public URLs/images/links/3D interactions on the production site.

**Current state: staged and tested in Draft PR; not merged, not deployed, not complete.**
