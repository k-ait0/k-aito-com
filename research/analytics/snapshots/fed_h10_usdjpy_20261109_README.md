# Fed H.10 USD/JPY：公式ページからの限定取得スナップショット

**取得記録日：2026-11-10。原発表：2026-11-09。**

- 提供元：Federal Reserve Board, H.10 Historical Rates for the Japanese Yen
- 原典： https://www.federalreserve.gov/releases/h10/hist/dat00_ja.htm
- 照合先： https://www.federalreserve.gov/releases/h10/current/
- データ利用根拠： https://www.federalreserve.gov/disclaimer.htm（原則public domain、個別の別記を除く）
- 観測値：**JPY / USD**（USDあたり円）。米国NYの正午付近の買い気配、為替市場全体の取引可能終値ではない。
- 対象：2026-09-30〜2026-11-06、**28行／うち欠損1行（2026-10-12はND）**。米国休日のNDは空白のまま保持。
- 取得方法：公式歴史テーブルで表示された原値を、手動で抜粋してCSV化。**機械的な全履歴ダウンロードではない**。
- QA：年月日一意、昇順、正数、欠損未補完、11月2〜6日の5値を公式のCurrent H.10と二重照合。
- ステータス：**EVIDENCE_SNAPSHOT_ONLY**。24年以上の完全時系列を取得したものではない。サイト公開Coreへ自動投入しない。
- 次工程：正規のAPI/ファイル取込で全履歴のSHA256・2000年以降の日付カバレッジ・欠損・月末値・日本休日との時差を検証。

原本が改訂された場合は旧スナップショットを上書きせず、v2として管理する。
