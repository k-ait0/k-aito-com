# K. Aito Analytics｜過去市場データ取得基盤 v0.3

**2026-11-10｜研究用ブランチ。公開・指数再配布・金融計算Core承認とは独立。**

## v0.3で実装したこと
1. **Fed H.10 USD/JPY：** 公式の日本円国別履歴を単独取得。観測値を4桁の小数精度で保持、`ND`（非観測）を空値として保存。月次値はその月の最後の有効観測値。連続月が欠落したら停止。取得データ中の**最後の月は暫定**として注記。
2. **BLS CPI-U：** `CUUR0000SA0`（全米・全項目・季節調整なし）をBLS公式API v1の手動期間指定 `YYYY YYYY` によって取得する処理を追加。1リクエスト最大10年、API登録不要。年次平均`M13`を月次値と混同せず、重複・欠落・値の異常をチェック。最新年は未完結を許す。
3. **World Bank Pink Sheet：** 公式の月次XLSXを手動の1回取得に限定。収録系列の出典・Descriptionワークシートと第三者権利の確認前はRAW_UNREVIEWEDとして隔離。
4. **全取得元の共通ガード：** HTTPS提供主体固定、リダイレクト・再試行・自動代替禁止、容量・20秒制限、原本SHA-256、取得日時、公開不可フラグ、原本と正規化版を**Git管理外の非公開ディレクトリ**に別版保存。失敗した取得を成功と記録しない。
5. **QA：** Node.js 22のローカルパーサ試験 12/12 PASS（正常・異常系を含む）。GitHub反映後のJavaScript構文とファイル存在を別途確認。

## 実取得ステータス
- 旧研究データ：Shiller 522か月（1980-01〜2023-06）、個人研究用・権利未確認。
- Fed H.10：2026-09-30〜2026-11-06の日次28行を公式ページから前回採録。**全履歴取得ではない。**
- 2026-11-10現在：上記3取得元の**長期・完全ファイルの新規HTTPダウンロードは未完了（0件）**。本環境のDNSエラーが原因。ブラウザで公式ページと規約の文面を確認できたことを、ファイル取得に計上しない。

## 推奨実行方法（リポジトリルート、Node.js 22）
```sh
node scripts/check-analytics-source-registry.cjs
node scripts/test-analytics-historical-parsers.cjs
node scripts/acquire-analytics-approved-source.cjs --selftest
node scripts/acquire-analytics-approved-source.cjs FED_H10_USDJPY
node scripts/acquire-analytics-approved-source.cjs BLS_CPI_US 2010 2019
node scripts/acquire-analytics-approved-source.cjs WORLD_BANK_PINK_MONTHLY
```
APIアクセスは手動で1回ずつ。外部アクセス可能な端末で実施し、出力は `ANALYTICS_PRIVATE_DATA_DIR` 又はホームディレクトリの `kaito-analytics-private` に保存。**通常のGitコミット・サイト公開には含めない。**

## 収集元を固定するための追加ルール
- 正本は `research/analytics/source_registry.v0.2.json` と `docs/ANALYTICS_SOURCE_POLICY_V0_2.md`。提供元の変更は`SOURCE_CHANGE_ADR`と明示承認を必須とする。
- 同一提供元の月次最新版が更新された場合も、古いCSVを上書きせず、取得日時・SHA・対象期間を残す。
- 商品**スポット価格**を先物の**トータルリターン**として表示しない。国債**利回り**を投資可能な**債券TR**とみなさない。
- BLSから取得したデータは取得日を表示し、BLSが二次加工結果の品質・適時性を保証しない旨を明記する。e-Stat APIは登録・アプリIDと出典表示が必要。Fed Boardも出典表示。BOJは商用転載の事前相談。
- JPX, S&P DJI, MSCI, NOMURA-BPI, Bloomberg, FTSE Russellに係る指数値・TRは契約とサイト利用権の確認前に公開しない。

## 次のゲート
G1：公式原本の非公開取得（日時/SHA/期間）→ G2：月次品質・改定/通貨/TR/PR監査 → G3：商用・画面表示・CSV再配布を個別権利審査 → G4：バックテストCore統合検証 → 人間承認後のみ本番。
未完了：GitHub Actionsの実ブラウザQA、全サイトpreflight、FINOWA/Analyticsへの本番反映（実施していない）。

### 一次資料
- https://www.federalreserve.gov/releases/h10/hist/dat00_ja.htm
- https://www.federalreserve.gov/disclaimer.htm
- https://www.bls.gov/developers/api_signature.htm
- https://www.bls.gov/developers/termsOfService.htm
- https://www.e-stat.go.jp/api/api-dev/faq
- https://www.worldbank.org/en/research/commodity-markets
- https://data.worldbank.org/summary-terms-of-use
