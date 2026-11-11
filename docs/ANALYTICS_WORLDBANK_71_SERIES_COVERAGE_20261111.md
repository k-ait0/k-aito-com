# K. Aito Analytics / FINOWA — World Bank Pink Sheet 71列の連続性・用途区分監査（2026-11-11）

**状態：RAW_WORKBOOK_ACQUIRED_PRIVATE / 71_COVERAGE_QA_DONE / SERIES_DEFINITION_AND_THIRD_PARTY_LICENSE_PENDING / SITE_NOT_APPROVED**

## 原本と検査対象

- 発行元：World Bank Commodity Price Data (Pink Sheet)、固定URL https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx
- 原本SHA-256：3c8d9d8dbb48342fdbf24777c39a8ce8964cc2fd0958f72f6779e6e4ad99cde2
- 原簿の更新日：2026-11-03、Monthly Pricesシート、1960M01〜2026M10の**802暦月**、価格・指標71列。
- 使用した原本・数値は公開GitHubに保存していない。解析には非公開で取得済みXLSXのMonthly Pricesシートを用いた。
- 検査規則：正の有限数のみ観測、欠値は前月継承も補間もしない、年月重複不可、対象期間内欠損を明示。36年・60年などの理論上限ではなく**連続する361か月の実測指数水準**を使って30年の開始可能月を数えた。±20%超の月次変化は調査フラグ、削除する外れ値ではない。

## 結果（個別の配信・分析可能判定とは分ける）

| 指標 | 実測結果 |
|---|---:|
| 月次原本の列数 | 71 |
| 全列の実数観測合計（延べ。資産クラス数ではない） | 50,514 |
| 1960-01開始列 | 50 |
| 1960-01〜2026-10が全月実測 | 46 |
| 1966-01〜2026-10が全月実測 | 46 |
| 30年連続実測ウィンドウを1件以上形成できる列 | 65 |
| 30年完走が不可能な列 | 6 |
| 有効観測範囲の内部に欠損がある列 | 4 |
| 月次変化率絶対20%超のフラグ（全列延べ） | 1,123 |

### 内部欠損のある列

| 公式表示名 | 観測可能な月数 | 内部欠損月数 | 30年完走可能な開始月数 |
|---|---:|---:|---:|
| Sunflower oil（ひまわり油） | 292 | 5 | 0 |
| Rice, Thai 25%（タイ米25%） | 482 | 8 | 0 |
| Rice, Viet Namese 5%（ベトナム米5%） | 264 | 11 | 0 |
| Sawnwood, Cameroon（カメルーン製材） | 430 | 252 | 22 |

30年連続データがない6列：Rapeseed oil、Sunflower oil、Rice, Thai 25%、Rice, Viet Namese 5%、Banana, Europe、Rubber, TSR20 **。

2026年10月まで継続しない列：Barley（2020M08まで）、Sorghum（2020M08まで）、Shrimps, Mexican（2023M10まで）、Tobacco, US import u.v.（2026M07まで）。開始月数と「現在まで観測がある」は別判定。

### 販売可能な投資商品リターンではない

- Crude oil, averageは複数原油価格の加重・平均ベンチマーク。
- Natural gas index（2010=100）は**指数値**であって天然ガスのスポット商品価格でも投資可能TRでもない。
- 金銀等の貴金属・農産物・木材・肥料の価格には銘柄定義、受渡地点、品質、ソース変更等がある。名称や単位だけで単一投資商品とみなさない。
- 価格前月比20%超は一律欠損にせず、各々の経済的事象・系列変更を検証する。1,123フラグは71列合算であり自動不合格件数ではない。

### Descriptionシートの証拠・第三者権利

- Gold（Description行103）は2025-06以降の価格定義が変更され、Bloomberg、Kitco、IMF/IFS、London Bullion Market等の出典が列挙されている。
- Commodity平均・指数についてWorld Bank自身の組成・算定方法が記載されている場合がある。合成指数は原材料のリターンではない。
- 農産物等のDescriptionには2024〜2026年の参照市場・受渡条件変更が複数記載されている。過去に遡る長期連続観測と、全期間で厳密に同じ商品定義とは異なる。
- 世界銀行の一般CC BY 4.0方針と、収録元（第三者）の商用二次配信許諾は分けて確認：https://data.worldbank.org/summary-terms-of-use
- **公開サイト数値表示、研究結果の配信、原本CSV再配布の個別承認は、金・その他商品とも0。** 非公開原本・監査メタデータだけ保管。

## 改訂・監査の注意

原簿にはMismatch Detailsシートがある。定期的な更新時には原本全体のSHA、各列の観測期間・欠値・数値差分・注記変更を比較する。シリーズ定義が変わった場合はSOURCE_CHANGE_ADRを要求し、旧データを上書きせず版管理する。

検証内容を利用する際の詳細な全71列メタデータ（原値なし）：
- ファイル名：Kaito_Analytics_WorldBank_PinkSheet_71Columns_Coverage_QA_20261111.json
- SHA-256：7ca87a3e63dcf904581685d82f136ff6c92a1c7a0daa615e6328ca54b8825cc8
- 非公開研究成果物として管理。公開リポジトリには個別の原観測値を置かない。

**今後のゲート：** 各71列について Descriptionによる商品定義、変更箇所、元データの第三者権利、商用利用区分を順次検証。71列の「数値の連続性」は「公開可能」を意味しない。
