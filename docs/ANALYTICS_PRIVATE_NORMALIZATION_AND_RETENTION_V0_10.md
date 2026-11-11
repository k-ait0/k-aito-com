# K. Aito Analytics — 私的市場データの二重正規化QA・暗号化保全 v0.10

**2026-11-12 JST | RESEARCH_ONLY_HOLD / 本番・商用配信未承認**

## 目的と現状

- v0.9で作成した6件の非公開原本/正規化CSVバイトSHA受入に、**元原本から月次値を独立に再構成する照合ゲート**を追加する。
- 別担当の `analytics-historical-v0-1-20261110` の取得元ロック・非公開原本・商用許諾判定は**変更しない**。
- GitHub Actionsの暗号化Artifactが2026年11月18日（UTC）に失効するため、**暗号文を復号しないで保管するためのワンショットツール**を追加する。
- Artifactの取得は初回内部エラーの後、再試行によって**5件すべて成功**。ZIP構造・暗号化Envelope・暗号文SHA-256の検証も5/5件PASS。受領情報は `docs/ANALYTICS_ENCRYPTED_ARTIFACT_RECEIPT_V0_10.json` に記録。**ただし会話内作業環境のコピーは、ユーザー管理下の永続バックアップ完了とは異なる。**

## 実装

### A. データ原本・正規化独立照合

- `lib/analytics/private-normalization-parity.cjs`
  - Fed固定HTML H.10の `DD-MMM-YY` 日次観測を独立抽出し、当月の最終有効日を採用、最後の暫定月を隔離する。
  - Fed正規化 `FED_H10_USDJPY_MONTH_END` と、月数・年月・月次円/米ドル水準を全件比較。
  - e-StatのCP932（Shift-JIS系）原本を別実装で読み直し、総合分類 `0001`、帰属家賃除外 `0163` の月次水準をCSVと全件比較。
  - 2つの公式原本の帰属家賃除外系列について、重複期間内の値を比較。推計・ゼロ補完・値の自動置換は一切なし。
  - 原本から正規化CSVを再生成する**照合**であって、公式ソースに再接続して再取得する処理ではない。
- `scripts/run-analytics-private-jpy-e2e-v10.cjs`
  - v0.9の6ファイルSHA照合を先に実行し、その後上記の独立正規化比較が通った場合にだけ非公開集計レポートを生成。
  - `source_registry.v0.2.json` は確認済みGit blob SHA `4868c921233540396d3e21fd77fa1edd70a10926` に固定。データ担当が正本を更新した場合はレビュー・再ピン後に再実行する。
  - 全ての元データと集計出力はGitワークツリー外の絶対パスを使用。レポートは0600、新規書込みのみ（上書き禁止）。
  - 結果の `raw_to_canonical_normalization_independently_recomputed:true` は、**実際に与えられたファイル間の一致**を表す。新たな原典取得・権利確認・投資可能性を証明しない。

### B. 暗号化Artifactの保全

- `lib/analytics/encrypted-artifact-audit.cjs`
  - Artifact ID、名前、期限を固定して照合。
  - 取得したZIPが `*_PRIVATE_ENCRYPTED.json` **1ファイルだけ**を含むことを確認し、ZIP構造・CRC・圧縮サイズと暗号化Envelopeを検査。
  - Envelope `KAITO_ANALYTICS_ENCRYPTED_RESEARCH_V1`、AES-256-GCM、RSA-OAEP-3072-SHA256、暗号文のSHA-256、IV・タグ・公開鍵ラップ長を確認。
  - 暗号文は**復号しない**。実データの原値を公開GitHubに書かない。
- `scripts/backup-analytics-encrypted-artifacts.cjs`
  - ユーザー所有環境で認証済み `gh` CLI を使用して5件の暗号化Artifact ZIPを取得。
  - Gitワークツリー外の私的ディレクトリへ元のZIPを0600で保存し、SHA-256と期限のローカル監査manifestを出力。
  - 任意1件でもエラーがあれば5件完了manifestを作らない。既存バックアップの上書きを拒否。
  - **この保存先自体は自動で永続化しない**。別の暗号化ストレージへ複製・保全する責任がある。

