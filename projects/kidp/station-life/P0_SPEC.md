# KIDP-004 駅生活圏シミュレーター — P0 Specification

Status: PROTOTYPE P0
Build Score: 87 / 100
Scope: Lifestyle → 3 demo areas → One-day simulation

## Problem

賃貸・不動産情報では「駅徒歩8分」「スーパー徒歩5分」のように、
施設ごとの距離は分かる。

しかし実際の生活では、
- 通勤経路上にスーパーがあるか
- 夜遅くても買い物できるか
- 在宅勤務の日に近所で完結するか
- 坂・迂回・踏切などの摩擦があるか
- 平日と休日で使う方向が違うか

によって「暮らしやすさ」は変わる。

駅からの単純距離ではなく、
**日常行動の連続として街を比較したい。**

## P0 hypothesis

同じ「駅徒歩8分」の物件でも、
生活パターンを当てはめて1日の行動を見せると、
ユーザーは「自分ならどの街が楽か」をより具体的に判断できるのではないか。

## P0 screens

1. Landing
2. Lifestyle selection
3. 3 demo area comparison
4. One-day route detail

## Demo areas

すべて架空データ。
実在駅・実在施設・実際の徒歩時間ではない。

### AREA A — COMMUTE LINE
駅徒歩8分。
スーパーは駅〜自宅動線上。
夜の選択肢が多い。
休日の公園は遠め。

### AREA B — LOCAL LOOP
駅徒歩8分。
自宅周辺に日常施設が集中。
在宅勤務と休日は強い。
通勤日は坂道で負担。

### AREA C — QUIET EDGE
駅徒歩8分。
静かで公園が近い。
買い物は駅反対側へ迂回。
夜遅い帰宅は不便。

## Lifestyle presets

### COMMUTER
週5出社 / 19時前後帰宅

### HYBRID
週2出社 / 週3在宅

### NIGHT
帰宅22時以降が多い

## P0 metric

表示するのは「客観的な街の点数」ではない。

Lifestyleごとに以下を合成した
**Daily Friction** を表示する。

- extra walk
- detour
- opening-hours mismatch
- slope / crossing friction
- home-neighborhood completeness

低いほど、そのLifestyleでは動線が素直。

不動産価値・治安・資産価値・総合的な住みやすさは評価しない。

## P0 success

- M1: 80%以上が「駅徒歩だけでは足りない理由」を説明できる
- M2: 70%以上がLifestyle変更で最適エリアが変わることを理解する
- M3: 60%以上が実際の物件探しで使いたいと言う
- M4: Daily Frictionを客観的な不動産価値スコアと誤解する人 30%未満

## P1 gate

P0 GOなら次に:
- 実駅データ接続
- Station Master ID連携
- 徒歩圏POI
- Route / time-of-day
- 平日 / 休日
- 実地検証

P0で作らない:
- 実地図
- 不動産価格
- 治安
- 災害
- 通勤混雑
- 実店舗営業時間
- 投資判断
