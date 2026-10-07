# KIDP-004 駅生活圏シミュレーター — P0 User Test Plan

Status: TEST PREPARED / NOT YET RUN

## Test question

同じ「駅徒歩8分」でも、生活パターンと日常動線を見せることで、
ユーザーは自分に合うエリアをより具体的に判断できるか。

## Participants

初回5〜10人。
できれば:
- 賃貸探し経験あり
- 引越し経験あり
- 通勤型
- Hybrid / 在宅型
- 夜型

を混ぜる。

## Start script

「全部“駅徒歩8分”の架空エリアです。普段の生活に近いパターンを選んで、どこが暮らしやすそうか見てください。」

実在駅データではないことを明示。

## Metrics

### M1 — Problem understanding
「駅徒歩だけでは足りない理由」をテスト後に説明できる。
Target: 80%以上

### M2 — Lifestyle sensitivity
Lifestyleを変えるとBest Areaが変わる意味を理解する。
Target: 70%以上

### M3 — Use intent
実際の部屋探しでこのような比較を使いたい。
Target: 60%以上

### M4 — Score misread
Daily Frictionを不動産価値・治安・総合住みやすさの客観点数だと思う。
Failure threshold: 30%以上

## Post-test questions

1. 「3つのエリアは何が違うと思いましたか？」
2. 「駅徒歩8分という情報だけと比べて、何が分かりましたか？」
3. 「Lifestyleを変えるとおすすめが変わるのは自然でしたか？」
4. 「Daily Frictionは何の点数だと思いましたか？」
5. 「実際の部屋探しなら、どんな情報を追加してほしいですか？」
6. 「実在駅で使えるなら使いたいですか？」

## Decision

### P1 GO
M1 >= 80%
M2 >= 70%
M3 >= 60%
M4 < 30%

→ Station Master / POI / route dataへ接続。

### EXPLANATION REDESIGN
M1 < 80%
→ 生活動線という概念の見せ方を修正。

### MODEL REDESIGN
M2 < 70%
→ Lifestyle差が十分に表現できていない。

### POSITIONING REDESIGN
M4 >= 30%
→ Daily Frictionが客観的な街スコアに見えている。

### STOP
M3 < 40%
→ 物件探索の意思決定補助としての価値が弱い。
