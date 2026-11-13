# K. Aito Analytics v0.26 — Historical Japan CPI publication and index-base chain

- `lib/analytics/cpi-historical-release-contract-v026.cjs`: official earliest basis release dates, strict basis-aware publication-vintage validation, no archive authenticity claim
- `lib/analytics/rolling-portfolio-cpi-chain-v026.cjs`: offline paired market/CPI simulation with within-vintage chain factors and fail-closed transition handling
- `scripts/run-analytics-private-cpi-chain-v26.cjs`: offline private CLI, inspect-only + immutable private report
- `scripts/test-analytics-historical-cpi-chain-v026.cjs`: 23 independent vintage/basis and portfolio assertions
- `scripts/test-analytics-cpi-chain-cli-v026.cjs`: 5 offline CLI/privacy tests
- `examples/cpi-chain-v026-SYNTHETIC.json`: deliberately synthetic cross-base fixture
- `docs/ANALYTICS_CPI_HISTORICAL_BASE_RELEASE_CHAIN_V0_26.md`: specification, official sources, limitations
- `QA_V026_ALL_NODE22.log`: full Node 22.16.0 test result, 752 PASS

Source data remain private. This bundle contains **no authenticated historical CPI release vintage**. No changes to main/production/DWZ PR #70.
