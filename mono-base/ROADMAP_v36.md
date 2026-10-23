# MONO BASE v3.6 — configuration note export (Draft)

**Created:** 2026-10-23. **Starting point:** production v3.5 `70a94f9`.  
**Scope:** P2-01 display-configuration notes. This is **not** CAD or manufacturing design export.

## Why this is next
The v3.5 interface exports a PNG but cannot capture the display parameters used to produce it. Users cannot easily reproduce or discuss their on-screen display choices. The minimal safe improvement is copyable plain text.

## Design contract
- Include the model identifier and six controlled values: display mode, last camera preset, projection, selected component, wing sweep in degrees, and target exploded-view percentage.
- Keep the summary visible in a read-only text field with an associated label and accessible status message. Allow users to copy text via the browser clipboard. When permission is unavailable or denied, select the text and instruct manual copying.
- Update on all relevant control changes, including slider input and RESET. Copy the slider's **requested exploded percentage**, not animation-in-progress value.
- Explicitly exclude manual camera orbit/zoom coordinates, real dimensions, analysis, certification, manufacturing and CAD geometry. Never label copied text as a validated engineering configuration or full reproducible camera snapshot.
- Standalone `cad-viewer.html` stays `noindex,follow`; no change to 8 public page URLs, sitemap, original 13 image paths, or WebGL model geometry.

## Verification gates
1. `scripts/test-mono-base-v36-configuration.cjs`: deterministic pure formatter, changed values and reset, default HTML matching runtime, assistive labels and denied-clipboard fallback.
2. Existing v3.5 control/renderer lifecycle tests and Chromium desktop, 390px, 320px regression, including live settings after changing camera preset, projection, part, wing sweep and exploded target.
3. PR static checks before review. Full browser evidence at the exact final PR head before release.
4. Explicit approval before merge/deployment, followed by XServer byte-for-byte and live Chromium verification. Safari/real mobile device is a separate unverified acceptance item.

## Not included
Saved user profiles, sharable URLs, model geometry serialization, manufacturing file export, analytics, databases, PWA offline support, performance claims.

## Revision history
2026-10-23: P2-01 proposed as a copyable text snapshot instead of CAD/model export. Reason: provide usable design-study continuity without implying engineering dimensions or claiming to reproduce an independently orbited camera position.
