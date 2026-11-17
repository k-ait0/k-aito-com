# K. Aito Analytics v0.32 — Offline UI Acceptance / Synthetic Demo

**Current research milestone:** A single-file, offline-operable web UI calling the existing portfolio calculation and independent input-audit engines, plus CPI-linked cross-engine equality checks. The market and CPI data are **entirely synthetic**, not historical performance or official current figures. No private raw/encrypted evidence, personal keys or network access is needed for the preview.

## First step

Open `research/analytics/K_Aito_Analytics_Offline_Preview_v032.html` directly in a modern browser. Configure initial capital, monthly contribution/withdrawal, synthetic annual return and inflation, 10/20/30 years, and month-start/end. All computations are local.

## Verify / regenerate

```shell
node --test scripts/test-analytics-*.cjs
node scripts/build-analytics-offline-preview-v032.cjs
```

The tested environment is Node.js 22.16.0. The full suite includes 920 tests. CSP hashes are pinned to the exact inline script and CSS.

The full acceptance scope and uncompleted gates are in `docs/ANALYTICS_V032_OFFLINE_UI_ACCEPTANCE.md` and `docs/ANALYTICS_V032_ACCEPTANCE_GATES.json`.

**Not done:** actual historical JPY/JP CPI QA, owner-key decryption, historical publication vintages, manual browser acceptance, production app UI integration, licensing/rights review, release. `main` and DWZ PR #70 are untouched.
