# K. Aito Analytics v0.29 — CPI publication instant and rebasing event audit

Adds 2026-08-07 16:00 JST **rebase publication** and 2026-08-21 / 09-18 / 10-23 08:30 JST **normal monthly releases** as separate reviewed official publication events. The existing day-only v0.28 code is unchanged; the new offline CLI accepts an explicit JST time and blocks future values. Offline local PDF candidate fingerprinting is available and expressly *does not authenticate a claimed official origin*.

- `node scripts/check-analytics-cpi-intraday-v29.cjs --asof-jst '2026-09-18T08:30:01+09:00'`
- `node --test scripts/test-analytics-*.cjs`

Documentation: `docs/ANALYTICS_CPI_INTRADAY_PUBLICATION_V0_29.md`.
Official source URLs cited in the documentation. Historical original PDFs/CSV are NOT inside this bundle. No public-site modifications or raw private-data disclosure.
