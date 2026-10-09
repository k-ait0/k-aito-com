# KIDP Wave A — Recruitment & Session Kit
Date: 2026-10-08
Status: READY TO RECRUIT / ZERO REAL PARTICIPANTS CONFIRMED

## Scope and capacity
Active: KIDP-004 Station Life (5 valid sessions), KIDP-003 LIFE DESIGN LAB (5 valid sessions).
Next: KIDP-002 WHYNOT, only after one active project has a decision.
Do not imply 10 distinct people are necessary: a participant may test both in separate sessions, but responses must not be represented as independent samples.

## Recruitment channels (manual outreach; no messages have been sent)
1. Personal acquaintances who have searched for housing or compared stations recently: prioritize KIDP-004.
2. Acquaintances considering hobbies, career paths, or life goals: prioritize KIDP-003.
3. Neutral participants with no project background: reserve at least 2 of 5 per project to test comprehension without coaching.
Avoid recruiting only domain enthusiasts. Record channel and relationship to facilitator.

## Invite text (copy, customize)
「個人制作のWeb試作品について、10〜15分の操作テストに協力してもらえませんか。正解を探すテストではなく、画面が伝わるかを調べています。操作後に短い質問をします。回答は任意で、途中でやめても大丈夫です。興味があればURLと進め方を送ります。」

Do not promise rewards or anonymity without a concrete plan.

## Consent script
「これは試作品です。操作中の行動と感想を改善のため記録します。氏名は分析表に書かず参加者IDで管理します。記録してよいですか。いつでも中止できます。」
Do not record video, audio, or personal information without separate consent.

## 15-minute facilitated session
00:00–01:00 — Consent and neutral context
01:00–02:00 — Read only the standard opening script
02:00–10:00 — Unassisted exploration; do not teach target actions
10:00–13:00 — Ask what they thought the tool did, what was unclear, and what they would do next
13:00–15:00 — Export CSV/JSON, note verbatim quote, mark session DONE or INVALID

## Standard opener
「このWeb試作品を、普段使うサービスと同じように自由に触ってください。わかりにくい点があればそのまま声に出して構いません。」
Do not mention metric thresholds or tell the participant to reach a specific page.

## Allocation
Project 004: P01 P02 P03 P04 P05
Project 003: P01 P02 P03 P04 P05
Participant IDs are per-project. Each ID must be unique to an actual session.

## Operations
Dashboard: https://k-aito.com/projects/kidp/test-ops/
004 review: https://k-aito.com/projects/kidp/station-life/test-review/
003 review: https://k-aito.com/projects/kidp/life-design-lab/test-review/
002 review (not yet active): https://k-aito.com/projects/kidp/whynot/test-review/

1. Send invitation manually and confirm time.
2. Open correct Pxx link from Test Ops.
3. Complete session and export participant row.
4. Store exported rows securely outside browser localStorage; Test Ops local state is not a shared database.
5. Paste >=5 valid rows into each project's Review tool.
6. Save decision and observations; only then free a test slot.

## CSV recovery and validation (2026-10-09)

1. On the participant's device, copy the CSV row and archive it in a secure, external file. Use the corresponding `P0_TEST_LOG_TEMPLATE.csv` header.
2. On the **facilitator's Test Ops browser**, verify the saved row, check its CSV receipt, and only then change the participant status to DONE.
3. For invalid sessions, select INVALID instead. Never mark invalid or QA sessions as DONE.
4. Paste actual rows and the CSV header into each project's Review tool on the **same facilitator browser** as Test Ops. Duplicate IDs/incorrect row lengths are rejected; INVALID and unverified sessions do not contribute to the decision.
5. If Review reports an unverified ID, reconcile the associated Test Ops status/receipt before interpreting the metrics. Different browsers do not synchronize localStorage.
6. Use a manually saved and reviewed TEST_SUMMARY plus the archived CSV as the record of decision. Do not treat the dashboard count alone as proof of evidence collection.

## Quality and safeguards
- Sample data in Review is QA-only, never real research evidence.
- DONE means a valid completed session with exported row; INVALID is excluded from denominator.
- Don't change P0 thresholds after seeing outcomes.
- Record source, date, device, and whether participant knows the concept.
- Never infer market demand or TAM from five usability tests.
- If no one agrees, revise invitation/channel, not prototype features.
- No automatic external recruitment or messaging is configured.
