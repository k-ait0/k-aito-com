# K. Aito Analytics / FINOWA — Portfolio Core v0.6

**2026-11-11 JST | RESEARCH_ONLY_HOLD | NOT_APPROVED_FOR_PRODUCTION**

## Architecture

- `lib/analytics/portfolio-core.cjs`: 1–12 asset classes, JPY-denominated integer monthly ledger, deterministic contribution/withdrawal allocation, per-asset return, rebalancing. Browser-independent, no I/O, no market acquisition.
- `lib/analytics/portfolio-compare.cjs`: 2–8 scenarios sharing one EXACT monthly market path. Portfolio weights, starting holdings, contributions, withdrawals, and rebalance policies can differ.
- This branch is a proof of arithmetic, not a finished financial calculator. The simulation does **not** implement taxes, transaction costs, financing, currency conversion, account restrictions, dividends split from total return, pension, or real portfolio data certification.

## Inputs

```js
const {simulatePortfolio}=require('./lib/analytics/portfolio-core.cjs');
const result=simulatePortfolio({
  initial_holdings_yen:{STOCK:6000000,BOND:3000000,GOLD:1000000},
  target_weights:{STOCK:0.6,BOND:0.3,GOLD:0.1},
  monthly_contribution_yen:0,
  monthly_withdrawal_yen:100000,
  rebalance:{mode:'PERIODIC',interval_months:12},
  market_mode:'SYNTHETIC_DEMO',
  monthly_returns:[{month:'2026-01',origin:'SYNTHETIC',asset_returns:{STOCK:0.02,BOND:0.01,GOLD:0.03}}]
});
```

- Asset IDs are ASCII uppercase (`[A-Z][A-Z0-9_]{0,31}`), 1–12 unique keys; holdings and cashflows are exact integer yen, limited to 1 trillion yen per input/portfolio aggregate to preserve deterministic precision. Target weights must sum to 1 within 1e-10.
- Monthly market path must be complete and chronological, 1–1,200 consecutive months; every asset must have a return for every month. No missing fill, interpolation, proxy or estimated row is accepted. Observed inputs are **research-only** and are NOT rights-verified by this function. No official or user portfolio series is bundled.
- All `asset_returns` are gross nominal returns already expressed in **JPY**. For foreign assets, upstream FX conversion is required; passing USD returns directly as JPY is a contract violation not automatically detectable from numeric values. Upstream adapter must verify currency, total-return definition, license and source lineage.

## Calculation timing

1. Opening per-asset holdings.
2. New contributions distributed by **target weights** using largest-remainder integer apportionment; ties break by asset ID.
3. Withdrawals paid pro-rata from actual available holdings; if insufficient, partial withdrawal and `unfunded_yen` recorded. Assets never become negative.
4. Monthly returns applied to each asset **separately** with `Math.round` per asset in integer yen. Negative 100% is permitted; lower returns and non-finite inputs are rejected.
5. At month end, apply optional rebalance and record one-way turnover (sum of purchase amounts), without transaction costs. Rebalance preserves pre-rebalance gross total.

Rebalance modes: `NONE`, `PERIODIC` every `interval_months` from the start of the analysis (first rebalance at month N), or `THRESHOLD` when **any** absolute weight deviation strictly exceeds `threshold` (e.g. 0.05 = 5 percentage points) at month end. Rebalance is to the fixed targets, not adaptive risk control. With zero portfolio value, no assets are manufactured.

## Comparative interpretation

Comparison engine is a **controlled** comparison: one identical market path for all strategies; allocation, payments and rebalancing can differ. The label `CASHFLOWS_ALLOCATION_AND_REBALANCING_JOINTLY` does not claim to decompose those changes into independent effects. Do not call a historical funded fraction a future probability.

## Verification and delivery gates

```bash
node --test scripts/test-analytics-portfolio*.cjs
node --test scripts/test-analytics-*.cjs
```

- Next: connect portfolio Core to lifecycle and rolling adapters **only after** timing/rounding contracts have been reconciled and tested. Add CPI/JPY FX/unit and provenance gates to data adapter; do not silently substitute data providers.
- After arithmetic approval, add user-facing dashboards with research/warning labels, then true HTTPS-origin, iPad Safari and numeric golden tests. No live deployment, PR #70 merge, or access to user investment data in this version.
