# K. Aito Analytics / FINOWA — 月次ローリング生活設計 v0.4

**記録日：2026-11-11 / RESEARCH_ONLY_HOLD / 本番利用・市場データ公開は未承認**

## 位置づけ

- 既存 v0.1 の月次金融計算、v0.2 のシナリオ比較、v0.3 の年金・インフレ・臨時資金を改変せず、新たなローリング計算層を追加する。
- 取得済みの歴史データをこのブランチへ保存しない。取得・ライセンス審査は別の `analytics-historical-v0-1-20261110` に委任。
- 実際の市場リターンと**仮想生活設計**を結合した研究計算であって、「実際の投資家の過去資産寿命」ではない。成功割合は**重複した過去開始月に対する条件付き割合**であり将来の確率を示さない。

## 1. 重要：二つの時間軸

過去市場のリターンが `1980-02` 開始で、将来の本人の年金受給開始が `2040-04` だとしても、そのまま日付同士を突き合わせるのは誤り。**年金・生活設計イベントは運用開始月からの0起算オフセットで指定する。** どの履歴開始月にも、同じ経過月の年金・臨時イベントが発生する。

- `market_start_month`：検証に使った**過去市場データの開始月**。
- `start_offset_months`：毎月年金の開始オフセット。0=最初の運用月、12=運用開始13か月目。
- `end_offset_months`：最終受給月（両端を含む）。未指定の場合は研究期間の最終月まで継続。
- `offset_months`：一回限りの収入・支出が発生するオフセット。
- 生活設計の仮定を**実測の歴史値として表示しない**。公式CPIなどの実績物価はこの版では用いず、年率 `annual_expense_inflation` で仮定する。
- 入力したイベントが期間外の場合はエラー。静かに捨てない。

## 2. API

### 単一プランの全履歴開始月評価

```js
const {runRollingLifecycleCashflow}=require('./lib/analytics/rolling-lifecycle.cjs');
const output=runRollingLifecycleCashflow({
  monthly_returns: privateVerifiedMonthlyReturns, // 月次配列・実際の履歴。取得・認定は別レイヤー
  horizon_months: 360,
  initial_assets_yen: 30000000,
  monthly_withdrawal_yen: 200000,
  monthly_contribution_yen: 0,
  annual_expense_inflation: 0.02,
  relative_pension_schedule:[{id:'pension',start_offset_months:60,monthly_yen:150000}],
  relative_one_time_events:[{id:'repair',offset_months:36,kind:'EXPENSE',amount_yen:1000000}]
});
```

`monthly_returns` は **事前に取得・検査・円換算された `[{month:'YYYY-MM',monthly_return:Number,origin:'OBSERVED'}]`** を想定。ここで付いた `OBSERVED` は入力側の宣言に過ぎず、ソース権利・真正性・通貨・PR/TR分類を証明しない。アプリは別の証拠台帳に基づいて承認する。

- **完全連続する期間だけ**でローリング。重複、逆順、NaN、代理、推計を入力拒否。欠損をゼロリターンや推計で補完しない。
- 結果は `complete_windows`、`excluded_windows_due_to_missing_months`、`funded_windows`、`shortfall_windows`、`historical_funded_fraction`、各開始月の期末資産・不足額・不足開始オフセット。
- `complete_windows=0` なら `historical_funded_fraction=null`。分析不能を0%と表示しない。
- 旧Shillerの522水準月・521リターン月を30年（360か月）で切る理論ケースは162開始月。ここに実際のShiller値を同梱しない。
- `first_shortfall_offset_months=0` はウィンドウの初月。`null` は全期間で不足なし。

### 複数プラン同一履歴比較

```js
const {compareRollingLifecyclePlans}=require('./lib/analytics/rolling-plan-compare.cjs');
const output=compareRollingLifecyclePlans({
  monthly_returns: privateVerifiedMonthlyReturns,
  horizon_months: 360,
  baseline_id:'basic',
  plans:[
    {id:'basic',initial_assets_yen:30000000,monthly_withdrawal_yen:200000},
    {id:'pension',initial_assets_yen:30000000,monthly_withdrawal_yen:200000,
      relative_pension_schedule:[{id:'p',start_offset_months:60,monthly_yen:150000}]}
  ]
});
```

最大8プラン。すべて同じ履歴パス・同じ開始月を使用するため、差分は設定したキャッシュフロー条件による。同じ開始月の資産残高差も一覧化できる。ただし過去経路と将来の年金・支出を結合する仮定に依存し、未来の成績を保証しない。

## 3. 実装した品質ゲート

- 本番公開は常に `publication_approved:false`、`future_probability_claim:false`。
- `OBSERVED` の市場来歴と `SYNTHETIC_ASSUMPTIONS` の生活設計来歴を分離。
- 入力金額は0以上の整数円。金額の安全整数を超える演算を拒否。
- 年金最大20件・イベント最大500件・ケース最大8件。未対応フィールド・絶対年月を渡したイベントは拒否。
- 月次端数はv0.3と同じ `Math.round` で確定。税・社会保険、NISA、実際の年金支給日、運用手数料はまだ考慮しない。
- Node.js 22: `node --test scripts/test-analytics-*.cjs`。今回は旧66件＋新32件＝**98/98 PASS**（連続観測の人工テストデータのみ）。

## 4. 認定前の残作業

1. FX・CPIの整列済み実測市場パスを、**データ取得チームのQA・ライセンス審査後**に読み込む（GitHub上には私的原データを配置しない）。
2. 生活設計の日付・生年月日など実日付入力から相対オフセットへの変換をUIアダプターで実装。
3. `rolling` で得た資産寿命分布の表示設計：不足件数・除外件数・初回不足時期の散布図と実績に関する注意書き。
4. 年金・変動支出の月次パスとインフレ・資産クラス別リバランスを統合する。税・社会保険は別モジュールとして金融検証する。
5. 本番サイト・DWZ PR #70に触れず、Analytics専用研究用画面で実際のE2Eを確認する。