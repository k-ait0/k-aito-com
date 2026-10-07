# KIDP Test Portfolio — 2026-10-08

Status: ACTIVE
Purpose: 新規KIDPを増やす前に、既存6案件のTest Loopを閉じる。

## 原則

- 実行順 ≠ 案件価値。
- Prototypeがあるだけでは次フェーズへ進めない。
- P1は各案件の事前固定Gateを満たした場合のみ着手する。
- 同じ参加者に複数KIDPを連続で触らせる場合、順序効果が強くなるため原則1セッション1案件。
- Sample data / QA dataは実ユーザー結果として扱わない。
- 5人未満は初回意思決定に使わない。
- KIDP-001は4人同時のPhysical sessionを確保できた時点で実行順#1へ繰り上げる。

## Recommended execution order

### #1 — KIDP-004 駅生活圏シミュレーター
Lane: RUN NOW
Participants: 5–10
Mode: Remote / facilitated
Tooling: Instrumented + Test Review READY

Why now:
- 一般ユーザーを集めやすい。
- P0の問いが単純で、短時間で成立性を確認できる。
- GOならStation Master / POI / route data接続へ進めるため、次工程が明確。
- 失敗時もExplanation / Model / Positioningのどこを直すかが分かれている。

Next action:
P01〜P05で初回判定。

### #2 — KIDP-003 LIFE DESIGN LAB
Lane: RUN NOW
Participants: 5–10
Mode: Remote / facilitated
Tooling: Instrumented + Test Review READY

Why now:
- 専門参加者が不要。
- 20-card Swipeの完了率・結果共感・Deep-dive意向を短時間で測れる。
- GOならTheme Discovery / Deep Swipeへ進める。

Next action:
P01〜P05で初回判定。

### #3 — KIDP-002 WHYNOT
Lane: RUN NEXT
Participants: 5–10
Mode: Remote / facilitated
Tooling: Instrumented + Test Review READY

Why now:
- Problem DBは今後のBuild Queue供給源になり、KIDP全体への波及が大きい。
- 003〜006と同形式の計測・Review Toolへ標準化済み。
- Problem DBがKIDP全体のBuild Queue供給源として機能するかを次に確認する。

Next action:
P01〜P05で「3件以上見る / SAMEを押す / 自分のProblemを投稿したい」を検証。

### #4 — KIDP-006 空きビル変身シミュレーター
Lane: RECRUIT MIX
Participants: 5–10
Mode: Remote / facilitated
Tooling: Instrumented + Test Review READY

Why later:
- Toolingは完了している。
- 一般ユーザーだけでは、法令・工事・投資価値との誤読を十分検出しにくい。
- 不動産・建築・店舗運営経験者を一部混ぜたい。

Recruit mix:
- 2–3人: 不動産 / 建築 / 店舗・オフィス運営経験
- 2–4人: 非専門ユーザー

Next action:
参加者Mix確保後P01〜P05。

### #5 — KIDP-005 Board Game Balancer
Lane: RECRUIT MIX
Participants: 5–10
Mode: Remote / facilitated
Tooling: Instrumented + Test Review READY

Why later:
- Toolingは完了。
- 「Simulation ≠ fun / answer」を評価するには、ゲーム制作またはボードゲーム経験者を混ぜた方が信号が強い。
- 非制作ユーザーだけではUse Intentの意味が薄くなる。

Recruit mix:
- 2–3人: 自作ゲーム / 数値調整経験
- 2–4人: ボードゲーム利用者

Next action:
参加者Mix確保後P01〜P05。

### #6 — KIDP-001 Project GIVE
Lane: SCHEDULE PHYSICAL
Participants: 4
Mode: In-person physical playtest
Tooling: Board game v0.4 / 6 Rounds

Why last in default queue:
- 案件価値が低いからではない。
- 4人同時・Physical sessionという実行制約が最も大きい。
- Remote digital testsと同じ流れでは消化できない。

Jump rule:
4人＋実施時間を確保できたら、その週の#1へ繰り上げる。

Test:
- 4 players
- 6 rounds
- Self Use vs Giveで迷うか
- Credit / Contribution / Access Marketが処理負荷にならないか
- 実測のみ記録する

## Execution waves

### Wave A — Close easy digital loops
1. KIDP-004
2. KIDP-003

Goal:
合計10件程度の初回ユーザーデータを得て、少なくとも2案件のP1/Redesign判断を出す。

### Wave B — Portfolio feeder
3. KIDP-002

Goal:
WHYNOTを単体サービスではなく、KIDPのProblem supply layerとして成立させられるか判定。

### Wave C — Domain-sensitive tools
4. KIDP-006
5. KIDP-005

Goal:
専門性がある参加者を混ぜ、誤読とUse Intentを確認。

### Wave D — Physical session
6. KIDP-001

Goal:
v0.4のゲームメカニクスを実測で壊す。

## Weekly operating rule

- Active Testは同時最大2案件。
- P1 Buildは同時最大1案件。
- Test結果が出るまで、その案件に新機能を追加しない。
- Redesign判定なら該当箇所だけ修正し、同一指標で再Test。
- STOP判定は無理に救済せず、REFERENCE / INTERNAL TOOLへ移す。
- 新規KIDP-007以降は、原則として既存案件2件以上の意思決定が完了してから着手。

## Current lanes

| KIDP | Project | Lane | Test ready | Participant constraint | Immediate action |
|---|---|---|---|---|---|
| 004 | 駅生活圏 | RUN NOW | YES | Low | P01–P05 |
| 003 | LIFE DESIGN LAB | RUN NOW | YES | Low | P01–P05 |
| 002 | WHYNOT | RUN NEXT | YES | Low | P01–P05 |
| 006 | 空きビル変身 | RECRUIT MIX | YES | Medium | Recruit domain mix |
| 005 | Board Game Balancer | RECRUIT MIX | YES | Medium | Recruit game mix |
| 001 | Project GIVE | SCHEDULE PHYSICAL | YES | High | Book 4-player session |
