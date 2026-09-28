# ACTION MODEL SPEC 001 — 「やりたい」を実行可能な次の一歩へ変換する

対象：LIFE DESIGN LAB やりたいことルーレット  
状態：v0.5公開ベータへ実装済み。カード本文・カテゴリ改訂は未適用。

## 目的

現行カードには「今日できる行動」「準備が必要な体験」「中長期目標」「継続習慣」「関係性・価値観」が混在する。ルーレットはカード自体を即完了させる装置ではなく、**選ばれた“やりたいこと”に今日から近づくための入口**として扱う。

## 5つの action_type

| code | 名称 | 定義 | 抽選後CTA |
|---|---|---|---|
| NOW | すぐ実行 | 今日〜数日で単独実行しやすい | 「やってみた」 |
| PREP | 準備型 | 予約・場所・道具・同行者など準備が必要 | 「準備を進めた」 |
| GOAL | 中長期目標 | 数週間〜数年の計画・資源が必要 | 「一歩進めた」 |
| HABIT | 継続習慣 | 繰り返して成立する行動・状態 | 「今日できた」 |
| REL | 関係性・価値観 | 相手や関係性、望む状態を含み単純な完了判定が不向き | 「働きかけた」 |

## time_horizon

`today` / `days` / `weeks` / `months` / `years` / `ongoing`

action_typeと時間軸は別属性にする。例：「毎朝散歩」はHABIT + ongoing、「海外で1か月暮らす」はGOAL + months/years。

## 初回分類ルール

1. 1回の行動として実施可能ならNOW。
2. 実施前に予約・移動・準備が主に必要ならPREP。
3. 成果状態の実現に複数工程が必要ならGOAL。
4. 「定期的」「習慣」「続ける」「日常的」等を本質とするならHABIT。
5. 他者との関係の質・相互作用が成果ならREL。
6. 複数に当てはまる場合は、カード本文が最終的に求める状態を優先する。

## 実装済みの分類台帳

- `card-action-metadata.v1.json`: 全200件に actionType / timeHorizon を付与
- `card-action-metadata.v2.json`: 全200件に firstStep を付与
- `card-action-metadata.v3.json`: 全200件の firstStep を固有文へ個別化

v3時点の分布：NOW 24 / PREP 57 / GOAL 77 / HABIT 27 / REL 15。

## UI仕様

### 抽選前

実装済みコピー：

- ヒーロー: 「いつかやりたい」を、「次の一歩」に。
- ルーレット画面: 「次に、何をやってみる？」

目的別モード：

- `ALL`: すべてから選ぶ
- `TODAY`: 今日できる
- `PREP`: 準備から始める
- `GOAL`: 目標を一歩進める
- `HABIT`: 習慣を続ける
- `REL`: 人との関係を育てる

モード変更時は、古い抽選結果を閉じる。表示中の結果が現在モードと一致しないまま残る混乱を避けるため。

### 抽選結果

実装済み表示：

1. やりたいこと本文
2. 種別バッジ
3. 進捗回数バッジ
4. 「まずはここから」欄
5. firstStep
6. type別CTA
7. 再抽選
8. 今回は候補から外す

### 進捗と完了

`progressEvents` と `done` は分離する。

- `progressEvents`: 一歩進めた履歴。GOAL / HABIT / REL などは複数回記録できる
- `done`: 候補そのものを明示的に完了した状態
- `excludeDone`: 完了済みを抽選対象から外す設定

重要：GOAL / HABIT / REL は、CTAを押しても自動で `done` に入れない。長期目標・習慣・関係性は、単発行動で完了したと扱うとUXが歪むため。

## データモデル

既存IDと回答を壊さないため、カード本文とは別にメタデータを追加する。

```json
{
  "id": "W001",
  "actionType": "GOAL",
  "timeHorizon": "months",
  "firstStep": "暮らしてみたい国や都市を3つ書き出す"
}
```

利用履歴：

```json
{
  "cardId": "W001",
  "action": "step_completed",
  "actionType": "GOAL",
  "at": "ISO-8601"
}
```

state v2：

```json
{
  "version": 2,
  "answers": {},
  "custom": [],
  "excluded": [],
  "done": [],
  "excludeDone": true,
  "rouletteMode": "ALL",
  "history": [],
  "progressEvents": []
}
```

localStorageキーは互換性維持のため `kaito.wants.roulette.v1` のまま。読み込み時にversion 1をversion 2へ正規化する。

## 実装済み検証

自動QAで確認済み：

- v1保存データのv2正規化
- firstStep表示
- action_typeバッジ表示
- 進捗記録
- 繰り返し進捗
- 進捗と完了の分離
- 目的別モード切替
- モード変更時の古い結果クリア
- スマホstickyタブ
- 本番XServer配信ファイル一致

## 今後の実装候補

1. 進捗履歴の詳細画面化
2. action_type別の進捗集計
3. `progressEvents` を使った「最近進めていること」表示
4. カード本文・カテゴリのMASTER_005照合
5. W001–W200のID維持・廃止・alias設計
6. firstStepの編集レビュー
7. iPhone/iPad Safari実機検証

## 非目標

- 現段階で200件の本文やW001–W200 IDを変更しない。
- REL型を「完了／未完了」の単純な達成評価にしない。
- 健康・金融などのカードについて、個別の専門助言を自動生成しない。
