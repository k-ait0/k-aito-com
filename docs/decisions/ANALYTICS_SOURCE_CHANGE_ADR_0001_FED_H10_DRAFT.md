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
