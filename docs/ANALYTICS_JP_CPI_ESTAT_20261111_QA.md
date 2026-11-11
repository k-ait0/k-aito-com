# K. Aito Analytics｜日本CPI 2025年基準・e-Stat長期月次取得QA（2026-11-11）

**RAW_ACQUIRED_PRIVATE / DATA_QA_PASSED / GENERAL_LICENSE_REVIEWED / PRODUCTION_NOT_APPROVED**

## 出典の固定・最新月

- ソースロックは ESTAT のまま。公式統計局の2025年基準、全国・非季節調整・2025=100の接続指数を使用。FRED等に変更しない。
- 2026-11-11時点の全国最新月は2026-09（10/23公表）。東京23区の2026-10中旬速報と混同しない。
- 2024-12以前の値は公式に旧基準から再計算・接続された指数であり、過去の分類・ウェイトが全期間同一だったことは保証しない。

## 原本とSHA-256

| 系列 | 公式 statInfId | 期間 | 有効月数 | 原本SHA-256 |
|---|---|---|---:|---|
| 全国総合（分類コード0001） | 000040482943 | 1970-01〜2026-09 | 681 | 29b63b7aa5cba598b6ab9d7fff839094a5068004bcd571afd20344e14e847c41 |
| 持家の帰属家賃を除く総合（コード0163） | 000040482944 | 1946-08〜2026-09 | 962 | 42b396d0e71fa2105de064de167bd09f3a878bda542648cca816f03402a1e57f |

- 公式ダウンロード1：https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040482943&fileKind=1
- 公式ダウンロード2：https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040482944&fileKind=1
- カタログ：https://www.e-stat.go.jp/stat-search/files?cycle=0&layout=datalist&page=1&tclass1=000001243880&tclass2=000001243881&tclass3=000001243883&tclass4=000001243886&toukei=00200573&tstat=000001243876
- Raw取得・暗号化保存：[GitHub Actions #42951303461](https://github.com/k-ait0/k-aito-com/actions/runs/42951303461) SUCCESS
- Raw再取得・共通形式への正規化・QA・暗号化保存：[GitHub Actions #42951821449](https://github.com/k-ait0/k-aito-com/actions/runs/42951821449) SUCCESS

**重要：** HTTP応答ヘッダーでは charset=UTF-8 だが、CSVファイル実体はCP932（Shift_JIS系）。ヘッダー6行を識別し、公式分類コードで列を選ぶ。UTF-8として直接読み込まない。

## 品質検証

| 検証 | 全国総合 | 帰属家賃除外総合 |
|---|---:|---:|
| 有効観測値（月） | 681 | 962 |
| 期間内の欠損 | 0 | 0 |
| 重複 | 0 | 0 |
| 月次値変化20%超 | 0 | 0 |
| 30年を完走できる独立した開始月 | 321 | 602 |
| 最新月 | 2026-09 | 2026-09 |

- 帰属家賃除外原表の1946-01〜1946-07に空欄7件があるが、正式起点1946-08より前なので未観測として扱う。1946年総合を作成しない。
- 1970-01〜2026-09のコード0163の指数値について、2つの**独立したe-Stat原本における681件を全件突合し、差分ゼロ**。
- 30年開始月数は連続361か月の指数水準に対応する360本の月次変化から計算。将来の運用成功率ではない。
- 丸め済指数から再計算した物価上昇率が統計局の公式前月比・前年比と一致しない可能性に注意。
- Shiller、FXおよび日本CPIの共通実績月が揃うまで円建て投資バックテスト可能とは判定しない。

## 正規化結果

- 共通月次観測契約：docs/ANALYTICS_CANONICAL_MONTHLY_OBSERVATION_V0_1.md
- 2系列を区別した観測値合計 **1,643行**。UTF-8 LF CSV、列は month,series_id,value,unit,currency,series_kind,origin,source_id,seasonal_adjustment,raw_response_sha256,footnote_codes。
- unit=INDEX_2025_100、currency=NOT_APPLICABLE、series_kind=CPI_LEVEL、origin=OBSERVED、source_id=ESTAT。
- 継続期間・分類と公式基準接続の事実はQA manifestで説明する。実測と代理・推定を混在させない。
- 正規化CSV SHA-256：**18da76e236057e1f59b2e7b224bfb7b0f2186d5586139d14b26c701ba74c36cc**。
- 再現コマンド：node scripts/acquire-analytics-estat-cpi-raw.cjs ; python3 scripts/normalize-analytics-estat-cpi.py /ABSOLUTE/PRIVATE_DIR。ANALYTICS_PRIVATE_DATA_DIR環境変数はワークツリー外を指定。

## 利用権限（必ず用途別に判定）

[政府統計の総合窓口 e-Stat利用規約](https://www.e-stat.go.jp/terms-of-use) は数値データ、複製、送信、翻案の商用利用を一般的に認める。**出典の表示・加工表示・第三者権利の確認**が必要。公式の [2025年基準改定説明](https://www.stat.go.jp/data/cpi/2025/sokyu.html) に従う。

| 用途 | 判定 |
|---|---|
| 内部研究・商用処理 | 一般利用規約で原則可能、個別系列レビュー継続 |
| 一般サイトへのグラフ・数値表示 | 一般規約で可能な枠組み、**プロジェクト公開未承認** |
| 加工後結果の配信 | 一般規約で可能な枠組み、**プロジェクト公開未承認** |
| 生指数CSVの再配布 | 一般規約で可能な枠組み、**プロジェクト公開未承認** |
| FINOWA / Analytics の本番掲載 | **未承認、未実施** |

出典表示案：総務省統計局「2025年基準消費者物価指数」（e-Stat）より取得。K. Aito Analyticsが月次形式に加工。過去値は公式接続指数。統計局による本アプリの結果保証を意味しない。

## データ保管

公式Rawと生成したCSVは公開GitHubに**含めず**、非公開一時領域に保存したうえで暗号化Artifact化した。Artifactは短期間で失効するため安全な永続的非公開バックアップが別途必要。BLS時と同じRSA公開鍵を使ったため、秘密鍵が漏れた場合は両方の暗号文に影響する。

関連する取得状況台帳：research/analytics/acquisition_status.v0.1.json。元の2026-11-11決定アーカイブは上書きしない。
