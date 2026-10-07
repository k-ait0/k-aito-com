# KIDP-005 Board Game Balancer — P0 Specification

Status: PROTOTYPE P0
Build Score: 85 / 100
Scope: Tune 3 strategy parameters → run deterministic simulation → inspect dominance

## Problem

ボードゲームの調整では、
「このカードを1点上げたら強すぎるか」
「この戦略だけが最適解になっていないか」
を、人手のプレイテストだけで確認すると時間がかかる。

一方で、シミュレーションだけで「面白いゲーム」を決めることもできない。

必要なのは、
**設計者が数値変更の影響を素早く見るための補助線**。

## P0 hypothesis

3つの戦略の数値を少し変えたとき、
勝率差・Head-to-Head・Balance Signalを即時に見せることで、
「どこから実プレイテストすべきか」を判断しやすくなるのではないか。

## Demo game

架空ゲーム "Guild Race"。
6 Roundで最終Scoreを競う。

### RUSH
序盤から直接得点。
Parameter: Instant Points

### ENGINE
序盤は弱いがRoundごとに伸びる。
Parameter: Growth / Round

### CONTROL
相手の得点を削る。
Parameter: Disruption

P0では各戦略を純粋戦略として比較する。
実際のカード混成、手札、読み合い、相互作用はP1以降。

## Simulation

- 3 Strategy
- 6 Rounds
- seeded pseudo-random noise
- 5000 matches / run
- same seed for same config
- result is deterministic for comparison

Output:
- Overall win rate
- Head-to-Head matrix
- Score spread
- Dominant strategy
- Balance Signal

## Balance Signal

Objective quality scoreではない。

P0:
max win rate - min win rate

- <= 12 percentage points: BALANCED-ish
- 13–25: WATCH
- > 25: DOMINANT

"BALANCED-ish" は「面白い」「完成」を意味しない。

## P0 controls

- Rush Instant Points: 2.0–5.0 (baseline 3.7)
- Engine Growth / Round: 0.5–2.0 (baseline 1.3)
- Control Disruption: 0.0–3.0 (baseline 1.8)

Buttons:
- RESET
- BREAK IT
- RUN 5,000

RESET baselineは3戦略が概ね均衡するようP0モデル上で調整する。
BREAK ITは意図的にRushを強くし、dominant strategyを可視化できるかを見るデモ。

## P0 success

M1: 80%以上が、数値変更→勝率変化を説明できる
M2: 70%以上が、Balance Signalを「面白さ」ではなく偏り検知だと理解する
M3: 60%以上が、自分のゲーム調整で使いたいと言う
M4: 70%以上が、次に実プレイテストすべき戦略を1つ選べる

## Failure

- 数値を動かしても結果の意味が分からない
- 50%前後なら完成だと誤解される
- Simulationが実プレイテストの代替に見える
- 勝率だけでなく何を直すかのヒントが必要なのに出ない

## P1 gate

P0 GOなら:
- custom card / action definitions
- strategy mix
- parameter sensitivity scan
- automated break-point search
- CSV export
- Project GIVE board-game rulesetsへの適用

P0で作らない:
- AI automatic balancing
- game-theory optimal policy
- card-text semantic parsing
- multiplayer negotiation
- hidden information
- real Project GIVE test result