## 失効期限（GitHubの返答を検査）

| 暗号化データ | Artifact ID | 失効予定JST |
|---|---:|---|
| BLS米国CPI | 13824035258 | 2026-11-18 11:41:26 |
| e-Stat日本CPI | 13824913073 | 2026-11-18 12:18:08 |
| Fed H.10固定HTML | 13825223543 | 2026-11-18 12:21:56 |
| World Bank Pink Sheet | 13825636423 | 2026-11-18 12:21:56 |
| Fed DDP 1971候補（未承認） | 13826880503 | 2026-11-18 12:44:15 |

### 保存方法（ユーザー所有PC / 認証済みgh CLI）

```sh
# 研究ブランチをチェックアウトした環境で実行
# 先にGitHub CLIの認証を確認する（未認証なら gh auth login）
gh auth status

# 既存の研究用リポジトリの外を指定する（既存ファイルには上書きしない）
node scripts/backup-analytics-encrypted-artifacts.cjs --out-dir /ABSOLUTE/PRIVATE/ENCRYPTED_BACKUP_20261112

# 作成された manifest の5件と各ZIP SHA-256を確認し、所有する安全な永続ストレージへコピー
```

**重要：** RSA秘密鍵はユーザーが別に保持する必要がある。暗号文ZIPだけを保全しても、秘密鍵が失われていれば復号できない。秘密鍵をGitHub・本番サイト・チャットへ貼り付けない。上記のバックアップスクリプトは秘密鍵を要求・取得しない。外部接続を使ったCLI経路はユーザー所有PCでの実運転が**未検証**。今回通過したのは暗号化模擬ZIPを使ったローカルテスト。

## 実データ受入（原本が非公開フォルダーに揃った時のみ）

```sh
node scripts/run-analytics-private-jpy-e2e-v10.cjs \
 --private-dir /ABS/PRIVATE/DATA \
 --registry /ABS/HISTORICAL_BRANCH/research/analytics/source_registry.v0.2.json \
 --out-dir /ABS/PRIVATE/QA \
 --plan /ABS/PRIVATE/DATA/plan.json
```

入力契約はv0.9 `docs/ANALYTICS_PRIVATE_BYTE_QA_V0_9.md` と同一。Fed長期DDPはADR-0001未承認なので現行受入では拒否する。World Bank金スポットは投資可能なTRではないのでこの受入Coreへ混入させない。

## QA

```sh
node --test scripts/test-analytics-*.cjs
```

今回のローカル実行：**307/307 PASS**（v0.9 270件＋バックアップ検証18件＋原本正規化検証16件＋v10 CLI3件）。Node.js 22.16.0、模擬Fed HTML・模擬e-Stat CP932原本・模擬Shiller CSV・模擬暗号化ZIP。**実際の公式原本を使ったv10テストではない**。新規テストのうち、Source Registryの実データ実体ハッシュ照合と公式月次観測全件照合は保留。

## 残るブロッカー・次のゲート

1. GitHub Actionsの暗号化Artifact 5件の取得・暗号文整合性検証は完了。**ユーザー管理下の持続的な非公開ストレージへの保存確認は未完了**。会話内リンクから保全ZIPを取得し、安全な保存先へ退避する。
2. ユーザーの非公開環境で秘密鍵管理のもと復号、シャーディングされた原本と正規化ファイルをv0.9入力規約へ整理。ただし平文をGitに置かない。
3. v0.10の2段階QAで実原本のハッシュ・値・期間を検証する。実データの10年/20年完走結果と欠損数を監査する。固定Fedチャネルでは30年窓は0。
4. Shillerは研究用概算リターンでありSPDJI公式TRではない。12資産の投資可能TR、FX換算、税・リバランス費用・独立黄金試験は別途必要。
5. 本番サイト、DWZ PR #70、main、データ取得担当の正本は変更しない。UAT用Webページも後回し。
