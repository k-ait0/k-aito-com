# K. Aito Analytics｜公開Shiller固定スナップショット予備分析＋秘密鍵照合前診断 v0.20

**2026-11-13 JST｜研究専用・公開・商用・運用判断未承認**

## 結論

1. v0.19までの旧Shiller正本 (`0cdb8a04bd14d104e53acbb982cf205eb4733371bb9140191b8c4b6e433bc55d`) は、現行作業環境・アクセス可能な添付・Libraryでは**実体を特定できていない**。公開版の復元2916候補でもバイト一致せず。**旧正本が復元した、あるいはそのSHAが誤っていたと断定しない。**
2. その代わり、明示的に隔離した**公開版Shiller系データの研究候補**については、GitHub `datasets/s-and-p-500` の確定コミット `87a2284276f79d75041c71c8f6d9f2aa1c965e84`、`data/data.csv` Git blob SHA-1 `1c5f64a1cb8377fde80d339fbf0051e5e0e94566` を実取得し、1980-01〜2023-06の522か月、概算USD月次リターン521か月を算出した。**既存の取得元ロック・旧正本・確定Coreには流し込まない。**
3. 手元の暗号化保全ZIP（5つのGitHub Actions Artifact）を v0.20診断CLIで実検査し、5件とも暗号文SHAと公開鍵フィンガープリントのピン一致を確認。**RSA秘密鍵の照合／平文復号／旧Shiller正本／日本円建て・日本CPIの実データQAは未完了。**

## 研究用実データによる集計値

月次米ドル名目リターン近似式：`R_t = P_t/P_(t-1) - 1 + D_t/(12*P_(t-1))`。
米国CPI参考実質ファクター：`(1 + R_t) / (US_CPI_t/US_CPI_(t-1))`。
毎月開始の**重複する**開始時点を全部使う。配当は年率値の1/12を近似的に追加し、手数料・税・売買スリッページを含めない。価格は月次平均であり、正確な月末投資可能価格でも公式S&P 500 TRでもない。

| 期間 | 開始月数 | USD名目の最小／中央値／最大（年率） | 名目マイナス開始月 | 米国CPI調整後の最小／中央値／最大（年率） | US CPI実質マイナス開始月 |
|---|---:|---:|---:|---:|---:|
| 10年 | 402 | -3.50% / 12.13% / 19.30% | 23 | -5.92% / 9.11% / 16.13% | 32 |
| 20年 | 282 | 5.07% / 9.13% / 17.95% | 0 | 2.93% / 6.61% / 13.61% | 0 |
| 30年 | 162 | 9.29% / 10.56% / 11.64% | 0 | 6.54% / 7.61% / 8.50% | 0 |

この結果は**旧Shiller正本で計算した結果ではない**。また、US CPI実質は米国消費者物価での基準であり、円換算・日本CPIの結果ではない。重複窓は独立観測ではないため、マイナス割合を将来損失確率とみなさない。旧系列の著作権・許諾やこのデータの市場指数ライセンスを変更しない。

原典: https://github.com/datasets/s-and-p-500/tree/87a2284276f79d75041c71c8f6d9f2aa1c965e84

## 再現用CLI（単独・非公開研究のみ）

```powershell
# 研究ブランチの Node.js 22 環境で実行。研究CSVはGitチェックアウト外へ配置
node scripts/analyze-analytics-shiller-candidate-v20.cjs `
  --source-file 'C:\AnalyticsPrivate\shiller_public_pinned.csv' `
  --out-dir 'C:\AnalyticsPrivate\candidate-report'

# 公開データの固定コミットを明示的に1回だけ取得し、結果の集計のみを表示
node scripts/analyze-analytics-shiller-candidate-v20.cjs --fetch-pinned-once
```

インターネット接続が必要なのは `--fetch-pinned-once` のみ。固定コミットの**Git blob SHA-1が違えば停止**、自動代替元への切り替え禁止。サイト用データセットや旧原本を上書きしない。出力は集計JSONのみ、CSV原値は出力・アップロードしない。公表・第三者配信の許諾根拠とは扱わない。

## 暗号化バックアップの一括診断（ネットワーク不要）

```powershell
# 最初は鍵もShiller正本も不要で、ZIP 5件の整合性だけを監査
node scripts/check-analytics-private-readiness-v20.cjs `
  --backup-zip 'C:\AnalyticsPrivate\K_Aito_Analytics_Encrypted_Evidence_Backup_20261112.zip'

# RSA秘密鍵を保持するPCで、対応関係だけを検査する（復号しない）
node scripts/check-analytics-private-readiness-v20.cjs `
  --backup-zip 'C:\AnalyticsPrivate\K_Aito_Analytics_Encrypted_Evidence_Backup_20261112.zip' `
  --private-key 'C:\AnalyticsPrivate\keys\original_analytics_rsa_private.pem' `
  --search-dir 'C:\AnalyticsPrivate'
```

`--private-key` は**非公開PC上のローカルファイルのみ**。公開RSA鍵（GitHub公式研究ブランチの 2026-11-11 PEM のSHA-256が `bfe78c5a3684d8272a94d778d4d1c49b0ea56c4a9a03fdc5de42bcb437281e28`）と、秘密鍵から導いたSPKI公開鍵のDERを比較。秘密鍵を出力・保存・アップロードしない。3072bit RSA以外拒否。鍵ファイルの安全な権限・シンボリックリンク拒否はv0.11規則を継承。パスや秘密情報は診断JSONに記録しない。秘密鍵にパスフレーズが付いている場合、現在のスクリプトは対話入力をせず「未読取／不一致」として停止する。

診断は**復号ではない**。合格後も、v0.18（暗号ZIP展開）→v0.11（本人の秘密鍵でローカル復号）→v0.12（6ファイル正本受入）→v0.10（実原本QA）の別工程が必要。データ入手済みなのは暗号文5件だけで、旧Shiller原本は含まれない。元ファイルの出版・商用・投資判断は未承認。

## 実際の検査証拠と残ブロッカー

- `check-analytics-private-readiness-v20.cjs --backup-zip <saved encrypted pack>` を実行。`encrypted_artifacts_verified:5`, `ciphertext_verified:true`, `status:BLOCKED_PRIVATE_INPUTS`, `key_pair_match_verified:false`, `legacy_shiller_exact_verified:false`。後者2つは**未提供・未照合**を意味し、不一致と断定しない。
- 今回の公開版Shiller候補による年率集計は、GitHub接続から固定ソースを実読込して計算。ローカルの単体テストは模擬CSVを用い、同一データの再取得/ハッシュ検証は所有PC側で再実行する必要がある。
- **最優先：** 保存パッケージ5件と対応秘密鍵を本人所有の永続ストレージへ別々に保管。GitHub Actions Artifactは2026-11-18（日本時間正午前後）で期限。会話内コピーは永続保管の証拠でない。
- **次：** 旧Shiller正本に一致するCSVの探索。見つからなければ、別の研究用ソースを採用する新ADRを別途審議し、正本レジストリを自動置換しない。
- `main`、本番、DWZ PR #70、歴史データ正本、Fed DDP候補の未承認状態には変更を加えない。
