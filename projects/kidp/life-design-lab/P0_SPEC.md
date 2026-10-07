# KIDP-003 LIFE DESIGN LAB — P0 Specification

Status: PROTOTYPE P0
Build Score: 89 / 100
Scope: Landing → Swipe → Interest Map

## Hypothesis

「人生の目標は何ですか？」と直接聞くより、
小さな「やってみたい / 少し気になる / 今は違う」を繰り返した方が、
本人が納得できる興味の方向性を見つけやすいのではないか。

## P0 screens

1. Landing
2. Swipe
3. Interest Map

P0ではAI Theme Discovery、Deep Swipe、Life Canvas、Experiment、16タイプ診断、
Mandala、Mind Mapは作らない。

## Responses

- WANT = +3
- MAYBE = +1
- PASS = 0

数値はユーザーには直接表示しない。

## Initial cards

20 cards.
P0では10カテゴリ×2枚に均等化する。

- Travel
- Business
- Freedom
- Study
- Technology
- Creative
- Living
- Nature
- City
- Work

1枚だけの反応で特定カテゴリが100%になることを避け、Interest Mapの比較条件を揃える。

## Result

全カテゴリ一覧ではなく上位5領域を表示。

結果コピーは断定しない。
「あなたは○○タイプ」ではなく、
「今の反応では○○への関心が強めです」とする。

## P0 success

- 20枚完了率 80%以上
- 結果に「少し分かる / 自分っぽい」70%以上
- もう少し深掘りしたい 60%以上

## P0 failure

- 10枚未満で離脱が多い
- WANT / MAYBE / PASSの違いが伝わらない
- 結果が性格診断に見える
- 結果が当たり障りなさすぎる
- カード文面が抽象的で選べない
