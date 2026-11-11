# K. Aito Analytics / FINOWA：月次実測データの受渡契約 v0.1

**研究専用・確定した市場データソースと公開承認を変更しない。** 現行のAnalytics UI・計算エンジンとの接続は別チャットで行う。ここでは月次実測のデータ契約のみを定義する。

## 1. 形式

UTF-8 CSV、LF改行、1行1観測値。行の昇順は `series_id,month`。実際の指数値は公開GitHubへ含めず、権利に従って非公開受渡とする。

| 列 | 型 | 定義 |
|---|---|---|
| `month` | `YYYY-MM` | 観測月。YYYY-MM末の値を推定するという意味ではない |
| `series_id` | string | 不変の系列識別子 |
| `value` | positive decimal | 原単位の観測水準。原本精度を保持 |
| `unit` | string | 例 `INDEX_1982_84_100` |
| `currency` | ISO currency or `NOT_APPLICABLE` | 物価指数は通貨リターンでない |
| `series_kind` | enum | `CPI_LEVEL`, `INDEX_PRICE`, `INDEX_TOTAL_RETURN`, `COMMODITY_SPOT`, `FX_RATE`, `GOVERNMENT_YIELD`, `MODEL_INPUT` |
| `origin` | enum | 原本の実測のみ `OBSERVED`。将来研究用Proxyは別データセットにし、同じObserved CSVに入れない |
| `source_id` | string | `source_registry.v0.2.json` のロック済発行元ID |
| `seasonal_adjustment` | `NSA`, `SA`, `NOT_APPLICABLE` | 季節調整状態 |
| `raw_response_sha256` | 64桁hex | 原本バッチのSHA-256 |
| `footnote_codes` | string | 原表のフットノートがあれば `;` 区切り。無ければ空 |

**重複キー：** `(series_id, month)` は一意。0・空欄・ダミー値は実観測行として出力しない。非公表月はCSV行を作らず、別途QA manifest内の `missing_months` に記録する。各分析の共通期間と連続性検査は欠損を明示的に評価する。

## 2. BLS CPI-Uへの対応

- 系列ID：`BLS_CPI_US_CUUR0000SA0`
- source_id：`BLS`
- type：`CPI_LEVEL`
- currency：`NOT_APPLICABLE`
- unit：`INDEX_1982_84_100`
- seasonal_adjustment：`NSA`
- 値：公式BLS月次CPI-U原指数。指数水準であり、収益率、為替、月次配当ではない。
- 取得実績：1966-01〜2026-10、観測729件。2025-10の公式欠損1件は出力しない。
- 単位変換：行わない。インフレ率を計算する際は両月実測の `CPI_t/CPI_(t-1)-1`、月次リターン整列も連続月条件が必須。
- 初期受渡は private CSV に限る。**公開サイトへの埋め込み・CSV配布を承認したものではない。**

## 3. データセット単位のmanifest（CSVに別添）

少なくとも `dataset_id,source_id,source_url,retrieved_at,unit,currency,series_kind,origin,first_month,last_month,observations,missing_months,raw_sha256`（バッチ単位の配列可）、`normalized_csv_sha256,qa_status,license_review_url,commercial_processing_rights,public_display_rights,derived_result_delivery_rights,raw_csv_redistribution_rights,production_approved` を付す。レベル系列を指数TR・スポット価格・実質利回りと混同しない。

既存のBLS専用CSV `cpi_us_monthly_observed.csv` は `cpi_index` として指数値を持つ。受渡用の上記共通CSVでは `value` に写像する。原本の列精度と元バッチSHAを保持する。

## 4. 品質ゲート

- 月次フォーマット、非有限数・非正数、重複観測、説明のない欠損を拒否。
- 観測値と推定値を自動結合しない。旧Shiller研究系列を公式SPDJI TRに置換しない。
- CPIでは2025-10を公式欠損として扱い、30年完走開始月357件を別途QAで確認した。
- 他の資産系列で使う際は `series_kind` と単位・通貨・利回り/スポット/配当込み種別ごとに品質ルールを追加する。
- Analytics本体はこの契約をレビューしてからアダプターを実装する。研究データが到達した事実はサイト公開承認を意味しない。

関連：[BLS QA報告](ANALYTICS_BLS_US_CPI_QA_20261111.md)、[取得状況台帳](../research/analytics/acquisition_status.v0.1.json)。


---

## 5. セル単位で観測起源が未確定な公表値の隔離（2026-11-11追加）

公式サイトで月次の値が公表されているという事実だけでは、すべての値が確定実測とは限らない。特にWorld BankのPink SheetはDescriptionシートに * denotes forecast series の印と、参照市場や算出定義の変更注記がある。

この状態の原値は、obs-only契約 v0.1の origin=OBSERVED を**付与しない**。値の原形を保った私的なQUARANTINE研究ファイルに origin=PUBLISHED_LEVEL_STATUS_UNVERIFIED を付与し、既存のOBSERVEDパーサに投入しない。欠損のない802か月、30年継続442開始月という数量QA合格は、その列の「真の実観測判定・投資可能TR・配信権利」の合格を意味しない。

対象：World Bank Gold 1960-01〜2026-10。元CSVの SHA-256 937644f307880a639d4b6298e46763146871db03a9650ae7cf2def21831781a1 は証拠保全し、訂正版隔離CSVの SHA-256 は 1a7a3d97f2566a2389ad131da30600593949b606b8dddff4110641a6。正式なorigin付与ルールをv0.2で採決するまでObs-only本番へは進めない。
