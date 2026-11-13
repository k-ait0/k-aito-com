# Analytics v0.26 — CPI historical release and index-base chain (research)

Research-only progress record (2026-11-13 JST). No `main`, production, or DWZ PR #70 changes.

## Verified official first-release evidence
- 2015-base nationwide CPI retrospective series: 2016-08-12, 17:00 JST; https://www.stat.go.jp/data/cpi/2015/pdf/2015_sche.pdf
- 2020-base nationwide CPI retrospective series: 2021-08-06, 15:00 JST; https://www.stat.go.jp/data/cpi/2020/pdf/2020_sche.pdf
- 2025-base CPI retrospective series: 2026-08-07 (day); https://www.stat.go.jp/data/cpi/2025/sokyu.html

## Private research implementation, source bundle status
New off-checkout, offline-tested source modules:
- `lib/analytics/cpi-historical-release-contract-v026.cjs` — strict compatible base and publication-date validation
- `lib/analytics/rolling-portfolio-cpi-chain-v026.cjs` — chain-linked relative CPI adjustment within each observed release snapshot, reject missing overlap
- `scripts/run-analytics-private-cpi-chain-v26.cjs` — offline private-only CLI
- `scripts/test-analytics-historical-cpi-chain-v026.cjs`
- `scripts/test-analytics-cpi-chain-cli-v026.cjs`
- `docs/ANALYTICS_CPI_HISTORICAL_BASE_RELEASE_CHAIN_V0_26.md`
- `examples/cpi-chain-v026-SYNTHETIC.json`
- `README_V26.md`

Node.js 22.16.0 local QA: **752/752 PASS**, including 28 new assertions, re-run 2026-11-13.
Full local source/test ZIP SHA-256: `cdc2880ed52899b97e2316b675b9c17373aeb81d7073ec134717f82a7c608488`.

**Important:** This tracking record alone does **not** mean all eight source files have been committed to this branch. The source ZIP is an independently delivered conversation artifact. Until code files are committed and compared byte-for-byte, GitHub source sync remains `PENDING`; treat this branch as an audit anchor, not runnable v0.26.

## Limitations
The official first-release dates are verified; later individual historical releases and vintage index observations are not independently authenticated. Current final revised CPI series must not be presented as historical as-of vintages. No JPY actual backtest, private-source decryption, archive key processing, public-data redistribution, or release approval is claimed.
