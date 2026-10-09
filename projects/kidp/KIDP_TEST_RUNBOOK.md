# KIDP Test Ops Runbook — 2026-10-08

Status: ACTIVE
Purpose: KIDPのPrototypeを「作った」で止めず、事前固定Gateまで実ユーザーテストで閉じる。

## Current active slots

Active Testは同時最大2案件。

### SLOT A — KIDP-004 駅生活圏シミュレーター
Participants: P01–P05 first decision
Mode: Remote / facilitated
Review: /projects/kidp/station-life/test-review/

### SLOT B — KIDP-003 LIFE DESIGN LAB
Participants: P01–P05 first decision
Mode: Remote / facilitated
Review: /projects/kidp/life-design-lab/test-review/

## Next queue

### KIDP-002 WHYNOT
Start after either KIDP-004 or KIDP-003 reaches an initial decision.
Participants: P01–P05
Review: /projects/kidp/whynot/test-review/

## Parked / recruit-dependent

### KIDP-006 空きビル変身シミュレーター
Need mixed participant pool:
- 2–3: real estate / architecture / store-office operations
- 2–4: non-domain users

### KIDP-005 Board Game Balancer
Need mixed participant pool:
- 2–3: game design / balance adjustment
- 2–4: board-game users

### KIDP-001 Project GIVE
Physical session:
- 4 people
- 6 rounds
- jump to highest priority as soon as session can be booked

## Session rule

- One participant ID represents one actual participant in one project.
- Do not overwrite another participant's P01 etc.
- Do not use QA/sample rows as real observations.
- Prefer one project per participant session.
- If the same person tests multiple projects, separate sessions and avoid treating them as independent populations.
- Do not explain target metrics before exploration.
- Record verbatim first reactions where possible.
- Initial decision requires at least 5 valid participants.
- Invalid / interrupted sessions should be marked INVALID and excluded from decision data.

## Evidence and decision gate (Wave A integrity fix — 2026-10-09)

- For each Pxx, copy the participant's CSV row and save it **outside** the browser before marking DONE.
- In Test Ops, check **CSV row backed up (manual confirmation)** for that Pxx, then select DONE. Selecting DONE before confirmation is blocked.
- Unchecking the receipt after DONE automatically returns that participant to CONFIRMED.
- Marking INVALID clears the receipt, and INVALID participants are excluded from each Review tool's decision denominator.
- Review tools reject duplicate Pxx IDs and malformed CSV row widths.
- For **real** data, Review counts only participants marked DONE with CSV receipt in Test Ops **on the same browser origin**. Others are excluded as unverified; at least five verified, valid sessions are required.
- Test Ops and Review are localStorage-only and are **not shared databases**. Use one facilitator browser for marking status and reviewing data; export and securely back up participant CSV before closing any session.
- A receipt checkbox is operator attestation, **not a file-existence check**. Verify the backed-up file manually.
- The built-in 5-person sample is QA data. Its decisions are previews only; copying an official TEST_SUMMARY is blocked while the sample button's dataset is active.
- A negative opinion or misunderstanding is still valid evidence unless an actual INVALID condition applies.
- Decisions and gate thresholds remain unchanged. Use the original P0 test plans.

## Backup participant recovery — P06–P10

- The first five assigned sessions are P01–P05 per project. In Test Ops, expand **追加参加者 P06〜P10** when an INVALID / interrupted / withdrawn session leaves fewer than five valid cases.
- Assign each backup Pxx to a **different, real session**. Do not overwrite an invalid P05 with another person's data.
- The Review tool supports P01–P10 and checks the same Test Ops status/receipt on the facilitator browser. After e.g. P05 INVALID, valid P01–P04 + P06 is five; P05 remains excluded.
- A candidate screening ID such as A06 or B06 is **not** the P06 participant ID until that candidate actually accepts and is assigned it.
- Only the first 5 slots appear in the earlier printed QR handout. Use Test Ops' OPEN TEST link for P06–P10 when needed.
- Keep both QA/sample rows and unverified/invalid rows out of the actual decision denominator.

## Wave A sequence

1. Run KIDP-004 P01–P05.
2. Paste five CSV rows into KIDP-004 Review.
3. Save TEST_SUMMARY.md / decision.
4. Run KIDP-003 P01–P05.
5. Paste five CSV rows into KIDP-003 Review.
6. Save TEST_SUMMARY.md / decision.
7. At least one Active slot is now closed.
8. Move KIDP-002 WHYNOT into the freed Active slot.

## Decision discipline

- P1 GO → P1 Build may start, but only one P1 project at a time.
- REDESIGN → modify only the failed layer, then rerun the same metric.
- STOP → move to REFERENCE / INTERNAL TOOL without rescue-by-feature.
- MORE DATA → no product decision.
- HOLD / MIXED → collect more data before changing the prototype.

## Internal Test Ops

/projects/kidp/test-ops/

This page is noindex and stores facilitator progress only in the browser's localStorage.
