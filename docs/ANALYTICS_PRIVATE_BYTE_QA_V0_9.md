# K. Aito Analytics — 私的市場データ実体ハッシュ受入・実測窓QA v0.9

**2026-11-12 JST / PRIVATE_RESEARCH_ONLY / NO PUBLICATION, NO PRODUCTION MERGE**

## 今回の実装

v0.8 `private-shiller-jpy-adapter.cjs` で未完了だった「原本の実際のバイト列の照合」を補強。ローカル研究環境に限って、**4種類の原本+2種類の正規化済み観測CSV（計6ファイル）**のSHA-256を、データ取得担当の`research/analytics/source_registry.v0.2.json`が記録する値と厳密に照合する。入力ファイルのいずれかが異なる場合は計算停止。取得元切替は行わない。実市場値は公開リポジトリ・サイト・標準出力へ書き出さない。

### 実装ファイル

- `lib/analytics/private-shiller-raw-reader.cjs`: 旧Shiller研究用抽出CSVを単独で再計算。価格変化と**年率化配当推定額/12**を別に合計。配当込み公式S&P500 TRではない。
- `lib/analytics/private-canonical-csv.cjs`: 取得担当の共通月次観測契約に準拠したCSVの検査。UTF-8/LF・11列・系列ID・ユニット・通貨・来歴・月の重複・順序・有限正値を照合。
- `lib/analytics/private-jpy-e2e.cjs`: 正本の6種類のSHA照合、CPI 2系列、Fed固定H.10チャネル、USD→JPY名目→日本CPI実質研究値への変換を一体で検証。v0.7ローリング計算へ条件付接続。
- `scripts/run-analytics-private-jpy-e2e.cjs`: ローカル専用CLI。原本をGit checkoutの外から読込、**整数条件を含む結果の集計だけ**をGit checkout外に0600権限で新規書込み。既存ファイル上書き禁止。
- `scripts/test-analytics-private-jpy-e2e.cjs`: 原本差し替え、正規化ハッシュ、通貨・季節調整、欠損・重複、収益率再計算、CLI出力ゲート、ローリング不足履歴などのテスト。

## 必要ファイル（全部非公開）

私的フォルダー（絶対パス）内に次を置く。

| ファイル | 元の意味 | 対照するSHA |
|---|---|---|
| `raw-shiller.csv` | 1980-01～2023-06 Shiller抽出原本（522観測） | `acquisition.private_research_normalization_v04.source_sha256` |
| `raw-fed-h10.html` | 固定Fed H10 HTML公式原本（2000年以降） | `auxiliary.FX.full_pinned_history_20261111.raw_sha256` |
| `raw-cpi-headline.csv` | e-Stat総合原本（CP932） | `auxiliary.CPI_JP.actual_coverage.cpi_headline.raw_sha256` |
| `raw-cpi-ex-rent.csv` | e-Stat帰属家賃除外原本（CP932） | `auxiliary.CPI_JP.actual_coverage.cpi_ex_imputed_rent.raw_sha256` |
| `normalized-fed-h10.csv` | H10確定観測322件のCanonical CSV | `auxiliary.FX.full_pinned_history_20261111.normalized_csv_sha256` |
| `normalized-jp-cpi.csv` | JP CPI総合681件＋帰属家賃除外962件のCanonical CSV | `auxiliary.CPI_JP.actual_coverage.metadata.common_csv_sha256` |
| `manifest.json` | v0.8のUSD・FX・CPI受渡申告（非公開） | SHA・ソースID・取得経路のチェック |

Canonical CSV は `docs/ANALYTICS_CANONICAL_MONTHLY_OBSERVATION_V0_1.md` の11列：`month,series_id,value,unit,currency,series_kind,origin,source_id,seasonal_adjustment,raw_response_sha256,footnote_codes`。FXは `FED_H10_USDJPY_MONTH_END`、CPI総合は `JP_CPI_HEADLINE_2025_LINKED`。e-Stat「帰属家賃除く」も同じCSV内に必要だが、資産分析のインフレ率には**総合だけ**を使う。

### 実行例

```bash
node scripts/run-analytics-private-jpy-e2e.cjs \
  --private-dir /ABS/PRIVATE/DATA \
  --registry /ABS/HISTORICAL_BRANCH/research/analytics/source_registry.v0.2.json \
  --out-dir /ABS/PRIVATE/QA

# 運用条件を含む追加研究。plan.jsonも必ず非公開フォルダ内。
node scripts/run-analytics-private-jpy-e2e.cjs \
  --private-dir /ABS/PRIVATE/DATA \
  --registry /ABS/HISTORICAL_BRANCH/research/analytics/source_registry.v0.2.json \
  --out-dir /ABS/PRIVATE/QA \
  --plan /ABS/PRIVATE/DATA/plan.json
```

`plan.json` は `portfolio:{initial_holdings_yen:{US_EQUITY:整数円},target_weights:{US_EQUITY:1}}`, `cashflow_plan:{monthly_withdrawal_yen:整数円,...}`, `horizons_months:[120,240,360]` の3キーだけ。実測の保有可能TRがあるのは未承認の概算米国株研究系列1つだけなので、他資産を仮想で埋めたりしない。

## 解釈制限

- **この環境には非公開の6ファイル本体がない。** 今回のローカルQAはすべて模擬の原本バイトと模擬数値。実データを検証したという意味ではない。
- 原本4個と既存正規化出力2個のSHAが正本と同じであることは証明できるが、**Fed/e-Statの元原本から正規化CSVを独立して再計算したことまでは意味しない**。報告JSONでは `raw_to_canonical_normalization_independently_recomputed:false` と明記する。
- Shillerだけは旧版の数式をコードで再計算し、受入アダプターの名目JPY収益率とCPI実質研究値へ通す。
- Source Registry の `source_lock` は変更しない。Fed DDP 1971年拡張は ADR-0001 DRAFT のため受理禁止。公開権も承認されていない。
- 金のWorld Bankスポット価格、米国CPI、Fedの国債利回り、他の指数価格を投資可能な総収益率として代用しない。
- 完走開始月数は重複する過去窓の数であり、将来の成功確率ではない。期間上限は10年162窓、20年42窓、30年0窓（**対象期間が欠損なしの理論上限**）。現実に完走できた窓数は私的原本連結QA後にだけ報告する。
- 正規化CSV・原本を公開GitHubへ保存しない。集計レポートも私的フォルダーへ0600、新規保存のみ。

## QAゲート

```bash
node --test scripts/test-analytics-*.cjs
```

**Node.js 22で270/270 PASS（v0.8 245件 + 新規25件）**。データ担当の原本確定SHAと一致するかをテストしたのではなく、実際に別バイト列を渡した際に拒否できることを検査した。元データの私的保管場所、暗号化Artifactの寿命・復号権限はデータ取得担当の管理対象。GitHub Actionsの研究データArtifactは2026-11-18頃に失効予定であり、暗号化データの安全な永続バックアップが必要。

**次のゲート**：取得担当が私的原本6ファイル+manifestとsource_registryを同一実行環境に配置した時点で、本CLIを通した実測照合を行う。その時点まで「実データによる統合QA完了」とは扱わない。`main`、Xserver、DWZ PR #70には手を加えない。
