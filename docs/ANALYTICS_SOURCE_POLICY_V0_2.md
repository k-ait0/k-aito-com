# Analytics / FINOWA 市場データ・ソース固定ポリシー v0.2
**採用日：2026-11-10｜ステータス：出所選定・利用規約一次審査。データ取得完了・商用公開許可ではない。**

## 目的と範囲
- 対象は資産取り崩し / ポートフォリオ / ヒストリカル分析。元の8資産クラスを12に拡張し、補助データ6区分を含む。
- **ソース・ロック**：資産クラスごとに特定の権利者／正規取得先を固定。将来の取得元の変更・指数の代理変更・リターン種別変更は自動で行わない。変更は `SOURCE_CHANGE_ADR` とレビュー承認を必須とする。
- **無料・公開≠公開サイトへの再配布許諾。** ダウンロード可能／個人研究可／内部商用分析可／一般サイト表示可／CSV再配布可／ユーザーへの結果返却可を区別する。
- 禁止：ライセンス未確認の第三者指数の自動収集・ホスティング・売買戦略結果への権利迂回流用、FRED等の第三者データの「経由しただけで自由に使える」という推定。
- **原データ権利未承認の系列はFINOWA・Analytics両サイトへ同梱・表示・CSV出力しない。** ユーザー私的CSV読込と、明確に架空と示すデモは別実装で提供できる。

## サイト用に優先する公的取得元

| 必要データ | 固定した一次取得元 | 利用条件レビュー | 採用状態 |
|---|---|---|---|
| 日本CPI | e-Stat（統計局のCPI原系列） | 政府統計一般規約・API商用可、出典・加工表示・第三者権利審査 | 公開利用の優先候補。具体的統計IDとQA待ち |
| 米国CPI | BLS直販API、`CUUR0000SA0`（CPI-U非季節調整、全項目） | BLS公表データ原則PD、API利用・取得日・非保証表示 | 公開利用の優先候補。取得・QA待ち |
| USD/JPY | Federal Reserve Board H.10原データ | Fed Boardサイトの資料は原則PD（別途明記は除く） | 公開利用の優先候補。系列ID・QA待ち |
| 米国国債利回り | US Treasury本省公式Daily Treasury Rates | data.govにPublic Domain/CC0表示 | 公開利用の優先候補。**利回り≠債券TR** |
| 金スポット・商品現物価格 | 世界銀行 Commodity Markets / Pink Sheet月次 | 世界銀行の原則CC BY 4.0（個別の第三者例外・収録元を確認） | 公開利用の優先候補。月次XLS取得・権利メタデータ確認待ち |
| 日本円の短期・長期金利 | 日本銀行 時系列統計API | **商用転載・複製は事前相談要**。APIサービス公開時の通知・クレジット | **商用公開は保留**。連絡・条件確認が必要 |

**統計ダッシュボード（e-Stat）** は登録不要APIを補助候補として固定する。取得対象に第三者データがある場合は権利条件を優先。API掲載には指定クレジットが必要。

## ライセンス対象として固定する資産指数

| 資産クラス | 採用候補の権利者・指数 | 現在のサイト用判定 |
|---|---|---|
| 日本株 | JPX総研・TOPIX配当込み（**日経TRは別権利者**） | JPX契約要否確認・許諾待ち |
| 米国株 | S&P DJI・S&P 500 Total Return | S&P DJI商用表示／データライセンス待ち |
| 世界株 | MSCI・ACWI Net TR | MSCI事前書面許諾待ち |
| 日本債券 | 野村FRC・NOMURA-BPI総合 | 権利者・契約条件の一次照会待ち |
| 米国債券 | Bloomberg・US Aggregate | 商用指数利用契約待ち（代替で米国国債金利モデルは別名称） |
| 現金・短期資産 | BOJ円短期金利 | 商用転載相談待ち。米国T-bill代替は円現金とは別 |
| 金 | World Bank Pink Sheet GoldスポットUSD | 取得・権利・価格種別QA待ち。**商品保有のTRとは異なる** |
| REIT | JPX東証REIT配当込み（海外は別） | JPX等のライセンス待ち |
| 新興国株 | MSCI Emerging Markets Net TR | MSCI許諾待ち |
| 先進国債券 | FTSE Russell WGBI（米国外の対象を要定義） | LSEG/FTSE Russell契約待ち |
| 金以外の商品 | World Bank Pink Sheet（原油・金属・農産物スポット） | 取得・権利・価格種別QA待ち。**先物TRではない** |
| 物価連動国債 | US Treasury TIPS実質利回り（研究用モデル） | 公的金利データのQA待ち。**TIPS投資TRは別ライセンス** |

