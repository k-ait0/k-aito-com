# K. Aito Analytics｜過去市場データ・正規化実験 v0.4

**2026-11-10（JST）｜研究用、公開・投資判断・第三者指数再配布には未承認。**

## 今回実行した実作業
1. 過去のDWZユーザー保管データ `shiller_1980-01_2023-06_RESEARCH_ONLY.csv`（SHA-256 `0cdb8a04bd14d104e53acbb982cf205eb4733371bb9140191b8c4b6e433bc55d`）を使用。
2. 522か月の価格・年率換算配当・米国CPIから、欠損や重複を許さず **521か月の概算米ドル名目・実質月次リターン**を計算。式：`P_t/P_(t-1)-1 + D_t/(12P_(t-1))`。円建てではない。**公式S&P500 TRではなく、配当計上時点も概算**。CPIは米国CPI。
3. 毎月開始の完全ローリングウィンドウを検査：10年402件／20年282件／30年162件。これは**計算に必要な月数を確保できる開始時点の数**であり、運用成功数や将来成功確率ではない。
4. Node.js 22実行：入力・欠損・重複・数値制約・CPI処理・ローリング・本物の原本SHA検証を含めて **16/16件PASS**。検証済み私的CSV・導出リターンはGitHubに保存しない。
5. 円換算用の独立アダプターを作成。式：`JPY_return=(1+USD_return)*(FX_t/FX_(t-1))-1`。実質化には**日本CPI必須**。米国CPIや逆の為替レートを入力すると停止する。欠損月、0為替、重複月、最新月の暫定値を検査。**13/13テストPASS**（ローカルNodeとGitHub登録コードの独立実行）。
6. 正規化済みの月次リターンは非公開ディレクトリにのみ書き出し、ソースデータのSHA・権利状態・公式TRではない旨をJSONへ記録。公開リポジトリには**スクリプト・QA記録のみ**を置く。

## なぜ円建ての長期完走シナリオはまだ0か
現在確認できる長期市場の実データは旧Shiller価格・配当・米国CPIだけ。Fedドル円は日次28行の2026年秋スナップショットしか私的に保有しておらず、Shillerが2023-06で終わっているため、**両者は同期間の系列として交差しない**。さらに日本CPIの新規実ダウンロードも未完了。
したがって円建て・日本物価調整済みの20年／30年リプレイは **未実行**。補完値や擬似FXで水増ししない。

## 正本として維持する取得元
- 市場・為替の正本：`research/analytics/source_registry.v0.2.json` と `docs/ANALYTICS_SOURCE_POLICY_V0_2.md`
- 米ドル円：Federal Reserve Board H.10日本円履歴（https://www.federalreserve.gov/releases/h10/hist/dat00_ja.htm）
- 日本CPI：e-Stat（https://www.e-stat.go.jp/）／BLSは米国CPI（https://www.bls.gov/developers/）
- 金・商品現物：World Bank Pink Sheet（https://www.worldbank.org/en/research/commodity-markets）
- S&P500・国内株式・債券などの指数TR：サイトへの一般公開・ライセンス契約は別審査。Shiller旧値も研究専用。
- **自動フォールバックは禁止**。API・利用規約変更時は`SOURCE_CHANGE_ADR`で審査する。

## 引き続き未完了のゲート
- 公式サイトからの長期データ完全ファイル取得（ChatGPT作業コンテナではDNS解決失敗）
- BLS CPI・e-Stat日本CPI・Fed H.10長期実データによる**三者整列テスト**
- 全リポジトリのローカルpreflight、外部Web実行E2E、サイト上の商用利用・画面表示/CSV再配布審査
- PR #70の金融計算Core本番承認とは完全に別工程

## 実行方法
```sh
node scripts/test-prepare-analytics-shiller-research.cjs /PRIVATE/shiller_1980-01_2023-06_RESEARCH_ONLY.csv
node scripts/test-align-analytics-historical-series.cjs
node scripts/prepare-analytics-shiller-research.cjs /PRIVATE/shiller_1980-01_2023-06_RESEARCH_ONLY.csv --private-output /PATH/OUTSIDE/REPOSITORY
```
