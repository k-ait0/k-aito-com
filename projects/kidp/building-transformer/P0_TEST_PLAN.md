# KIDP-006 空きビル変身シミュレーター — P0 User Test Plan

Status: TEST PREPARED / NOT YET RUN

## Test question

物件条件 → 用途候補 → Conversion Friction → Adaptation Path
という流れで、
「用途を決めてから物件を見る」以外の考え方が伝わるか。

## Participants

初回5〜10人。

可能なら:
- 不動産・建築経験あり
- 店舗 / オフィス運営経験あり
- 空き物件活用に関心あり
- 専門知識なし

を混ぜる。

## Start script

「架空の空きフロア条件を変えて、どの用途なら無理が少なそうかを見る試作品です。自由に触ってください。」

Conversion Frictionの意味は先に説明しすぎない。

## Tasks

1. OFFICE SHELLを見る
2. 1つ以上条件を変更
3. Candidate順位の変化を見る
4. STREET FLOOR / UPPER FLOORを試す
5. 1用途のAdaptation Pathを見る

## Metrics

### M1 — Positioning understanding
Conversion Frictionが収益性・投資価値ランキングではないと理解する。
Target: 80%以上

### M2 — Condition causality
条件変更で候補順位が変わる理由を1つ以上説明できる。
Target: 70%以上

### M3 — Use intent
空き物件の初期検討で使いたい。
Target: 60%以上

### M4 — Verdict misread
法令適合・工事費・用途変更可否の確定判定だと思う。
Failure threshold: 30%以上

### M5 — Unknown recognition
実物件で追加確認すべき未知条件を1つ以上挙げられる。
Target: 70%以上

## Decision

### P1 GO
M1 >= 80%
M2 >= 70%
M3 >= 60%
M4 < 30%
M5 >= 70%

### POSITIONING REDESIGN
M1 < 80% or M4 >= 30%

### MODEL REDESIGN
M2 < 70%

### OUTPUT REDESIGN
M5 < 70%

### STOP
M3 < 40%

## P1

GOなら:
- actual building input schema
- code / fire / use-change checklist as separate layer
- rough capex bands
- rent / revenue scenario as separate layer
- reusable property comparison

P0結果を投資判断には使わない。
