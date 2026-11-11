# Analytics v0.12 / Offline private evidence handoff

Research-only. Never upload private raw market data, reconstructed CSV, RSA private keys, or plaintext output to GitHub.

- `lib/analytics/restored-evidence-inventory.cjs`: acquisition-accurate e-Stat private path discovery fix.
- `lib/analytics/private-handoff-builder.cjs`: independently checks Fed daily/raw monthly parity and exact pinned canonical SHA; supplies six v0.10 source files only when all conditions pass.
- `scripts/prepare-analytics-private-handoff-v12.cjs`: `--inspect-only` and `--out-dir` explicit private handoff modes, optional research plan.
- `scripts/test-analytics-private-handoff-v12.cjs`: new validation and regression tests.
- `docs/ANALYTICS_PRIVATE_HANDOFF_V0_12.md`: full local-only operation contract.

Tests: `node --test scripts/test-analytics-*.cjs` (369/369 PASS on Node.js 22.16.0).
Actual encrypted ZIP archives: 5/5 PINNED SHA verified without decryption. Actual source values/portfolio historical model are not verified.
