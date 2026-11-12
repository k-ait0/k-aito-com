# K. Aito Analytics v0.17 — Provenance boundary correction

This research snapshot extends v0.16 by fixing a verified source-provenance laundering bug in `private-historical-adapter.cjs`.

Run: `node --test scripts/test-analytics-*.cjs` (Node.js 22). **537/537 PASS** locally, consisting of 520 existing tests and 17 new regression tests.

Reproduction: v0.16 accepted `metadata.proxy:'yes'` plus `monthly_returns[0].estimated:1` and output `origin:'OBSERVED'`; v0.17 rejects both. The new tests are not a substitute for decrypted/raw-source verification. The actual Shiller/Fed/JP CPI private-data integration remains unperformed.

See `docs/ANALYTICS_PRIVATE_PROVENANCE_BOUNDARY_V0_17.md`. No keys, decrypted data, source redistribution or production approval in this archive.
