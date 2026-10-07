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
