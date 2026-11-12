# K. Aito Analytics — v0.14 同一開始月CPI比較・円建て台帳監査

**2026-11-12 JST / `RESEARCH_ONLY_HOLD` / 未公開 / 私的研究・仮想値QA優先**

## 1. 今回の開発目的

前版v0.13は、日本CPI（全国総合・2025年基準接続・原系列）を用いる生活費インデックスと、固定インフレ率モデルを別々に計算できた。しかし、**異なるデータ充足期間の「成功割合」を直接比較してはいけない**。本版では、同じ市場経路・開始月・運用ルール・年金・臨時支出を保ったまま、生活費インフレ計算だけ変え、両者とも計算可能な開始月だけを厳密にペアリングする。

併せて、ポートフォリオ月次台帳に対して計算Coreの出力とは**別実装の会計等式監査**を追加する。ユーザー確認ページは追加しない。

## 2. 追加ファイル

- `lib/analytics/rolling-cpi-benchmark.cjs` — `compareRollingCpiVsFixedInflation({...})`。市場月次リターンと開始月を共通にして、CPI生活費連動と明示した固定年率インフレを比較。未観測CPIで窓を除外し、両方式で評価可能な窓だけ集計する。
- `lib/analytics/private-cpi-benchmark-research.cjs` — `buildPrivateCpiBenchmarkReport({...})`。v0.10の**6原本/CSVバイトSHA-256照合＋独立正規化照合**に合格した場合だけ、旧Shillerの**単一研究用株式系列**とe-Stat全国総合CPIで比較する。原本値、月次実測値、個別開始月明細は**非公開集計レポートに含めない**。
- `scripts/run-analytics-private-cpi-benchmark-v14.cjs` — 研究用CLI。v0.12の検証済み非公開受渡フォルダーを読み、原本・正規化データを再照合し、固定年率を明示して結果を私的保存する。出力ファイルは0600、新規書込み・既存上書き禁止。
- `lib/analytics/portfolio-ledger-audit.cjs` — `auditPortfolioLedger(simulation)`。月次の円建て会計保存則、各資産の月初・月末連鎖、積立・引出、`Math.round`後の資産収益、リバランスの保存則・ターンオーバー、資金不足情報を再検査する。**取引費用・税金・CPI・観測値の出典は監査対象外**。
- `scripts/test-analytics-rolling-cpi-benchmark.cjs` — 比較の契約・算式・欠損・期間・固定年率・200より小さい75反復条件の検証。
- `scripts/test-analytics-private-cpi-benchmark-v14.cjs` と `scripts/fixtures/private-cpi-benchmark-fixture.cjs` — **完全に架空の123か月原本・正規化ファイルを生成**し、6バイト出典照合から10年比較までの結合検証を実施。実データは同梱しない。
- `scripts/test-analytics-portfolio-ledger-audit.cjs` — 正常・改ざん検出・200通りの決定論的な資産配分/収益率/取り崩しの会計テスト。

## 3. 比較の厳密な意味

両モデルで以下を固定する：①同一の円建て名目リターン、②同じポートフォリオ初期残高・配分・リバランス、③同じ年金・臨時収支と相対発生月、④同じ開始月・同じ年数。違いは**生活費のみ**。

- CPI連動：`月次生活費[t] = 開始生活費 × CPI[t] / CPI[開始月]`。
- 固定率：`月次生活費[t] = 開始生活費 × (1 + 年率)^(経過月数/12)`。
- CPI欠損や市場欠損があれば、その開始月を**双方の比較指標から除外**。資金不足として数えない。
- 比較指標：同一起点の最終資産差（CPI連動−固定率）、資金不足額差、資金不足判定逆転数、中央値・最小・最大、同一窓分母での歴史的充足割合。固定率側のCPI欠損期間を「固定率だけ有効」として含めない。
- 全ての開始月は重なっているため**独立試行・将来確率ではない**。
- `cpi_asof_policy='RETROSPECTIVE_FINAL_CPI_LEVELS_NOT_HISTORICAL_RELEASE_TIME_AVAILABLE'`：月tのCPI確定値は当該月の初日には判明していない。これは後知恵を含む*過去の物価に生活費を対応させた比較*であり、CPI公表のラグを含めた実行可能な生活費意思決定モデルではない。
- 純粋なインフレ差比較であり、手数料・税金・口座制約・利回り保証・資金拠出額の実額推定は含めない。

## 4. 実行方法（秘密鍵と原本をチャットに貼らない）

事前にv0.11復号とv0.12の検証済み非公開受渡をユーザー所有環境で完了させる。v0.12作業用の`source_registry.v0.2.json`は、レビュー済みGit blob（`4868c921233540396d3e21fd77fa1edd70a10926`）に固定している。

```bash
node --test scripts/test-analytics-*.cjs

node scripts/run-analytics-private-cpi-benchmark-v14.cjs \
  --handoff-dir /ABS/PRIVATE/handoff/analytics_private_handoff_v12 \
  --registry /ABS/HISTORICAL/research/analytics/source_registry.v0.2.json \
  --plan /ABS/PRIVATE/research_plan.json \
  --out-dir /ABS/PRIVATE/comparisons \
  --annual-rate 0.02
```

`--annual-rate` は**小数表記の明示値**（2%は`0.02`）。未指定や`NaN`等は拒否。`plan.json`はv0.13と同じ`{portfolio,cashflow_plan,horizons_months}`で、`cashflow_plan`内に`annual_expense_inflation`を入れない。比較結果の個別開始月明細は出力しない。データは**Gitリポジトリ外のユーザー私有ディレクトリ**に留める。

## 5. QA実績と境界

| 項目 | 今回の実行結果 |
|---|---|
| v0.13継承テスト | **409/409 PASS** |
| v0.14 CPI/固定率のペア比較 | **18/18 PASS** |
| v0.14 6ファイル型の私的結合テスト | **12/12 PASS** |
| v0.14 独立月次台帳監査 | **17/17 PASS** |
| 全自動テスト合計 | **456/456 PASS / Node.js 22.16.0** |
| v0.14の実原本6ファイル受入 | **未実行** |
| v0.14の実測市場に基づく10年・20年比較 | **未実行** |
| 実機Safari、本番公開、第三者数値監査 | **未実施** |

新しい41ではなく**47件**のテストはすべて完全な模擬データで、原本由来の観測値を実際に計算したという証明ではない。月次台帳監査も**内部整合性**であり、入力データが正しいことを保証するものではない。

## 6. 次のゲート（打ち切り基準）

1. 暗号化Artifactをユーザー管理の永続ストレージへ保全し、元のRSA秘密鍵をローカルで維持する。GitHub Actionsの既存5件の失効日は**2026-11-18（UTC）**、バックアップ済みの暗号化ZIPコピーの確認とは別。
2. v0.11復号・v0.12 6ファイル受渡・v0.10独立原本QAを実データで通す。旧Shiller原本は暗号化5件に含まれず、別途正本確保が必要。
3. v0.14で固定率と実測CPIの**同一起点比較**を算出し、欠損や結果の対象期間を数値監査。取得ロック済みFedのHTML起点は2000-01なので、旧Shillerとの共通期間では30年は0窓。
4. 1971年Fed DDP候補への自動切替は**ADR-0001未承認**のため禁止。旧Shillerは公式S&P500 TRではなく、12資産の実測TRと商用配信権は未認証。
5. `main`、DWZ Draft PR #70、Xserver本番、データ取得担当の正本を変更しない。iPad確認用ページ作成はユーザー希望により保留。
