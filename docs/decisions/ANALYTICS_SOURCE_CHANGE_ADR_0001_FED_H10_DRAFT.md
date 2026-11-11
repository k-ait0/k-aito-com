# ANALYTICS SOURCE_CHANGE_ADR-0001（**DRAFT・未承認**）
## 対象
FedのUSD/JPY取得チャネル拡張（**発行元変更なし：Federal Reserve Board**）。
現在の固定先 `https://www.federalreserve.gov/releases/h10/hist/dat00_ja.htm` は2000年以降を示す。Fed DDP公式パッケージは同じ通貨・H.10系列 `H10/H10/RXI_N.B.JA` を**1971-01-04**から保有することを確認。

## 候補
- 正規提供者：Board of Governors of the Federal Reserve System
- 正規入口：https://www.federalreserve.gov/datadownload/Choose.aspx?rel=H10
- 証拠：公式レビュー画面 https://www.federalreserve.gov/datadownload/Review.aspx?filetype=csv&label=include&lastObs=10&layout=seriescolumn&rel=H10&series=a6a0113179fdeb9c6fbcdc18575ec09c&type=package
- ZIP / SDMX形式の実際のダウンロードURL・リダイレクト条件・パーサ実装・DDP終了予定を**未調査**。無断でFREDに切り替えない。

## 判定
**PENDING**。発行元は同じでも配布チャネル変更が必要。原本SHA、利用条件、DDP存続、変換の一致、1971〜1999の値の検査、変更承認が揃うまで `source_registry.v0.2.json` の元の取得URLを変更しない。


---

## 2026-11-11：DDP公式ZIPの実取得・全件照合追補（依然DRAFT）

**技術検証：PASS。配布チャネルの正式採用：PENDING。サイト公開：未承認。**
研究用の候補系列として取得したものであり、現行の固定HTML取得先は変更していない。

### 取得した現物と出典
- Federal Reserve Board公式カタログ：https://www.federalreserve.gov/datadownload/Choose.aspx?rel=H10
- カタログ上の公式ZIPリンク：https://www.federalreserve.gov/datadownload/Output.aspx?rel=H10&filetype=zip
- 原本ZIP：2,087,377 bytes、SHA-256：1f9fd18709b09d082b29d01621f52672426eca108a4f74224fa8f190a5f801b2
- ZIP内：H10_data.xml（27,416,395 bytes）、H10_struct.xml、H10_H10.xsd、frb_common.xsd
- XML公開ヘッダー：Fed Board / H.10 / Prepared 2026-11-09T18:25:06
- 取り出す日次系列：H10/H10/RXI_N.B.JA（FREQ=9、CURRENCY=JPY、FX=JPY、UNIT_MULT=1）。
- 研究取得 [Actions #42954169753](https://github.com/k-ait0/k-aito-com/actions/runs/42954169753)、独立日次突合・月次正規化 [Actions #42954684913](https://github.com/k-ait0/k-aito-com/actions/runs/42954684913)：両方SUCCESS。

### 数値整合性と受渡の実態

| 項目 | 結果 |
|---|---|
| 日次期間 | 1971-01-04〜2026-11-06 |
| 原本日次行 | 14,570 |
| 有効値 / ND（非公表） | 13,999 / 571 |
| 元の固定HTMLと同一日付で突合 | 2000-01-03以降7,005行、**数値・NDとも不一致0** |
| 月次集約方法 | 月内の最終有効日次観測を採用。G.5月平均とは区別 |
| 確定月次候補 | 1971-01〜2026-10、670件、欠損・重複0 |
| 暫定月 | 2026-11を正式CSVから除外 |
| 30年開始可能月（実測月次の連続条件） | 310 |
| 原本候補から作成した私的共通CSVのSHA-256 | 4aeae87dd69b33936b5afc17a02ed85eea579fefca278b10dae4544c4a8ae6cf |
| 既存固定HTML原本のSHA-256 | a21e31f9d9c9e71f28a396a9a9d447b92347653e7e22446566ecaae05391f257 |

XMLの日次NDはOBS_STATUS=ND、OBS_VALUE=-9999。これは**為替レートに変換しない**。値を埋めず、月内の最終有効値で月次に集約する。XML内の別シリーズRXI_N.M.JA（公式G.5月平均）を、既存の月末値と置換しない。

### 変更審査と権利ゲート

- [Fed Board免責事項](https://www.federalreserve.gov/disclaimer.htm)：Fed Board作成のサイト資料は原則パブリックドメイン、出典表示が必要。第三者例外の確認を継続。内部商用計算・サイト表示・ユーザーへの加工結果配信・原CSV再配布・本番公開は別判定。
- [Fed Board公式移行情報](https://www.federalreserve.gov/data/data-download-fred-information.htm)：2026年11月9日の週からDDPの一部機能が削除され、公式XMLデータはリリースページに継続掲載予定。ZIPが存続するか継続確認が必要。
- 今回はFed Boardからの直接配布であり、FRED経由の別提供元への無断切替ではない。FREDへの自動フォールバックは禁止。
- 1971年起点は60年目標（1966年頃）を厳密には満たさない。価格を仮想で補完しない。
- サービス利用権利と運用上の信頼性・継続取得を別途審査する。

### 未了事項

- [x] 公式ZIPリンク、取得・原本SHA、日次系列IDとデータ構造の検証
- [x] 元固定HTML 7,005日との全件照合
- [x] 1971-01〜2026-10の月次欠損・重複と集計方法の検証
- [ ] **SOURCE_CHANGE_ADRの正式採用承認**。取得元台帳の現在のURLは引き続き不変
- [ ] 一般サイト表示・派生結果配信・CSV再配布・本番それぞれの承認
- [ ] DDP終了後の公式XML経路運用・リリース更新時の差分検査手順の承認

**判定：技術検証合格・変更未承認。数値QA合格を商用公開承認と見なさない。**
