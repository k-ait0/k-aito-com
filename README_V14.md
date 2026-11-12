# K. Aito Analytics v0.14 — Private paired inflation study and ledger audit

**Research only. NOT a live investment/financial advice application.** This package inherits the complete source/test snapshot of v0.13. Its new parts live in `lib/analytics/rolling-cpi-benchmark.cjs`, `lib/analytics/private-cpi-benchmark-research.cjs`, `lib/analytics/portfolio-ledger-audit.cjs` and corresponding scripts/tests. No observed market values, private keys, artifacts or original paid indexes are included.

## Quick regression

`node --test scripts/test-analytics-*.cjs` — 456/456 PASS (Node.js 22.16.0 at development time).

For the full purpose, restrictions and manual-only private experiment:
`docs/ANALYTICS_PAIRED_CPI_ACCOUNTING_AUDIT_V0_14.md`.

The v0.13 UI was not modified. No deployment, GitHub PR #70 merge or data provider change occurs in v0.14.
