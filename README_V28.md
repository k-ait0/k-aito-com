# K. Aito Analytics v0.28 — reviewed consecutive national CPI releases

Research only, 2026-11-13 JST. Inherits v0.27; no production change.

- Added strict offline 2026-07..09 2025-base national headline index evidence, with pinned official e-Stat dataset IDs, verified releases, and reviewed 1dp values.
- As-of cutoff excludes same-day releases when clock times are not supplied; no future-lookahead, no unlimited stale forward fill.
- Computes an explicitly **illustrative ratio of rounded index values**, never claims official month-over-month inflation.
- 2026-08 published official month-over-month is 0.1% whereas 102.0-to-102.2 rounded ratio suggests ~0.196%; use original source precision for exact month-over-month QA.
- No downloaded PDF/Excel original, no pinned original SHA, no vintage-series completeness, no official research backtest promotion.
- Data: `docs/ANALYTICS_JP_CPI_RELEASE_SEQUENCE_V028.json`.
- Code: `lib/analytics/cpi-official-consecutive-v028.cjs`, CLI and its tests.
- Run `node --test scripts/test-analytics-*.cjs`.

See `docs/ANALYTICS_JP_CPI_CONSECUTIVE_ASOF_V028.md` for all primary references and scope caveats.
