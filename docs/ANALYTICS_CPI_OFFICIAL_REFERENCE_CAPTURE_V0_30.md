# K. Aito Analytics | CPI 2025 3dp official reference CSV capture v0.30

**2026-11-13 JST — private research only; no main, DWZ, FINOWA, or production changes.**

## 1. Verified source locator, not verified source bytes

- The Statistics Bureau's 2025-base rebasing page links to the national 3-decimal reference CSV `https://www.stat.go.jp/data/cpi/2025/csv/zmi2025aa.csv` (the same official link checked through the web search tool).
- Landing page: `https://www.stat.go.jp/data/cpi/2025/sokyu.html`.
- The original binary CSV **could not be downloaded in the ChatGPT execution container due to DNS/network restrictions**. Therefore no actual official CSV SHA or column schema is asserted by this version.
- The file is a potentially *mutable, updated reference index export*. Capturing it now is NOT equivalent to obtaining each historical publication vintage. It must never be used to infer what was publicly known before capture time, especially before 2026-08-07 when 2025-base retrospective values were first published.
- The 3dp values are for calculation reference, and the Statistics Bureau says they do not represent increased underlying precision; official published indices and rates are at 1dp. Do not promise exact official MoM reconstruction from 3dp.

## 2. Acquisition and protection

GitHub branch: `analytics-cpi-reference-capture-v0-30-20261113`.

A branch-scoped workflow `.github/workflows/analytics-cpi-2025-reference-capture-v30.yml` automatically attempts ONE official HTTPS fetch when the workflow file is first pushed. It is also written to support `workflow_dispatch` if available in GitHub Actions (the workflow may need to exist on the default branch for manual dispatch, so branch-push is the primary trigger).

- Host/domain/path are pinned in the workflow and documented in the code, no alternative mirror/redirect. A connection failure, HTML error page or content mismatch stops the job; no fabricated data or silent fallbacks.
- This flow uses the *existing user-managed RSA-3072 public key*, exact PEM SHA-256 `bfe78c5a3684d8272a94d778d4d1c49b0ea56c4a9a03fdc5de42bcb437281e28`. The private key must **never** be put into GitHub, this chat or an artifact.
- Downloaded plaintext lives exclusively in the temporary GitHub Actions runner directory. An AES-256-GCM ciphertext and an RSA-OAEP-SHA256 wrapped random key are uploaded as an **encrypted** Actions artifact (`retention-days: 5`). No raw CSV is committed/uploaded.
- Only 1KiB-2MiB plausibility checks, UTF-8/Shift-JIS decoding, expected year-month anchors, ZIP/PDF/HTML/JSON/NUL rejection are done. **Column definitions and national headline CPI extraction are NOT yet authenticated.** The archive schema explicitly blocks historical as-of classification.
- The console summary reports only SHA-256, byte count, encoding and available year-month markers, without raw row values.
- GitHub artifact retention is short; copy the encrypted artifact to user-owned durable storage soon after acquisition. The previous unrelated research bundles' Nov 18 expiry is **not** extended by this workflow.

## 3. Run on a user's Windows PC when Actions cannot access source

Download the original official CSV in a browser from the pinned source URL; save outside the repository checkout, such as `C:\AnalyticsPrivate\Original\zmi2025aa.csv`. Run in the branch checkout:

```powershell
node scripts/capture-analytics-cpi-reference-v30.cjs `
  --input 'C:\AnalyticsPrivate\Original\zmi2025aa.csv' `
  --public-key 'C:\PATH_TO_CHECKOUT\research\analytics\bls_private_bundle_public_key_20261111.pem' `
  --out-dir 'C:\AnalyticsPrivate\EncryptedCpiCapture'
```

The script *cannot attest a locally supplied file's official origin*. Confirm you downloaded from the exact official URL over HTTPS; retain the source URL, acquisition timestamp and SHA. The script refuses to overwrite an existing encrypted archive and rejects output inside or over the repo checkout.

## 4. Required gates before using it in financial backtests

1. Acquire official original bytes, record SHA, byte count, retrieval time and source URL.
2. Inspect and version the **actual** official CSV column/header schema and select `全国・総合・2025年基準・指数`, keeping the source units and numeric accuracy. This version does not invent that schema.
3. Pin a locally verified raw source hash and add a second independent normalization verifier.
4. Keep historical published vintage records separate from a latest-file snapshot. Do **not** convert the 2025-base retrospective file into past public availability claims.
5. Existing v0.11–v0.12 historical Fed/eStat/Shiller private QA still needs the user-held RSA private key and correct original snapshots; this work is NOT a substitute.

## 5. Tests

`node --test scripts/test-analytics-*.cjs` — 881/881 PASS on Node.js v22.16.0 (v0.29: 860 plus v0.30: 21 new tests). Tested synthetic byte fixtures, local encryption round-trip with an ephemeral test RSA-3072 key, tamper rejection, hard-coded public key fingerprint, offline CLI and workflow path restrictions. **No official original CSV bytes were tested yet.**

Sources: https://www.stat.go.jp/data/cpi/2025/sokyu.html ; https://www.stat.go.jp/data/cpi/1.htm .
