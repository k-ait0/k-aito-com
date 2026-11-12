# K. Aito Analytics v0.22 — USD Historical Withdrawal Boundaries

Status: RESEARCH_ONLY. Derived approximations from the pinned Shiller public candidate, not the legacy private original and not official investable total returns.

Main implementation: lib/analytics/public-shiller-withdrawal-boundary-v22.cjs
CLI: scripts/run-analytics-public-withdrawal-boundary-v22.cjs
Tests: scripts/test-analytics-public-withdrawal-boundary-v22.cjs
Research report: docs/ANALYTICS_SHILLER_USD_WITHDRAWAL_BOUNDARY_V0_22.md
Aggregates: docs/ANALYTICS_SHILLER_USD_WITHDRAWAL_BOUNDARY_V022_AGGREGATES.json

Run all regression tests with Node.js 22:

    node --test scripts/test-analytics-*.cjs

To run the offline public candidate study with a pinned source downloaded lawfully and saved outside the Git checkout:

    node scripts/run-analytics-public-withdrawal-boundary-v22.cjs --source-file /ABS/PRIVATE/data.csv --out-dir /ABS/PRIVATE/research

Alternatively use --fetch-once to download exactly the pinned upstream Git source snapshot. Outputs are private and immutable. Never commit raw market source data, keys, or decrypted archives.

QA: 637/637 PASS (617 existing + 20 new). Final Japanese yen and Japanese CPI real-data QA remains blocked.
