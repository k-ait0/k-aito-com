# K. Aito Analytics v0.7｜DWZ CPI連動・継続収入移行の契約

2026-11-13 JST / 研究ブランチ `analytics-historical-v0-1-20261110` / PRIVATE_PERSONAL_RESEARCH。公開・商用利用承認なし。

## 今回追加した機能

**DWZ R4 v16.9固定研究用 `simulateOne` の `escalationModel.type='CPI_LINKED'` を、明示した参照系列に限って新Coreへ変換する。** DWZは月次時点にかかわらず、期間iの `monthlyAmount × m.cpiIndex[i]` を使う。将来の正規DWZ全版・生活費CPI・異なる基準年を一律に再現する機能とはしない。

新研究契約：

- 継続収入レコード `escalation_model='DWZ_CPI_INDEX'` は任意（未指定 `NONE`、従来と同じ名目一定額）。
- `m.cpiIndex[i]` を **「当該月間リターンの終了月CPI水準 / 最初のリターン月の直前月CPI水準」** と明示して正規化する。給与や年金の月初／月末指定とCPI参照時点は別概念で、DWZ固定関数の同一月CPI倍率に合わせている。
- 一月の継続収入の整数円は `Math.round(monthly_yen × CPI[i+1]/CPI[0])` とする。旧DWZは小数円を保持するため、端数が出る場合は厳密に一致しないことを表示・監査する。
- 累積額・各月期首末残高の保存則は整数円で確認する。給与年金の収入は市場リターンが発生する時点より前後のどちらに入ったかを保ったまま、手数料・税金なしの総額台帳に計上。
- 同じ年月の実測市場系列に合成CPIを組み合わせる、または年月が1か月でも欠けているものを実測として計算することは禁止。必要なCPIの欠損月を含むローリング窓は結果から除外し、暦月・行ベースの除外件数を記録する。
- ゼロ円のCPI連動収入、あるいは現在の分析期間外にしか支給されない連動収入は、CPI系列を必須としない。実際に対象期間内でCPIを参照する月がある場合だけ必要。

## 旧DWZからの明示移行

`migrateDWZAgeIncomeStreams` に `cpi_index_contract` オプションを追加。

```js
migrateDWZAgeIncomeStreams(dwzSalary, {
  simulationStartAgeMonths: 480,
  horizon_months: 120,
  kind: 'salary',
  cpi_index_contract: 'CURRENT_PERIOD_END_OVER_PRE_PERIOD_CPI'
})
```

この明示オプションがある場合だけ `CPI_LINKED` を `DWZ_CPI_INDEX` に変換する。未指定や異なる値ならエラー。DWZの `CUSTOM_PATH` は変換しない。年齢開始・終了（終了月除外）を対象期間で切り、期間外の収入は除外理由付きで記録する。

## 本人専用UIと出力

給与／年金の入力は既存4列（名目・月初）、5列（名目・指定時点）をそのまま受け入れ、次の6列を追加：

```text
work,0,120,150000,MONTH_END,CPI_LINKED_DWZ
pension,0,120,80000,MONTH_START,CPI_LINKED_DWZ
```

6列指定時のみ `DWZ_CPI_INDEX` をアダプターへ渡す。内部の合成データでは合成CPIを使い、本人の実測データでは同じ年月・出典区分のCPIが別途必要。無指定・未知指定・CPI欠損・出典区分不一致はFail Closed。

CSVには `dwz_income_cpi_multiplier` と `dwz_income_cpi_reference_month` を追加し、既存の給与・年金期首／期末内訳、月初月末グロス収支、予定・実現純収支、実払／未払額は保持。

## 検証範囲

`scripts/test-analytics-dwz-cpi-income-v07.cjs`：
- 1/2/4/8/12資産、給与・年金の月初／月末、CPI水準、収入額の組合せ**180通り**、整数円の元本保存則と各相の台帳を検証。
- 固定DWZ研究関数：元本1,000円、月初給与100円×CPI1.1、月末年金40円×CPI1.1、月初支出10円・月末支出20円、リスク月次+10% → **期末1,234円**。旧DWZと新Coreの期末残高・損益を照合（旧小数円は許容誤差で比較）。
- CPI連動給与のみで生活費が名目一定のローリング：CPI完備なら2窓、欠損・CPI未提出なら該当窓0。先の分析期間にしか支給されない場合はCPI不要。
- 未知の変換契約・CPI異出典・カレンダー欠損・未知エスカレーション・CUSTOM_PATHの拒否。
- 4列/5列入力の回帰に加え、6列画面入力の成功と不正指定によるCSV保存停止もDOMテストで確認。

CI: https://github.com/k-ait0/k-aito-com/actions/runs/43346409827（研究ブランチ、合成市場系列のみ）。

## 非対応・次回候補

- 特定のDWZ版がCPI基準月を別の方法で与える場合は、一致を保証できず個別変換が必要。
- 年金の実支払日・税引後収入・源泉徴収・将来の税制・年金改定率は不再現。月初／月末はシミュレーション上の二相であり実日付を意味しない。
- 取得価額、口座別取引履歴・内部振替、特定口座/NISA、譲渡損益・配当課税・費用は未実装。金融ロット設計と独立監査を経てから統合する。
- 指数・CPIの合法的取得、販売/公開利用権、実機Safari QAも未確認。合成テストを実際の市場実績として表示しない。
- main／FINOWA／公開K. Aito Analytics／DWZ本体／市場原本／商用権利の登録状態は無変更。

## Chromium画面受入：CPIリンク6列（別環境）

CIで生成した本人専用HTML（SHA-256 `92addb7defc595188104f66da2a2cb8b746ff0714da1e505b59211c8d334c2c5`）を、Chromium＋Playwrightで実際に操作。これは実世界の株式・債券CPI系列を使った試験ではなく**合成市場デモ**である。

- 初期3資産／合成600か月／ローリング481窓。
- 給与 `salary,0,120,100000,MONTH_END,CPI_LINKED_DWZ` および年金 `pension,0,120,60000,MONTH_START,CPI_LINKED_DWZ` を入力。CPI連動＋二相計算でCSV120行をダウンロード。
- 初月の合成CPI倍率1.002、給与100,200円（月末）・年金60,120円（月初）、CPI参照月1971-02をCSVの列で再検証。
- 6列目を不正値にすると計算と出力が停止。12資産へ変更しても120行・12保有資産列、481ローリング窓を確認。
- モバイル390pxで文書横方向のオーバーフロー0px、JS未処理例外0件、HTTP(S)外部通信0件。
- 直接 `file://` 移動は `ERR_BLOCKED_BY_ADMINISTRATOR`。新規ページにHTML本文を `set_content` する代替経路で全テストを行った。**本人の端末やSafariでのファイル直接起動は未検証**。
