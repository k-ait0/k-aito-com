# K. Aito Analytics | CPI-linked living expenses v0.13

2026-11-12 (JST) | RESEARCH_ONLY_HOLD | NOT PRODUCTION APPROVED

## Objective

The original v0.7-v0.12 monthly cashflow engine increases living expenses using an assumed fixed annual inflation rate. v0.13 adds a SEPARATE, explicitly selected path for historical Japanese CPI-linked living expenses. Existing engines and output remain unchanged.

New modules:
- lib/analytics/rolling-portfolio-cpi.cjs: rolling multi-asset nominal JPY portfolio accounting with CPI-indexed living expenses and separate CPI/market exclusions.
- lib/analytics/private-cpi-rolling-research.cjs: apply only after six original and canonical files pass v0.10 pinned-byte QA and independent Fed/e-Stat normalization parity.
- scripts/run-analytics-private-cpi-rolling-v13.cjs: private command to read an already approved v0.12 handoff directory, check source registry Git blob and byte receipts, run v0.13 and write aggregate-only local report.
- Two new test files with 40 additional assertions.

## Financial contract

For start month s and simulation month t:

living expense (JPY, nominal) = Math.round(initial living expense * JP_CPI[t] / JP_CPI[s])

The model runs the cashflow in this order: month-start contributions / pension / one-time income, then living expense / one-time expense, then asset-specific nominal JPY market returns, then rebalancing. One-time expenses, fixed pensions, and contributions are not automatically CPI-indexed. The CPI denominator resets at each start-month of the rolling test. The model makes no forecasts.

Japanese nationwide headline CPI in original NSA, officially linked 2025=100 index from e-Stat is the ONLY supported observed inflation series. Exclude CPI gaps rather than forward-fill or treat them as portfolio failures. Market gaps and CPI gaps have separate exclusion counters. Historical funded fractions represent overlapping rolling start windows and are NEVER independent samples or future probabilities.

Do NOT pass CPI-deflated real investment returns to the nominal portfolio engine. Reject cashflow_plan.annual_expense_inflation whenever historical CPI mode is selected; even annual rate 0 is rejected to avoid silent model switching. US CPI, ex-imputed-rent Japanese CPI, forecast/proxy origins, and unapproved acquisition-source substitutions are prohibited.

## Source, currency and rights

- Shiller legacy is explicitly APPROXIMATE USD equity research, NOT the official S&P 500 Total Return index.
- Fed original active H.10 series is JPY per USD, fixed historical channel since 2000; the 1971 DDP candidate remains unapproved.
- Japanese CPI is a positive price LEVEL rather than investment total return.
- Raw and canonical source bytes, SHA-256, monthly value parity and provider IDs must pass v0.10 before v0.13 private research is permitted.
- The source origin reported by individual arrays is USER-ASSERTED until the upstream byte and normalization checks pass. Private use or a valid checksum is not a commercial publishing license.
- Portfolio assumptions do NOT incorporate taxes, fees, account restrictions, independent future uncertainty or certified commercial index distribution rights.

## How to run after secure private recovery

Only on a user-controlled computer with Node.js 22 and a completed v0.12 private handoff. All source and result files must be outside any public Git checkout. Never provide RSA private keys to ChatGPT, GitHub or a hosted site.

Sample private plan JSON:

{
  "portfolio": {
    "initial_holdings_yen": {"US_EQUITY": 10000000},
    "target_weights": {"US_EQUITY": 1},
    "rebalance": {"mode": "NONE"}
  },
  "cashflow_plan": {
    "monthly_contribution_yen": 0,
    "monthly_withdrawal_yen": 120000,
    "relative_pension_schedule": [{"id": "p", "start_offset_months": 60, "monthly_yen": 80000}],
    "relative_one_time_events": [{"id": "repair", "offset_months": 30, "kind": "EXPENSE", "amount_yen": 500000}]
  },
  "horizons_months": [120, 240, 360]
}

Example command:

node scripts/run-analytics-private-cpi-rolling-v13.cjs --handoff-dir /ABS/PRIVATE/handoff/analytics_private_handoff_v12 --registry /ABS/PRIVATE/source_registry.v0.2.json --plan /ABS/PRIVATE/cpi_plan_v13.json --out-dir /ABS/PRIVATE/reports

This is a DEMO PLAN, not a projection of the user's real pension or expenses. Output JSON is private, owner-readable only, new-file-only, and contains aggregated results without individual original source observations.

## Verification status

Node.js 22.16.0 local test execution: 409/409 PASS (previous 369 + 25 CPI arithmetic tests + 15 private-source integration tests). All 40 new tests use synthetic inputs and simulated original-byte fixtures.

NOT YET DONE: decrypt user's original ciphertext with their RSA private key; recover original Shiller research CSV; obtain/verify Fed canonical CSV from original raw; conduct actual observed 10-/20-year portfolios; verify index licenses; iPad Safari and deployment tests. Current historical pinned sources provide at most 281 overlapping nominal JPY months: 30-year rolling tests still have ZERO possible starts. Theory is not actual result.

The GitHub Actions ciphertext has an expiry date of 2026-11-18. A ChatGPT conversation attachment does NOT prove a durable user-owned backup exists. Preserve ciphertext separately from the private key.

No changes to main, Xserver, FINOWA production, DWZ Draft PR #70, or the data team's acquisition/source registry and the unapproved Fed ADR. User-facing preview remains postponed.
