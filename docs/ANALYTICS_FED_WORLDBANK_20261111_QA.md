# K. Aito Analytics｜Fed H.10・World Bank Pink Sheet 追加取得QA（2026-11-11）

**研究専用。RAW_ACQUIRED_PRIVATE。Fed月次・World Bank Goldは数値QA済み。サイト公開・第三者再配布は未承認。**

## 1. 公式取得と再現性

GitHub Actions実行：https://github.com/k-ait0/k-aito-com/actions/runs/42952254081 （Fed / World Bank両ジョブSUCCESS）。

| 系列／原簿 | ソース固定URL | 原本SHA-256 | 原本サイズ |
|---|---|---|---:|
| Fed H.10 円相場履歴 | https://www.federalreserve.gov/releases/h10/hist/dat00_ja.htm | a21e31f9d9c9e71f28a396a9a9d447b92347653e7e22446566ecaae05391f257 | 1,133,797 B |
| World Bank 月次商品原簿 | https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx | 3c8d9d8dbb48342fdbf24777c39a8ce8964cc2fd0958f72f6779e6e4ad99cde2 | 587,760 B |

- 変更元承認不要：上記両方とも source_registry.v0.2.json で**以前から固定**された配布元／URLである。
- 公開GitHubには原CSV・HTML・XLSX・正規化値を登録しない。暗号化されたワークフローArtifactとユーザーに渡す私的ファイルのみ保持。
- Fed Artifact ID 13825223543 / World Bank Artifact ID 13825636423。いずれも2026-11-18頃に失効するため別途私的永続バックアップが必要。

## 2. Fed H.10 USD/JPY 実取得の厳密な範囲

| 判定項目 | 実測値 |
|---|---|
| 日次原表 | 2000-01-03〜2026-11-06、7,005行 |
| 正常なレート日 | 6,732行 |
| ND（未公表） | 273行。レート0や価格0に置換しない |
| 日次日付重複 | 0 |
| 月末最終有効観測方式の月次 | 2000-01〜2026-11、323月 |
| 確定月次 | 2000-01〜2026-10、322月 |
| 当月暫定として別管理 | 2026-11、2026-11-06観測 |
| 月次重複／欠損 | 0 / 0 |
| 360本の月次収益を形成する30年完走開始月 | 0 |
| 方向・通貨 | JPY per USD、非TR、為替レート水準 |
| 私的共通CSV SHA-256（確定322月のみ） | da0f6244ab22c86d54a569f1288e82780d5d14d8c92f3f246b53f63126f880cd |

**1971年の長期シリーズではない。** 公式Fed DDPに1971-01開始の H10/H10/RXI_N.B.JA が存在しても、2000年からの固定HTML URLはその以前を提供しない。1971〜1999の拡張は docs/decisions/ANALYTICS_SOURCE_CHANGE_ADR_0001_FED_H10_DRAFT.md が承認されるまで台帳上「未取得」。FRED等へ自動切替しない。

## 3. World Bank Pink Sheetと金月次現物

- 公式XLSX 587,760 bytes。原簿には Monthly Prices、Monthly Indices、Description、Index Weights、Mismatch Details の5シートが存在する。
- Monthly Pricesシートの日付は1960M01〜2026M10、**802行の月次水準**。Gold列（単位 USD per troy ounce）は全802月、正の実観測数値がある。
- Gold：1960-01〜2026-10 **802か月**。欠損0、重複0、30年連続月次変化を計算できる開始月 **442**。
- 異常変化の自動除去なし。前月比絶対値20%超の**レビュー対象3件**：1974-01約20.56%、1980-01約48.35%、1982-09約20.05%。異常と断定せず原表値を保持する。
- Gold正規化CSV SHA-256（私的研究用）：937644f307880a639d4b6298e46763146871db03a9650ae7cf2def21831781a1
- Goldは現物スポット価格。取引可能な先物運用戦略の総収益率や金ETFの配当込みリターンではない。投資用TRと混ぜない。

### 時系列定義の変更と権利審査ゲート

World Bank XLSXの Description シートはGold系列について、2025年6月以降は「Gold, spot average of daily rates」、それ以前は「(UK), 99.5% fine, London afternoon fixing, average of daily rates」と説明している。複数の第三者データ提供元（Bloomberg、Kitco、IMF/IFS、LBMA等）の名前が付いている。**出典注記の完全性、改定履歴、第三者の二次配信許諾を別途確認**。

- World Bankの通常のデータ利用条件は CC BY 4.0を基本とするが、第三者由来の一部データには別途制限があり得る：https://data.worldbank.org/summary-terms-of-use
- 非公開で取得・研究することと、公開サイトへの実データ送信・グラフ表示・結果配信・生CSV再配布の許諾は分ける。**当プロジェクトのサイト公開承認は0**のまま。
- Monthly Indicesは Monthly Pricesと最新月や観測範囲が一致するとは限らない。種別を混ぜない。
- 金以外のすべてのコモディティ列について、変化した商品定義や現物／先物ベンチマーク種別があり、単純に「同一の現物スポットTR」と判定できない。原本だけ取得済み、列ごとの個別QA・権利レビューは未了。
- Mismatch Detailsは原簿の改定記録を含むため、将来のデータ更新時にバージョン別SHA比較を行う。

## 4. Analyticsへの非公開受渡

共通定義 docs/ANALYTICS_CANONICAL_MONTHLY_OBSERVATION_V0_1.md に準拠し、観測月と元原本のSHAを行単位で保持。

Fed：FED_H10_USDJPY_MONTH_END（322行、2026-11暫定月は除外）、currency=JPY、unit=JPY_PER_USD、series_kind=FX_RATE、origin=OBSERVED。

Gold：WORLD_BANK_PINK_GOLD_USD_TROY_OZ（802行）、currency=USD、unit=USD_PER_TROY_OZ、series_kind=COMMODITY_SPOT、origin=OBSERVED。商品現物価格は保有商品のTRではない。

**FINOWA・Analyticsの画面／計算エンジン／本番環境には一切接続せず。** サイト配信権の審査も未承認。

## 5. 次の作業

1. Fed H.10 1971以降の取得チャネルのADRを公式ダウンロード実態・原本QA・権利条件付きで審査。承認前に元URLを変更しない。
2. World Bank金の第三者ソースの利用許諾と2025-06系列変更の影響を審査。権利が未確定なら私的研究のみ。
3. World Bank他商品列の開始月・観測欠損・先物/スポット・出典・権利を一列ずつ分類。
4. 旧Shiller 522月研究用拡張と株式・債券・REIT等の指数TRライセンス検討。
5. 短期GitHub Actions暗号化Artifactを恒久の非公開領域にバックアップ。秘密鍵はGitHubに置かない。
NaN