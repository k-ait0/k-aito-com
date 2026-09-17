# K. Aito Top Page Spec

Updated: 2026-09-17

## Goal

The top page should read as a compact editorial archive: a restrained header, a warm study/travel hero, seven shelf categories, then current content and projects. The visual priority is HERO -> SHELVES -> LATEST / PROJECTS -> supporting sections -> FOOTER.

## Canonical page structure

1. HEADER
   - K. Aito brand mark / wordmark
   - HOME / SHELVES / PROJECTS / ARCHIVE / ABOUT
   - Search
2. HERO
   - left: brand paper card
   - center: main message
   - right: First Note polaroid + memo card
3. SHELVES
   - Travel
   - Drink
   - Money / Tax
   - Study
   - Create
   - Project
   - Archive
4. LATEST / recent posts
5. PROJECTS / ongoing projects
6. SMALL NOTES
7. WORDS
8. FOOTER

## Canonical assets

- Brand mark: `/assets/brand/kite-mark.svg`
- Wordmark: `/assets/brand/wordmark.svg`
- Favicon source: `/assets/brand/favicon.svg`
- Hero background: `/assets/hero/hero-bg.jpg`
- Shelf images: `/assets/shelves/{travel,drink,moneytax,study,create,project,archive}.webp`

Root-level `kite-mark.svg`, `wordmark.svg`, `favicon.svg`, `assets/hero-study.jpg`, and the old b64/recovery assets are retained only for compatibility/recovery during the transition. New UI references should use the canonical paths above.

## CSS ownership

- `styles.css`: base/site-wide styles
- `cards.css`: shared card components
- `responsive.css`: shared cross-page responsive rules
- `image-fix.css`: shared visual asset references only
- `homepage.css`: canonical top-page stylesheet entry point

`homepage.css` currently preserves the existing cascade by importing `home-layout.css`, `enhance.css`, and `homepage-polish.css` in that order. These three files are implementation layers, not new entry points. Do not add another top-page stylesheet to `index.html` or `image-fix.css`. Once the visual design is frozen, inline these layers into `homepage.css` and retire the legacy files.

## Responsive targets

Use three design bands as the target model:

- Desktop: 1200px and up
- Tablet: 768px to 1199px
- Mobile: 767px and below

During the transition, existing narrower media queries may remain inside the legacy layer files. New responsive work should converge on these three bands rather than adding more breakpoints.

## Hero rules

- Use one complete background image; never reconstruct the production hero from columns/tiles.
- Keep the left paper card, center copy, and right First Note group as separate HTML/CSS layers.
- Use a local dark overlay only as needed for center-copy contrast; do not bake dark/gray panels into the background asset.
- The official 01-4-style kite mark should be used consistently in header, hero, footer, and icon treatments.

## Shelf rules

- Seven production categories only.
- Production images are WebP 420x236.
- Desktop should prioritize one-row visibility where viewport width permits; tablet/mobile may wrap.
- Do not regenerate production shelf files from legacy b64 payloads during deployment.

## CI / asset policy

`.github/workflows/build-image-assets.yml` is now validation-only. It must not restore historical files, decode recovery payloads, edit CSS/HTML, commit generated files, or push back to `main`. Production images are committed directly and CI only verifies them.

## Next cleanup after visual freeze

1. Replace the temporary hero background with the final approved full-width hero image.
2. Replace the current reconstructed wordmark with final exported brand artwork if/when available.
3. Inline `home-layout.css`, `enhance.css`, and `homepage-polish.css` into `homepage.css`.
4. Remove obsolete hero-tile/b64 recovery assets only after a final backup/verification pass.
5. Run desktop/tablet/mobile visual QA against the approved composition image.
