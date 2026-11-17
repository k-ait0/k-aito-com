# K. Aito Analytics v0.31 — encrypted evidence retention and release gates (2026-11-18 JST)

**Research only. No production/data-source acceptance.**

## Verified local retention evidence

Six encrypted source archives are present in two pre-existing ZIP backups; both ZIPs and all five nested legacy ZIPs passed CRC. SHA-256, archive format, and encrypted ciphertext checks were performed offline without any RSA private key. The encrypted archive, private plaintext and owner key have **NOT** been committed to GitHub.

| Backup ZIP | Bytes | SHA-256 |
|---|---:|---|
| K_Aito_Analytics_Encrypted_Evidence_Backup_20261112.zip (5 encrypted items) | 2,851,125 | `74a2ae337f83f591b505a97b9deb643f226df0a39767449118117caeb2beabeb` |
| K_Aito_Analytics_CPI_2025_3DP_Encrypted_20261113.zip (1 encrypted item) | 169,555 | `d65dab15b874f01c0980f001899e4327058d82128c97f698b02ad1a94e7750cb` |

The **combined user-download archive** `K_Aito_Analytics_Encrypted_Retention_v031_20261118.zip` is 3,062,151 bytes with SHA-256 `7c42e35cd31660c15a72b0714682b1f90d5468bbf7d0fbb9bad7e1e82c44a842`. This bundle is shared as a conversation artifact, **not committed to GitHub**. It includes the original encrypted ZIPs, manifest, offline Windows PowerShell and Python integrity checkers, a Japanese README and verification results. An unmodified copy must be saved by the owner to user-controlled durable storage; this **has not been confirmed**. Do not assume a ChatGPT sandbox link or a GitHub Actions artifact is permanent storage.

## Independent verification

- The v0.30 extracted research suite was rerun under Node 22.16.0: **899/899 tests PASS**.
- The new backup checker passed normal verification and failed as intended when (1) an encrypted ZIP byte was changed and (2) the encrypted ZIP was deleted.
- The copied archive was independently extracted into a fresh temporary directory and the checker passed for all six encrypted payloads.
- The CPI source snapshot was acquired by GitHub Actions run 43427925063 and remains **a latest/reference dataset, NOT original historical-vintage CPI releases**.
- The new CPI encrypted Actions artifact 14037218574 has recorded expiry `2026-11-18T12:45:57Z` (2026-11-18 21:45:57 JST). Older artifacts also have finite retention. A local encrypted copy does not extend GitHub retention.

## Acceptance gates — do not bypass

1. **PASS**: Six encrypted archives are present and integrity checked in the assistant workspace.
2. **UNCONFIRMED**: Owner has copied the combined backup into two durable locations and verified SHA-256.
3. **BLOCKED**: Owner-local RSA private-key decryption, GCM authentication and decrypted raw hashes. **Never upload the private key to chat or GitHub.**
4. **BLOCKED**: Independently parse 2025-base 3dp reference CPI CSV. Historical publication vintages must be acquired separately.
5. **BLOCKED**: Privately validate Fed/JP CPI and the legacy exact SHA-pinned Shiller source; Fed long history remains an unapproved candidate.
6. **BLOCKED**: Paired JPY nominal and Japan-CPI-adjusted withdrawal QA using only verified eligible source data.
7. **NOT COMPLETE**: UI integration and manual browser acceptance.
8. **NOT APPROVED**: Production deployment and licensing/rights review.

A verified ZIP/checksum is not equivalent to source provenance authentication, correct financial input calculations, or production readiness. Preserve the existing source registry and v0.30 source locks.

**Safety:** no changes to main, public production deployment, or Draft DWZ PR #70 as part of this v0.31 retention work.
