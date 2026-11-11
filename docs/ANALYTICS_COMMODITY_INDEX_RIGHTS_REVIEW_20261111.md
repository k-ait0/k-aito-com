# K. Aito Analytics｜World Bank 71商品系列・指数TR権利の実査（2026-11-11）

**RESEARCH_METADATA_QA_COMPLETE / SERIES_LICENSES_UNRESOLVED / NO_PRODUCTION_ACCESS**

## 1. 原本と監査範囲

公式出典：[World Bank Commodity Markets](https://www.worldbank.org/en/research/commodity-markets)、月次原簿（2026年11月版） https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx

原本 SHA-256：3c8d9d8dbb48342fdbf24777c39a8ce8964cc2fd0958f72f6779e6e4ad99cde2。71の商品価格・指数列をDescriptionシートの元行番号と**1対1対応**させた。1商品あたり詳細注記のハッシュと先物・予測フラグを採録した非公開監査JSONを作成し、公開GitHubには原値も説明文全文も置いていない。

重要：Description行108の公式凡例は「* denotes forecast series」。**47/71列**が該当する。これによって当該列の各月が予測値と証明されたわけではないが、各月について確定観測値と断定するには追加の照合が要る。

| 区分 | 該当列（重複あり） | 意味 |
|---|---:|---|
| Forecast series凡例の*印あり | 47 | 実測・予測の混在可能性。セル単位では未判定 |
| Descriptionに定義・期間変更の兆候 | 35 | 価格の品質・ロケーション・参照市場が変更された可能性 |
| 先物または近月限価格の明記 | 5 | Coal Australian、Cocoa、Sugar US、Rubber TSR20、Rubber RSS3 |
| World Bank以外の参照元を掲げる | 68 | 各第三者の二次配信権限を確認すべき |
| Descriptionの参照元がWorld Bankのみ | 3 | Crude oil average / Natural gas index / Tea avg 3 auctions。元データに第三者権利がないことまでは保証されない |
| 30年間の数値連続性を満たす | 65 | **投資可能商品・TR・権利の認定ではない** |
| 公開・再配信承認済み | 0 | サービスへの組込み禁止 |

定義変更の注記は、Gold（2025年6月以降の平均スポット参照に変更）、Palm oil（2026年1月から参照変更）、Natural gas Europe（TTFに切替）、鉄鉱石、鶏肉、魚粉等で特に重要。原油平均・天然ガス指数・茶の平均はWorld Bank算出の合成値であり、それらを買える単独金融商品と扱わない。各数値は専用の投資可能TRではなく、spot reference / export-import quote / index / futures-related quotation 等を区別する。

詳細非公開証拠：
- Kaito_Analytics_WorldBank_71Series_Rights_Definition_Triage_20261111.json / SHA-256 a11fab3ab2ea68ec0e4423555cd101d848bc27f04a3c0a3837cd9fa269314d54
- Kaito_Analytics_WorldBank_71Series_Rights_Triage_20261111.csv / SHA-256 23cf8bd0fa740d9e4f7301fa40bb13c0d2292dbcd1634c24979d625fc22cb90f
- 71列のコンパクトなGitHub判定一覧：research/analytics/worldbank_71_series_triage.v0.1.json

## 2. 金の既存OBSERVED CSVに対する訂正・隔離

2026-11-11の従来の Gold 802か月CSVは値を全件正しく転記していても、origin=OBSERVED で**全セルが確定実測と保証済み**という印象を与える。この部分を撤回する。元ファイルを改ざん・削除せず、**研究用QUARANTINEのみの新しいCSV**を作成した。

- 以前のCSV SHA-256：937644f307880a639d4b6298e46763146871db03a9650ae7cf2def21831781a1
- 新しい隔離CSV：Kaito_Analytics_WorldBank_Gold_PUBLISHED_UNVERIFIED_QUARANTINE_20261111.csv
- 新しいCSV SHA-256：1a7a3d97f2566a2389ad131da30600593949b606b8dddff4113a8eb4110641a6
- **値・月・通貨・商品価格単位は変更せず**、originをPUBLISHED_LEVEL_STATUS_UNVERIFIEDとし、予測系列の*印、2025年6月定義変更、第三者権利未解決、商用不許可を別途明示。
- 新ファイルは canonical OBSERVED v0.1の安全な入力として扱わない。Analytics本体は本研究候補を拒否する。
- 1960-01〜2026-10の802は「非空の公表水準」であり、全月の実取引価格が検証された件数ではない。
- 既存 docs/ANALYTICS_OBSERVED_OVERLAP_QA_20261111.md の308/309等の共通期間統計は「公表水準の数値が揃った期間」の意味に限定し、実際の投資可能TRのバックテストや真の実観測保証に使用しない。

## 3. 計算・公開を用途別に許諾判定

正式な商用向けデータ権利台帳：research/analytics/commercial_data_rights_triage.v0.1.json（資産12＋補助8 = 20系列）。

### 情報提供元の公式規則・重要な相違

| 発行元 | 公式規則と必要な契約 |
|---|---|
| [JPX・TOPIX](https://www.jpx.co.jp/markets/indices/licence/) | 第三者提供・ウェブ掲載に指数ライセンスが必要。自己利用と公開を分ける。価格例：[Index Data Service](https://www.jpx.co.jp/english/markets/paid-info-equities/reference/01.html)に配当込み指数の単一法人70,000円/月、Redistribution 170,000円/月（税抜）が掲載。ただし具体的なAnalyticsの使用許諾額ではない。 |
| [S&P DJI](https://www.spglobal.com/en/terms-of-use) | 公開ウェブのデータは原則非商用個人利用。商用・派生・第三者配信・履歴データベース化は別契約または明示同意が要る。 |
| [MSCI](https://www.msci.com/legal/notice-and-disclaimer) | 商用・再配信・派生・データベース化に加え、AI/機械学習利用にも独自の許諾要件。安易な自動取得を避ける。 |
| [野村 NFRC NOMURA-BPI](https://www.nfrc.co.jp/SMI/jp/indexlicense.html) | 過去データ・定期利用・第三者資料・Web提供にはデータライセンス。商用資料での名称使用・指数合成には別の名称使用ライセンスも要審査。取得元サイトに依らない。 |
| [Bloomberg Indices](https://www.bloomberg.com/professional/products/indices/regulation/) | 基準指数利用には適切な使用ライセンス。データサブスクリプションと用途別契約が必要。 |
| [FTSE Russell](https://www.lseg.com/en/ftse-russell/index-resources/indices-subscribe-data) | 歴史指数水準・リターン提供はサブスクリプション。第三者配信・派生利用について契約範囲を確認する。 |
| [日本銀行](https://www.boj.or.jp/about/copyright.htm) | 商用目的のサイト情報転載・複製は事前許可を求める。自作モデルへの金利利用と商用複製は別判定。 |
| [World Bankデータ利用規約](https://www.worldbank.org/ext/en/legal/terms-conditions/datasets) | 原則CC BY 4.0だが第三者に権利が残るデータは例外。原簿Descriptionの第三者ソースを免除できない。 |

### 別途モデル上の注意

米国財務省が公表するConstant Maturity Treasury利回りは参考市場価格から算出する**理論的なパーイールド**であり、保有した債券の利息・経過利息・市場価格変動の総収益そのものではない。関連原典：[米財務省Interest Rate Statistics](https://home.treasury.gov/policy-issues/financing-the-government/interest-rate-statistics)、[算出方法](https://home.treasury.gov/policy-issues/financing-the-government/interest-rate-statistics/treasury-yield-curve-methodology)。

USDJPY / JP CPI / US CPIは市場価格の研究入力だが、投資TRではない。Fed 1971-1999候補のADR-0001は技術検証合格のまま**正式採用未承認**。

## 4. 停止規則と次に実装するゲート

- 商品71列：公開0、研究用原値から商用自動計算への使用0。予測・定義変更・第三者権利を解消した系列のみ個別に承認する。
- 12資産+8補助：内部研究・商用サーバー計算・サイト表示・派生計算結果・API／CSV配信・本番公開を分ける。
- 既存のユーザー向けAnalyticsの計算エンジン・FINOWA本番には一切反映しない。
- Nodeテスト scripts/test-analytics-commodity-rights.cjs と研究用Actionsで全21? ではなく**20データ契約、71列、公開0**を機械的に確認する。
- 次にJPX・NFRC・Bloomberg・S&P・MSCI等について、過去60年データの供給範囲・非公開サーバー計算権・ユーザー向け実績値/派生配信権・費用の見積条件を比較。契約が得られない系列は公開実データ搭載不可。
