# KIDP-005 Board Game Balancer — P0 User Test Plan

Status: TEST PREPARED / NOT YET RUN

## Test question

数値変更 → Simulation → 勝率偏り → 次のPlaytest対象
という流れを、ゲーム制作者が説明なしでも理解できるか。

## Participants

初回5〜10人。
可能なら:
- ボードゲームをよく遊ぶ
- 自作ゲーム経験あり
- 数値調整経験あり
- ゲーム制作経験なし

を混ぜる。

## Start script

「架空ゲームの3戦略の数値を動かして、どこから壊れるかを見る試作品です。自由に触ってください。」

Balance Signalの意味は先に説明しない。

## Tasks

1. RESET状態を見る
2. 1つ以上のsliderを動かす
3. RUNする
4. BREAK ITを押す
5. 「次に実プレイするなら何を見るか」を答える

## Metrics

### M1 — Parameter causality
数値変更が勝率へ影響することを説明できる。
Target: 80%以上

### M2 — Signal meaning
Balance Signalが「面白さ点数」ではなく偏り検知だと理解する。
Target: 70%以上

### M3 — Use intent
自作ゲームの数値調整で使いたい。
Target: 60%以上

### M4 — Playtest handoff
Simulation結果から次に実プレイで確認する戦略を1つ選べる。
Target: 70%以上

### M5 — Replacement misread
Simulationだけでバランス調整を完了できると思う。
Failure threshold: 30%以上

## Decision

### P1 GO
M1 >= 80%
M2 >= 70%
M3 >= 60%
M4 >= 70%
M5 < 30%

### EXPLANATION REDESIGN
M1 < 80%
→ parameter → outcomeの見せ方を修正。

### POSITIONING REDESIGN
M2 < 70% or M5 >= 30%
→ Simulation / Balance Signalの位置づけを修正。

### OUTPUT REDESIGN
M4 < 70%
→ 「次に何をPlaytestするか」の示唆を強化。

### STOP
M3 < 40%
→ 制作者向けツールとしての価値が弱い。

## P1

GOなら:
- custom action definitions
- sensitivity scan
- breakpoint search
- strategy mix
- Project GIVE board-game ruleset import

実際のProject GIVEのPlaytest結果は捏造せず、
物理Playtest後の実測値がある場合のみ比較する。
