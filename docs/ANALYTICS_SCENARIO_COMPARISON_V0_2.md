# K. Aito Analytics / FINOWA — シナリオ比較エンジン v0.2

**2026-11-11 JST / RESEARCH_ONLY_HOLD / 本番公開未承認**

## 位置付け

- 共通Core `lib/analytics/cashflow-core.cjs`（v0.1、整数円・月初積立→月初取崩→月次運用）を利用する計算の比較層。
- Analyticsの「03 シナリオ比較」用の共通API。将来FINOWAには簡易入力だけを渡す。UIと本番反映は未実装。
- DWZ PR #70の既存HTML・金融Core・Xserver構成および市場データ取得ブランチは変更しない。
- 既存DWZと同一結果を保証する互換テストではない。年金・年次から月次への計算方式・端数・初月時点などは別途突合する。

## API

```js
const {compareScenarios}=require('./lib/analytics/scenario-compare.cjs');
const {makeSyntheticFlatPath}=require('./lib/analytics/cashflow-core.cjs');
const path=makeSyntheticFlatPath({start_month:'2026-01',months:24,monthly_return:0});
const output=compareScenarios({
  comparison_mode:'CONTROLLED', baseline_id:'base',
  scenarios:[
    {id:'base',label:'現行条件',initial_assets_yen:10000000,monthly_withdrawal_yen:100000,monthly_returns:path},
    {id:'less',label:'支出を抑制',initial_assets_yen:10000000,monthly_withdrawal_yen:80000,monthly_returns:path}
  ]
});
```

- シナリオ数：2～8。`id`は英字開始・英数字／ハイフン／アンダースコアで40文字以内、重複不可。一部予約語を拒否。`label`は80文字以内。
- **同一期間**：全シナリオで月数と`YYYY-MM`列が同じでなければ入力を拒否。欠損補完や自動クロップは行わない。
- **同一来歴**：`SYNTHETIC`と`OBSERVED`の混在禁止。来歴ラベルだけで実測の品質・公表権を認定するものではない。
- **CONTROLLED**（デフォルト）：全ケースの月次市場リターンを同一に固定。初期資産・月次積立・月次取崩の差の比較に使用。利回りの異なる経路は拒否する。
- **STRESS**：月次騰落経路の差を許す。`same_market_path=false`なら支出差と市場差を因果分解できないことを `attribution=MIXED_CASHFLOW_AND_MARKET_EFFECTS` と明示。
- 出力 `summary[]`：月末最終資産、引出総額、未充足額、資金不足の月数・初回月、基準との差分。
- 出力 `timeline[]`：全月、全ケースの期末資産・実際の引出額・未充足額・基準との差分。差分は符号つき整数円。
- 出力は常に `status=RESEARCH_ONLY_HOLD`、`publication_approved=false`。実運用推奨や成功確率を出さない。

## 検証と既知の制約

```sh
node --test scripts/test-analytics-scenario-compare.cjs
```

- Node.js 22ローカル実行で**20/20 PASS**（シナリオ差、欠損・期間不一致、入力拒否、ストレス区別、保存データ不変など）。テスト内の数値は全て仮想値。
- 税・社会保険・NISA・口座・年金・変動支出・売買手数料・リバランス・不動産などは未対応。終了資産は税引前・費用未控除。
- 月次同一期間の最大1200か月制限はv0.1 Coreの仕様に従う。
- 同じ市場リターンを使っても、異なる初期資産と支出を比較した結果がそのまま意思決定に有効とは限らない。実額の入力・運用判断への利用はしない。
- このエンジンにおける比較合格は、金融計算の本番妥当性、DWZ PR #70のE2E、iPad Safari QA、ライセンス認定の代替ではない。

## 次の実装順序

1. 計算Core v0.1・比較Core v0.2の境界条件監査（破綻後・0資産・端数・異常リターン・溢れ）。
2. 年金・物価連動・臨時資金イベントの月次台帳への導入（単体テストと比較回帰テストをセットで作成）。
3. Analyticsの読取専用UI試作。テストデータだけを表示し、本番データの公開ゲートは閉じたまま維持する。
4. 市場データ担当と共通フォーマットの照合・内部データアダプターの結線。正本ソースと権利審査には介入しない。