### 利用条件の一次根拠
- [e-Stat規約](https://www.e-stat.go.jp/terms-of-use)、[e-Stat API商用可FAQ](https://www.e-stat.go.jp/api/node/78)
- [統計ダッシュボード規約](https://dashboard.e-stat.go.jp/static/terms)、[API利用案内](https://dashboard.e-stat.go.jp/static/api)
- [BLS Public domain](https://www.bls.gov/opub/copyright-information.htm)、[BLS API Terms](https://www.bls.gov/developers/termsOfService.htm)、[CPI series ID](https://www.bls.gov/cpi/factsheets/cpi-series-ids.htm)
- [Federal Reserve Board disclaimer](https://www.federalreserve.gov/disclaimer.htm)
- [U.S. Treasury data.gov](https://catalog.data.gov/dataset/interest-rate-statistics-daily-treasury-yield-curve-rates)
- [World Bank Commodity Markets](https://www.worldbank.org/en/research/commodity-markets)、[World Bank data terms](https://data.worldbank.org/summary-terms-of-use)
- [BOJ時系列サイト規約](https://www.stat-search.boj.or.jp/info/notice.html)、[BOJ API留意点](https://www.stat-search.boj.or.jp/info/api_notice.pdf)
- [JPX指数ライセンス](https://www.jpx.co.jp/markets/indices/licence/)／[JPXサイト規約](https://www.jpx.co.jp/term-of-use/)
- [S&P DJIデータ・指数ライセンス](https://www.spglobal.com/spdji/en/about-us/data-index-licensing/)
- [MSCI指数利用条件](https://www.msci.com/legal/index-terms)
- [FRED規約](https://fred.stlouisfed.org/legal/terms/)：別の正規提供元を優先し、第三者利用条件をFRED経由で迂回しない

## データ認定状態（すべて明示管理）
1. **SOURCE_LOCKED**：権利者・シリーズ・候補取得元が決まった（≠取得・許諾）
2. **RAW_ACQUIRED_PRIVATE**：指定先から私的に原データ取得、SHA256・日時・取得方式を記録
3. **DATA_QA_PASSED**：連続月、欠損、単位、通貨、改定、TR/PR/スポット、FXの整合性
4. **RIGHTS_REVIEW_PASSED**：商用、一般公開画面、結果配信、ダウンロード、必要表示を個別判定
5. **PRODUCTION_APPROVED**：リリース承認後のみサイトへ組み込み。4まで達成しても自動公開しない

出典変更は `docs/decisions/analytics-source-ADR-XXXX.md` に**変更理由、旧新ソース・権利・カバレッジ・数値差分・回帰結果・承認者・移行時期**を必須とする。承認前に上書きせず旧バージョンを保持する。想定するレビュー頻度は6か月と、利用規約改定・系列提供停止時の臨時レビュー。

## 取得実績（第2回）
- 旧DWZ内蔵Shillerを522か月再抽出済み。**研究・非公開のみ。** 当該データのサイト再配布やS&P 500TRの代替としての許可はない。
- 世界銀行の2026年11月公開月次XLSの公式取得先と規約を確認。**この環境からの直接ダウンロードはDNS失敗。取得件数は0**。取得できていないファイルを取得済みとしない。
- 本文の公式規約調査とソース固定は完了。今後の市場データの広範な収集は実行環境の外部アクセスが必要。

## サイトの出典・免責欄
- すべてのグラフに出典・対象期間・データ更新日・原単位・配当込み/なし・通貨・加工方法を表示。
- e-Stat APIを使うサービスは指定のクレジットを表示。BLS APIも取得日時と指定免責文を記載。
- BOJ APIを使用して公開する場合は、日本銀行へ公開連絡し、指定クレジットを掲示。**商用転載許可をこの通知だけで代替しない。**
- 第三者権利に基づくRawデータのCSVダウンロードは権利条項に従い個別ON/OFFする。
- 過去のバックテスト成功率は将来の成功確率ではない。
