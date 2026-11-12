# K. Aito Analytics v0.18 — Encrypted backup bridge

Offline ciphertext-only transfer of the existing five-artifact owner backup archive to the v0.11 restoration CLI. It never reads a private key, decrypts, downloads or publishes any market observations.

```sh
node --test scripts/test-analytics-*.cjs
node scripts/stage-analytics-private-backup-v18.cjs --backup-zip /ABS/OWNER/Encrypted_Backup.zip --inspect-only
node scripts/stage-analytics-private-backup-v18.cjs --backup-zip /ABS/OWNER/Encrypted_Backup.zip --out-dir /ABS/PRIVATE/STAGE
```

All 553/553 automated tests PASS locally. The **real encrypted backup ZIP** was also staged and re-audited 5/5 using the v0.11 encrypted archive verifier. This is NOT real market data analysis, not a claim of durable owner backup, and not publication permission. See `docs/ANALYTICS_PRIVATE_BACKUP_TO_RESTORE_V0_18.md` for the Windows local next steps and remaining Shiller/private-key blockers.
