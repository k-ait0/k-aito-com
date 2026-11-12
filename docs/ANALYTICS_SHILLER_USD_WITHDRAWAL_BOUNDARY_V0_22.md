# K. Aito Analytics v0.22 | Historical withdrawal boundary research

Date: 2026-11-13 JST. Status: RESEARCH_ONLY. Publication and investment-product use not approved.

## Purpose and methodology

This is a historical USD-denominated experiment on the publicly available Shiller-derived candidate. It reports, for every overlapping historical starting month, the largest initial monthly withdrawal rate that can fund every requested month over a 10-, 20- or 30-year window. It is NOT a future safe withdrawal rate.

- Pinned publisher: datasets/s-and-p-500; commit 87a2284276f79d75041c71c8f6d9f2aa1c965e84; data/data.csv Git blob SHA1 1c5f64a1cb8377fde80d339fbf0051e5e0e94566.
- Eligible history: 1980-01 through 2023-06, 522 monthly rows. Never use FRED price-only extensions after 2023-06.
- Market return: (P(t) + annualized dividend(t)/12) / P(t-1), an approximation from monthly average prices; NOT official S&P 500 total return.
- Starting capital: 100000 USD-like calculation units, rounded to integer units each month.
- Withdraw at the start of each month, then apply the derived USD return.
- Expenses: fixed nominal monthly amount OR same initial amount indexed to US CPI observed two months before each month. This two-month delay is illustrative, not a verified historic data-release calendar.
- The rate is measured against INITIAL capital, not a fraction of current assets. Precision is 0.1 basis point = 0.001 percentage points per MONTH. For example, a stored rate of 300 means 0.300% monthly.
- For each start-month, integer binary search finds the maximum funded rate. The rate itself must fund all months, and the adjacent rate +0.001 percentage points per month must produce at least one shortfall.
- Both expense models share exactly the same start months. Start months are 1980-03 through 2013-07 (10y, 401), 2003-07 (20y, 281), or 1993-07 (30y, 161). Overlapping windows are NOT statistically independent trials.
- No FX, Japanese CPI, pensions, contributions, tax, fees, or actual brokerage execution.

## Historical results: US-CPI-indexed expenses

All numbers below are monthly initial-capital withdrawal-rate percentages, descriptive only.

| Horizon | Starts | Minimum | Nearest-rank 10th percentile | Median | 90th percentile | Maximum | Most restrictive start |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 10 years | 401 | 0.613% | 0.809% | 1.302% | 1.517% | 1.821% | 2000-09 |
| 20 years | 281 | 0.382% | 0.460% | 0.858% | 1.097% | 1.368% | 2000-09 |
| 30 years | 161 | 0.584% | 0.692% | 0.790% | 0.954% | 1.168% | 1987-09 |

Median ceilings for fixed nominal expenses were 1.467%, 1.057%, and 1.058%, respectively. Note that the median of per-start paired differences is NOT in general the difference between two medians. Exact paired statistics are kept in the aggregates JSON. Neither the minimum nor the median is a safe withdrawal recommendation.

## Validation and limitations

- Node 22 full regression: 637/637 passed (v0.21 617 plus 20 new tests).
- New test suite checks rate granularity, CPI increase/decrease, adjacent-boundary proof, invalid market or CLI input, exact matched starts, and v0.21 parity across 108 synthetic comparisons.
- On the pinned real source, funded-window counts for initial monthly rates 0.30%, 0.50%, and 1.00% match the existing v0.21 study in every horizon and mode.
- Real-source aggregates were computed directly from the pinned GitHub data snapshot; local Node test evidence is based mainly on synthetic fixtures.
- This is a DISTINCT public-snapshot research candidate. The private legacy Shiller SHA256 0cdb8a04bd14d104e53acbb982cf205eb4733371bb9140191b8c4b6e433bc55d was NOT matched; do not automatically switch the canonical source.
- Public redistributor metadata does not independently prove upstream Shiller or S&P series licensing. No source raw rows or keys are saved to this GitHub branch.
- Historical roll windows are highly overlapping, select from a limited market era, and cannot be converted into future probabilities.

The next canonical-data gate is still: durable encrypted-archive and owner-held RSA-key backup; private source restoration; old-Shiller exact snapshot or reviewed ADR; Fed/Japan CPI origin SHA and monthly normalization parity; then private JPY rolling QA.

DO NOT modify main, production, frozen acquisition registry or DWZ PR #70 as part of this research.
