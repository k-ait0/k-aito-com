# Analytics v0.30 — official CPI 2025-reference encrypted capture

Local, private, research-only data acquisition and protection. Designed for the Statistics Bureau's pinned 3-decimal national CPI CSV. Workflow on a separate branch attempts to acquire the official file, reports safe source metadata, and stores **only AES-256-GCM + RSA-3072 wrapped encrypted** original bytes as a short-lived artifact. The private RSA key never enters GitHub or ChatGPT.

Current result: official URL verified; container download blocked. 881/881 Node tests PASS (21 newly added). **Official CSV source bytes, SHA-256 and actual column layout remain unverified until remote workflow succeeds.** A captured latest reference file is not historical publication vintage data, and it must not automatically be used for as-of CPI backtests.

See `docs/ANALYTICS_CPI_OFFICIAL_REFERENCE_CAPTURE_V0_30.md` for source, workflow, Windows instructions and strict remaining gates. No production or user-managed private archive changes.
