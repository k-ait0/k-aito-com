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

## 6. Actual official-source acquisition result (2026-11-13 UTC)

The branch-scoped workflow **ran successfully** on GitHub Actions: https://github.com/k-ait0/k-aito-com/actions/runs/43427925063 . Run 43427925063, job 131893853150, fetched from the fixed Statistics Bureau HTTPS URL and produced one encrypted artifact, ID 14037218574. The job succeeded at its pinned `curl` download, local byte checks, RSA-3072/AES-256-GCM encryption, and encrypted-only artifact upload steps.

- Acquired original bytes: **167,310**; detected `shift_jis` text encoding and 28 physical lines; year-month tokens include `202501`, `202607`, `202608`, `202609`. The file's complete column layout **has not been authenticated or decoded**.
- Actual original source SHA-256: `c5893ac45a0f124277d92c2ec286451be15ce0b7d5bbc84152e4f4226cedbce2`.
- Capture time UTC: `2026-11-13T12:45:57.422Z`.
- Encrypted artifact ZIP SHA-256: `d65dab15b874f01c0980f001899e4327058d82128c97f698b02ad1a94e7750cb`; ZIP size 169,555 bytes; one encrypted JSON member, uncompressed 224,944 bytes. Local ZIP CRC test **PASS** and metadata/source digest agree with job logs.
- Artifact expiry: `2026-11-18T12:45:57Z` (**2026-11-18 21:45:57 JST**). Copy the encrypted ZIP to durable user-managed storage; existing older encrypted evidence artifacts also expire on Nov 18 and are separate.

These are externally acquired **real source bytes and an authenticated encrypted archive**, but only the captured file metadata—not its plaintext values—was inspected here. The official file's XLS/CSV column mapping, rounded headline, independent source-provider content hash and historical as-of release vintages are **NOT** verified. Do not mislabel the latest 2025-base 3dp reference CSV as a reconstruction of past publication-time levels.

### Local offline restoration (user-controlled private key only)

1. Download `K_Aito_Analytics_CPI_2025_3DP_Encrypted_20261113.zip` to a safe directory, and expand the single `.encrypted.json` file using Windows Explorer, or `tar -xf ...`.
2. Use the owner-held original RSA private key **on the owner's PC only**. Never upload the key to GitHub/ChatGPT.
3. In the v0.30 checkout:

```powershell
node scripts/restore-analytics-cpi-reference-v30.cjs `
  --encrypted-json 'C:\AnalyticsPrivate\JP_CPI_2025_3DP_REFERENCE_CANDIDATE_c5893ac45a0f1242.encrypted.json' `
  --private-key 'C:\AnalyticsPrivate\owner_rsa_private.pem' `
  --out-dir 'C:\AnalyticsPrivate\RestoredCpiReference'
```

The CLI requires a PKCS#8 PEM or equivalent Node.js-supported unencrypted private key, strictly verifies the corresponding public SPKI fingerprint, authenticated encryption tag, actual pinned SHA-256 and CSV plausibility, and writes the original bytes with exclusive creation. It never prints raw CPI levels or key material. **Success only establishes locally restored original bytes—not historical-vintage certification.**
