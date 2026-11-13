# K. Aito Analytics — 公式CPI公表記録の実資料照合 v0.27

記録日: 2026-11-13 JST。**非公開の個人研究用**。製品実装・計算入力への自動採用・再配布を承認する資料ではない。

## 今回、一次資料から検証した公表値

| 基準 | 調査年月 | 公表日 | 全国総合指数（季節調整前） | 当時の元資料 |
|---|---|---|---|---|
| 2015 | 2016-07 | 2016-08-26 | 99.6 | [e-Stat 2016/7月報](https://www.e-stat.go.jp/stat-search/file-download?fileKind=2&statInfId=000031441892) |
| 2020 | 2021-07 | 2021-08-20 | 99.7 | [e-Stat 2021/7月報](https://www.e-stat.go.jp/stat-search/file-download?fileKind=2&statInfId=000032111520)、[公表メタデータ](https://www.e-stat.go.jp/stat-search/files?cycle=1&layout=datalist&month=23070907&result_back=1&stat_infid=000032111520&tclass1=000001150149&tclass2val=0&toukei=00200573&tstat=000001150147&year=20210) |
| 2025 | 2026-07 | 2026-08-21 | 102.0 | [総務省の当時の公表概要を検索取得したページ](https://www.stat.go.jp/data/cpi/sokuhou/tsuki/index-z.html?mod=article_inline)、[e-Stat 2026/7月報のメタデータ](https://www.e-stat.go.jp/stat-search/files?cycle=1&layout=dataset&stat_infid=000040491312) |

2025年基準の `index-z.html` は月次更新されるページのため、**リンクが将来別の月の値を表示する可能性がある**。公開直後の保存スナップショットのハッシュがなければ、過去ページ原本を認証したとはいえない。

2015年基準の遡及公表は2016-08-12、初回月報は2016-08-26で、両日を混同しない。2020年基準も遡及初回公表日と2021-08-20月報は区別する。2025年基準も2026-08-07遡及と2026-08-21月報は区別する。詳細はv0.26の基準年契約参照。

## 実装と実行証拠

- `docs/ANALYTICS_CPI_OFFICIAL_MONTHLY_EVIDENCE_V0_27.json` は**公表の存在・値・公表日を一次資料から手作業で照合した少数サンプル台帳**。全月分のヴィンテージや連続した月次系列ではない。
- `lib/analytics/cpi-official-release-evidence-v027.cjs` は審査済み3件に限った厳格照合と、公表日より前には使用できない date-only 判定を実装。公表日の当日は時刻が未確定として一律使用しない。
- `scripts/check-analytics-cpi-evidence-v27.cjs` はネットワーク不要で台帳と `--asof` を照合。別途ユーザーPCでPDFを正当に取得している場合は `--archive-manifest` で**手元にあるPDFバイトと利用者が指定したSHA-256の一致だけ**を検査できる。PDF構造・値・配布元の真正性はこのチェックだけでは証明されない。
- `scripts/test-analytics-official-cpi-evidence-v027.cjs` は新規36テスト。v0.26を含む総計788/788 PASS (Node 22.16.0)。

```powershell
node scripts/check-analytics-cpi-evidence-v27.cjs --asof 2026-08-21
node scripts/check-analytics-cpi-evidence-v27.cjs --asof 2026-08-22
```

`--archive-manifest` はリポジトリ外にのみ配置。例：

```json
[
  {
    "publication_id": "JP_CPI_2015_BASE_2016_07_NATIONAL",
    "archive_path": "C:\\AnalyticsPrivate\\cpi-2016-07.pdf",
    "expected_sha256": "<実際に自分のPCで計算した64桁のSHA-256に置換>"
  }
]
```

利用者が指定した `expected_sha256` と対象PDFが一致しても、それだけでは取得先ドメイン・公表時点・指数値の真正性は証明できない。公式元資料からの独立値照合を次段階に残す。

## 優先度と不足資料

1. 各月の月報PDF/当時のExcelを合法的に入手・**その場でSHA固定**。既存の長期接続指数を2015年当時の公表版と偽らない。
2. 公表版ごとの全国総合指数を複数月分抜き出し、別資料で値を照合。今回の3サンプルだけではv0.26の計算に必要な連続値の構築は不可能。
3. 公式アーカイブへの来歴と取得日を記録したうえでv0.26の `cpi_vintage_snapshots` スキーマへ手動承認付き変換し、CPI再基準化時の重複月照合と先読み遮断の実値検証を行う。
4. 旧Shiller正本と暗号化済みFed/e-Stat原本の非公開復号・照合は独立したゲートとして継続。

ネットワークでPDFバイトを直接取得する操作は当環境のDNS制約により失敗。**SHA未取得の実資料を「ハッシュ検証済み」と表現しない。** `main`/本番/DWZ PR #70 は変更しない。
