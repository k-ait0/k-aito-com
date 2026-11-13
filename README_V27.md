# Analytics v0.27 — official CPI publication evidence

2026-11-13 JST — private-only research branch. Adds an immutable first-party reviewed 3-record headline-index evidence catalogue (2015/2020/2025 bases), a conservative as-of evaluator, optional local pinned-PDF hash check, and 36 regressions. 788/788 Node tests PASS.

The official observation values and release dates are independently checked from primary publication documents and e-Stat listings, but **raw PDF/Excel bytes were NOT downloaded or authenticated in this environment**. No historical full vintage or automatic modelling import is claimed. Review `docs/ANALYTICS_CPI_OFFICIAL_RELEASE_EVIDENCE_V0_27.md` before using any date-labelled data.

Run: `node scripts/check-analytics-cpi-evidence-v27.cjs --asof 2026-08-21`.

No changes to main, public website, or DWZ PR #70.
