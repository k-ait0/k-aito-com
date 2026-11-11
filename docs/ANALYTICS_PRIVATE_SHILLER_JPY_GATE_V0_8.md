# K. Aito Analytics — 非公開Shiller USD→JPY名目・日本CPI実質化 受入ゲート v0.8

2026-11-12（JST）。`RESEARCH_ONLY_HOLD`。ユーザー操作用サイトを追加せず、入力契約と回帰テストのみ拡充する。

## 正本・入力の境界

- 市場データ担当の正本：研究ブランチ `analytics-historical-v0-1-20261110` の `research/analytics/source_registry.v0.2.json`、`docs/ANALYTICS_SOURCE_POLICY_V0_2.md`、`docs/ANALYTICS_HISTORICAL_V0_4_QA.md`。
- 新しい受入アダプター：`lib/analytics/private-shiller-jpy-adapter.cjs`。依存先はv0.7 `private-historical-adapter.cjs`。**外部通信・原本取得・自動的な提供元変更を行わない。**
- `preparePrivateShillerJpyResearch({usd_monthly_returns, fx_monthly_levels, jp_cpi_monthly_levels, manifest, source_registry})` は、非公開で既に取得・正規化されたデータ配列を受け取る。原本・実リターンはGitHubに保存しない。
- USD: 旧Shiller研究用の `approx_total_return_usd`（月次小数リターン）、公式S&P 500 Total Returnではない。`EXPLICIT_RESEARCH_FALLBACK` と `RESEARCH_APPROX_RETURN` を使い、SPDJI公式指数に偽装しない。
- FX: Fed Board H.10公式 **従来の固定Japan historyチャネル**、円/米ドル、当月末最終観測水準。`LATEST_MONTH_PROVISIONAL` は実測確定値として使用しない。1971年までのDDP拡張はADR-0001が未承認なので禁止。
- CPI: e-Stat全国総合・原系列（月次の指数水準）。帰属家賃除き系列、米国CPI、季節調整系列とは区別。**名目円建て市場リターンとは別**に実質化結果を記録する。

## 数式・検査

必要なのは USD投資リターン `u[t]`、`FX[t]`、`FX[t−1]`、`JP_CPI[t]`、`JP_CPI[t−1]` の全観測。

- `JPY_nominal_return[t] = (1 + u[t]) × FX[t] / FX[t−1] − 1`
- `JPY_real_return[t] = (1 + JPY_nominal_return[t]) / (JP_CPI[t] / JP_CPI[t−1]) − 1`

当月または前月が欠ける場合、**欠損を補間せず、その月を除外**。ソート・重複・数値・単位・系列種別・取得元ID・申告SHA-256の正本台帳一致・対象年月の境界を検査する。原本実体のSHA-256照合は実行していないので `raw_sha256_verified_against_bytes:false`、`upstream_claims_verified_here:false` を必ず保持する。正本へのハッシュ文字列一致と原本検証は別。

ポートフォリオ入力には `market_rows` の **名目JPYリターンのみ**を使用。`research_only_real_rows` の実質リターンを、インフレ率を加算する生活設計の名目リターンに混ぜない。

## 現行固定ソースの期間上限

| 系列 | 正本に記録された期間 | 注記 |
|---|---|---|
| Shillerの原指数・配当 | 1980-01〜2023-06 | 521月次概算USD収益率。旧版・研究のみ |
| Fed H10 *従来固定Japan historyチャネル* | 2000-01〜2026-10（月末確定） | 322か月。1971〜1999は未承認の別チャネル |
| 日本CPI全国総合 | 1970-01〜2026-09 | 681か月・非公開原本、経路QA済み |

この組合せでは、先月のFX/CPIを要求するため、円建て名目収益率の**理論上限は2000-02〜2023-06の281か月**となる。ここからの完全ローリング窓数の理論上限：10年162件、20年42件、30年0件。実際の市場値による計算や実際の窓数の独立確認ではない。

1971年からのドル円670か月が取得済みでも、従来チャネルの固定を外すADRが未承認。30年分析のために暗黙に混用・延長してはならない。過去データの「成功割合」を将来の「成功確率」とは呼ばない。

## 実行検証

`node --test scripts/test-analytics-*.cjs`

v0.7の208件 + 新規37件 = **245/245件PASS（Node.js 22.16.0、ローカル実行）**。新規テストにはFX・日本CPI境界、月次収益率計算、欠損、SHA正本ロック、年月上限、未承認チャネル排除、v0.7ローリング統合を含む。ただし新規テストデータは**すべて模擬値**。生のShiller CSV・Fed日次データ・日本CPI原本はこの環境に存在しなかった。したがって `DATA_QA_PASSED` と `PRIVATE_RESEARCH_AUTHORIZED` は入力申告値であり、真の原本照合・20年実測バックテスト・金融計算の外部監査・第三者権利審査は**未了**。

`main`、Xserver本番、DWZ Draft PR #70、データ取得ブランチを変更しない。

## 次のゲート

1. 別担当の非公開原本の実体が利用可能になった時点で、原本SHAを実計測し、導出月次リターン・ドル円・CPIを同じバックアップと取得報告に結びつける。
2. 許可済みの取得チャネルのみでの実データ統合QAを実行し、10年・20年の実際の完走ウィンドウ数を報告。30年については *0可能* と明示。
3. 1971年拡張のADR-0001が承認された場合だけ、取得経路切替の差分監査・QA・受入契約を新バージョンとして実施。
4. 12資産でのポートフォリオ比較は、各資産の円建て投資可能TRと権利ゲートが揃うまで模擬データの検証にとどめる。
