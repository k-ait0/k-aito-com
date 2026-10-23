# MONO BASE — v3.5+ development roadmap

Status: **v3.4 production VERIFIED; v3.5 development Draft only**. Date: 2026-10-23.

## Baseline
- v3.4: eight public content pages, `cad-viewer.html` utility page (noindex), original 13 JPEG paths / six distinct SHA-256 payloads, Three.js interactive aircraft study, 320/390/768/1440px checks.
- Evidence: [Production Chromium QA 39885561010](https://github.com/k-ait0/k-aito-com/actions/runs/39885561010), 2308/2308 assertions and 85/85 live production checks; [146/146 file integrity](https://github.com/k-ait0/k-aito-com/blob/main/docs/qa/kaito-production-release-20261023.json).
- Existing production source is **frozen** for this work. All next-version changes are Draft and must not merge/deploy as a side effect.

## v3.5 priorities
| Priority | Slice | Current finding | Done when |
| --- | --- | --- | --- |
| P0 | **Full reset** | Orthographic camera is retained after RESET | Mode, part, sweep, exploded view, camera preset and projection all reset; both button and Home keyboard path pass browser tests |
| P0 | **Accessible selected state** | Control state relies on visual `active` class | 14 mode/view/projection/part controls expose accurate `aria-pressed` before and after actions, including reset |
| P1 | **Offscreen renderer economy** | Viewer spins RAF while not visible; parent does not currently send `mono-visibility` notifications | Verified pause/resume without blank frames when embedded iframe is offscreen or tab hidden, preserve touch/drag/damping |
| P1 | **3D fallback / dependency resilience** | CDN dependency requires network and may fail | Offline/unavailable-module fallback remains legible, keyboard-accessible and safe; maintain WebGL error coverage |
| P2 | **View export and configuration UX** | PNG export available but current camera/parameter metadata is not recorded | Evaluate optional copyable preset/settings summary; no false claims of manufacturing-grade CAD |
| P2 | **Content depth** | Many sections are conceptual introductions | Add evidence-backed design process notes and project updates only when source material is available |

## Implementation and acceptance
1. P0 patch affects only the standalone CAD HTML, regression test, lightweight QA script and records. Do not change original images, indexing, public sitemap or sitewide CSS.
2. Run automatic low-cost static checks on PR updates. Full Chromium/WebGL and dependency-failure QA only with explicit final release trigger.
3. Inspect keyboard selection states, use 320px / 390px / 768px / 1440px layouts and test RESET after changing orthographic projection.
4. Merge/public deployment is a **separate approved release action**. Post-release: verify original asset hashes, public links, standalone viewer noindex, and actual 3D functionality; archive evidence.
5. Append any future spec changes with date, before/after and rationale; do not delete previous records.

## Out of scope for P0
- Aircraft geometry changes, aerodynamic simulation, real CAD dimensions, new 3D assets, image substitutions, member registration, unrelated KAITO/FINOWA changes.
