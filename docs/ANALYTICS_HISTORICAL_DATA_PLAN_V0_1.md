# K. Aito Analytics 過去市場データ収集・活用計画 v0.1

> **2026-11-11：履歴期間の正式目標は「原則60年の連続月次」に変更。** 1980年開始は既存Shiller研究データの取得済み範囲であり、標準仕様ではない。正本：[60年履歴方針](ANALYTICS_HISTORY_60Y_PLAN_V0_5.md)、[期間台帳](../research/analytics/history_coverage_targets.v0.5.json)。60年分がない資産（J-REIT等）を擬似値で延長しない。

> **取得元の正本はv0.2です（2026-11-10追補）。** 本文v0.1の取得候補URLは初期検討記録であり、正式な公開用取得元ではありません。出所の変更・権利審査は [ソース固定ポリシー](ANALYTICS_SOURCE_POLICY_V0_2.md) と [ソース台帳](../research/analytics/source_registry.v0.2.json) に従います。**FREDは独立した商用公開用の標準取得元に採用しません。**

**採用：2026-11-10。研究用。公開・商用利用許諾・金融計算Coreの承認とは別。**

## プロダクト境界
FINOWA（C案）：生活設計・金融教育・代表的市場局面の理解を優先。詳細なデータ操作は原則非表示。
K. Aito Analytics（B案）：詳細条件・期間・資産配分・通貨・リバランスを操作できる分析ワークスペース。過去開始月一括比較、ローリング検証、最悪開始時期、感応度・ストレス分析、ソース・監査表示を目標にする。共通データ変換／計算Coreの再利用を設計するが、現行DWZ v16.9からの分割は未実施。

## 12資産クラス（従来8＋追加4）
| コード | 資産 | 優先 | 実データ確認 |
|---|---|---|---|
| JP_EQUITY | 日本株 | S | 未確認 |
| US_EQUITY | 米国株 | S | 旧Shiller研究データ抽出済み。TRではない。 |
| GLOBAL_EQUITY | 世界株 | S | 未確認 |
| JP_BONDS | 日本債券 | S | 未確認 |
| US_BONDS | 米国債券 | S | 未確認 |
| CASH_SHORT | 現金・短期資産 | S | 未確認 |
| GOLD | 金 | S | 未確認 |
| REIT | REIT | A | 未確認 |
| EM_EQUITY | 新興国株 | A | 未確認 |
| DEV_EXUS_BONDS | 先進国債券 | A | 未確認 |
| EXGOLD_COMMODITY | 金以外のコモディティ | A | 未確認 |
| INFLATION_LINKED | 物価連動債 | A | 未確認 |

## 補助6区分
| コード | 区分 | 用途 |
|---|---|---|
| FX | 為替 | USDJPY/local FX |
| CPI | 物価 | Japan and US CPI |
| RATES | 金利 | JPY/USD short and long yields, not bond TR |
| DIVIDENDS | 配当・利息 | Total return reconstruction; Shiller annual dividend in research only |
| HEDGE_COST | 為替ヘッジコスト | Actual/estimated costs and hedged vs unhedged |
| CREDIT_SPREAD | 信用スプレッド | Credit risk series |

**取得済みとシリーズ候補を混同しない。** 世界株と米国・日本・新興国株は相互に構成が重複する。REITは国内/海外で別系列、債券は名目・実質「利回り」ではなく**トータルリターン**の系列を優先。金以外の商品は先物ロール収益を含むTRと現物価格を区別。円建て換算・為替ヘッジは別工程。

## 第1回の実績
- ユーザー保存の `DWZ_v0.30B_offline_preview.html` からShiller由来の圧縮系列を復元、**1980-01〜2023-06、522か月**。
- 抽出3系列：S&P 500価格指数、年率換算配当、米国CPI。旧版で小数第2位に丸め済み。
- 私的研究用CSV SHA-256 `0cdb8a04bd14d104e53acbb982cf205eb4733371bb9140191b8c4b6e433bc55d`。HTML SHA-256 `4f80417d1a00dd7c27f854c9096e82bc85b3fb18acd5584a56c724333f7b7eb5`。
- 抽出・検証・取り込み用スクリプトのローカルテスト **7/7 PASS**。第三者データの利用・公衆再配布権は未確認。**生値を公開GitHubへ追加しない。**
- FRED生CSVへの新規アクセスは作業環境のDNSが失敗：**外部新規取得0件**。URLを確認できたことは取得成功ではない。

## 出典候補（各系列でG0調査が必要）
- 日本銀行時系列JSON/CSV API：https://www.stat-search.boj.or.jp/
- 日本CPI：https://www.stat.go.jp/data/cpi/index.html
- USD/JPY：https://fred.stlouisfed.org/data/DEXJPUS
- 米国CPI：https://fred.stlouisfed.org/series/CPIAUCSL
- 米国10年国債名目金利：https://fred.stlouisfed.org/series/DGS10
- 米国10年物価連動国債実質金利：https://fred.stlouisfed.org/series/DFII10
- JPX指数の公式窓口：https://www.jpx.co.jp/
- Shiller研究用配布ソース：https://github.com/datasets/s-and-p-500/blob/main/data/data.csv

## 取得・品質・ライセンスゲート
G0 ソース・単位・通貨・価格指数/トータルリターン/金利区分確定。
G1 生データを**非公開**で保管、SHA256・観測期間・件数・取得日時を記録。
G2 月次連続性・欠損・異常値・基準年・コーポレートアクション・通貨・再投資条件を検査。
G3 公衆再配布権と商用利用権を別途明示確認。不明ならユーザーの私的データだけで試験。
G4 円建てTR・共通期間・開始年別バックテストの妥当性と回帰QAを確認。

Shillerは**既存成果物の復元と基本検査まで**。G2詳細・G3・G4は未完了。
長期取り崩しの分析では、選択した全資産に共通する履歴を使う。完走できない開始年月は「失敗」に混ぜず除外件数を表示。過去の成功割合は将来の成功確率ではない。

## 継続作業
1. 日本株TR、国内債券TR、円短期金利、USDJPY、日本CPIの適切な系列コード・入手権限を調査し、私的取得。
2. 米国CPI・日米金利と既存Shillerを月次整列、共通期間と通貨条件を監査。
3. 世界株・金・REIT・新興国株・先進国債券・商品・物価連動債を段階追加。
4. B案「ヒストリカル分析」画面へ旧DWZのMarketPaths、CSV、IndexedDB、バックテスト技術を移植。

進捗台帳：`research/analytics/historical_data_catalog_v0.1.json`。
DWZ PR #70はDraftのまま、GitHub Actionsや本番公開は行わない。
