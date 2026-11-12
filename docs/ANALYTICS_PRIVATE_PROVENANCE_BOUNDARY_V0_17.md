# Analytics v0.17 — Private observed-provenance boundary audit

**2026-11-12 JST. Research only; no production authorization.**

## Confirmed defect

The v0.16 `preparePrivateMonthlyMarket` used `proxy === true` and `estimated === true` checks. In a reproduced Node 22 test, a source with `metadata.proxy: "yes"` and an observed row with `estimated: 1` was accepted, while the emitted `market_rows` was marked `origin: "OBSERVED"` without either flag. This is provenance laundering across the source-to-portfolio handoff. The reproduction used synthetic data, not a real publisher dataset.

## Correction

- Require metadata/row `proxy` and `estimated` to be absent or exactly boolean `false`; reject all other values, including truthy strings, numeric values, null and present undefined.
- Reject unexpected keys in the outer series, source metadata and every monthly observation, so aliases such as `interpolated` cannot be silently stripped.
- Inspect every original row *before* intersecting asset months, including rows outside the final common history.
- Reject duplicate `asset_id` entries in the canonical registry instead of silently choosing the last one.
- Expose `provenance_schema_enforced: true`, and retain `upstream_claims_verified_here: false`, `publication_approved: false` and `source_rights_approved: false`.

## Verification

Run `node --test scripts/test-analytics-*.cjs` on Node.js 22.

- Before patch: 520/520 prior tests passed; the newly reproduced bypass was not covered.
- After patch: **537/537 passed**, consisting of the 520 existing and 17 new cases.
- New cases test flag types, unknown fields, source-registry duplication, non-overlapping tainted rows, normal multi-asset alignment, rolling/plan comparison, and input immutability.
- No decrypted or original actual Shiller/Fed/e-Stat observations were used for the new QA; this is an **input integrity** gate, not publisher authentication.

## Remaining blocking work

1. Confirm durable user-owned storage for the five encrypted evidence ZIPs and separately protect the RSA decryption key. GitHub Actions artifacts are listed to expire on 2026-11-18 JST.
2. Run private restoration and v0.10/v0.12 original-byte hash and independent normalization parity with the owner-held key. Supply the separately stored Shiller original.
3. Only then execute observed rolling comparisons. Locked H.10 2000+ plus Shiller ending 2023 yields zero 30-year complete historical windows; Fed DDP extension is a separate unapproved ADR.
4. Keep `main`, PR #70, the analytics-historical source registry, the public website and iPad UAT unchanged.

This change does not establish market-data resale rights, historical provider authenticity, or a future success probability.
