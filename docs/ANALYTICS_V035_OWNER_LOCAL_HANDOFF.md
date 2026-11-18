# K. Aito Analytics v0.35｜所有者PCでの暗号化原本受入・CPI原本構造検証

2026-11-18 JST。研究ブランチ `analytics-owner-local-cpi-qa-v0-35-20261118`。v0.34の計算Core・画面を変更しない。**main・本番・DWZ Draft PR #70は触らない。**

## 目的と境界

GitHubに置くのは暗号化原本の**検証コードと合成テスト**だけ。GitHub上で秘密鍵を使うActionsや、平文原本・CSVをアップロードする経路を作らない。

今回追加：
- `scripts/prepare-analytics-owner-evidence-v035.py`：v0.33「暗号化原本6件 統合保全ZIP」の固定名前・サイズ・SHA256・ZIP CRC・暗号JSON形式を検査。**一切復号せず**5つの旧ZIPを所定名称へ整理し、v0.30のCPI暗号JSONを非公開ディレクトリへ取り出す。元の暗号化ZIPは保存する。新規ディレクトリのみ／上書き拒否／Git checkout内を拒否。
- `scripts/audit-analytics-cpi-reference-schema-v035.py`：**所有者PCで復号した後に限り** 2025年基準CPI参照CSVの取得時固定SHA256（`c5893ac45a0f124277d92c2ec286451be15ce0b7d5bbc84152e4f4226cedbce2`）・サイズ167310・28物理行・CSV行構造を検査。標準出力にはCPIの個別値・ヘッダを出さず、非公開のJSONに**列数等の構造情報のみ**を記録。総合指数の正規列は自動選択しない。
- `scripts/test-analytics-owner-evidence-v035.py`：合成アーカイブの成功・改ざん・欠落・重複・パス逸脱・上書き・シンボリックリンク・不正な内包JSON名など14件。
- `scripts/test-analytics-cpi-schema-v035.py`：CPIの合成CSVについて固定ハッシュ・行数・入力隔離・非公開レポート等8件。
- `.github/workflows/analytics-owner-local-v035.yml`：合成データだけでテスト。本人鍵・実データにはアクセスしない。

## GitHub Actionsでの検証

実行：https://github.com/k-ait0/k-aito-com/actions/runs/44225640753

- 既存Node.js Analyticsテスト：**920検出、917 PASS、3 SKIP、0 FAIL**。3 SKIPは旧v20で未受入の実原本関連。
- v0.35 合成6件ZIP受入：**14/14 PASS**
- v0.35 合成CPI CSV検査：**8/8 PASS**
- 実原本・所有者秘密鍵での復号：**NOT_RUN**。これをPASSと扱わない。
- 本番データ取得元、旧Shiller固定SHA、正規化済み原本6点の照合、円建て実測QAは未完了。

## 所有者Windows PCでの手順（秘密鍵を送信しない）

前提：Node.js 22、Python 3.11以降、Gitを使用できるWindows端末。暗号化統合保全ZIP `K_Aito_Analytics_Encrypted_Evidence_6items_v033_20261118.zip` を本人管理のDownloads等に置く。これはGitHubのコードリポジトリではなく、以前のチャットで作成した**暗号化された**6件入りバックアップ。平文データや秘密鍵はGitHub・チャット・Google Driveへアップロードしない。

まず研究ブランチをチェックアウト（既存のクローンを使う場合は `git fetch` → `git switch` でもよい）：

```powershell
git clone https://github.com/k-ait0/k-aito-com.git
cd k-aito-com
git fetch origin analytics-owner-local-cpi-qa-v0-35-20261118
git switch --track origin/analytics-owner-local-cpi-qa-v0-35-20261118
```

**ステップA（秘密鍵不要、暗号化原本の受入のみ）**

```powershell
New-Item -ItemType Directory -Force 'C:\AnalyticsPrivate' | Out-Null
python scripts/prepare-analytics-owner-evidence-v035.py `
  --bundle 'C:\Users\YOUR_USER\Downloads\K_Aito_Analytics_Encrypted_Evidence_6items_v033_20261118.zip' `
  --out-dir 'C:\AnalyticsPrivate\v035_encrypted'

node scripts/restore-analytics-private-evidence.cjs `
  --artifact-dir 'C:\AnalyticsPrivate\v035_encrypted\encrypted' --verify-only
```

`YOUR_USER` とZIPの実保存パスは本人PC側で置換。前者が `verified=6`、後者が `ENCRYPTED_EVIDENCE_VALIDATED_ONLY` であっても、**復号・データ受入はまだ完了していない**。

**ステップB（秘密鍵をすでに本人PCで保持している場合のみ）**

秘密鍵のパスは本人PCのコンソールにだけ指定する。ChatGPT・GitHub Issues・Actions secrets・Web入力欄には貼らない。元の秘密鍵が紛失している場合はSTOP。別鍵を生成して既存原本を復号できるとは限らない。

```powershell
node scripts/restore-analytics-private-evidence.cjs `
  --artifact-dir 'C:\AnalyticsPrivate\v035_encrypted\encrypted' `
  --private-key 'C:\PRIVATE_KEY_LOCATION\private_key.pem' `
  --out-dir 'C:\AnalyticsPrivate\v035_five_restored'

node scripts/restore-analytics-cpi-reference-v30.cjs `
  --encrypted-json 'C:\AnalyticsPrivate\v035_encrypted\encrypted\cpi-reference-v030.encrypted.json' `
  --private-key 'C:\PRIVATE_KEY_LOCATION\private_key.pem' `
  --out-dir 'C:\AnalyticsPrivate\v035_cpi_restored'
```

最初の処理は5つの旧原本（うちWorld BankおよびFed DDP候補は隔離）、2番目は2025基準CPI参考ファイル。**両方とも同じ所有者鍵が対応し、固定SHA/暗号認証を満たす場合だけ成功**。原本が認証済みと表示されても、正式な統計の列対応・過去公表時点の証明ではない。

**ステップC（復号が成功した場合だけ、列構造の機械検査）**

```powershell
python scripts/audit-analytics-cpi-reference-schema-v035.py `
  --csv 'C:\AnalyticsPrivate\v035_cpi_restored\zmi2025aa_OFFICIAL_CANDIDATE_c5893ac45a0f1242.csv' `
  --report 'C:\AnalyticsPrivate\v035_cpi_restored\CPI_SCHEMA_INVENTORY_V035.json'

node scripts/check-analytics-restored-evidence.cjs `
  --restore-dir 'C:\AnalyticsPrivate\v035_five_restored\analytics_private_evidence_v11'
```

旧5件の正本が復号できてもShiller原本やFed正規化CSVが追加で不足する可能性がある。チェックツールが不足を検出した場合、**勝手にダミーデータで補完しない**。

## 安全上の注意

- `C:\AnalyticsPrivate` はGitクローンの外に設置し、WindowsのBitLocker・NTFS権限等で保護する。絶対パス・新規出力のみ許可。
- `--private-key` の実際のパスは共有しなくてよい。秘密鍵PEM、復号済CSV、私人の資産情報、暗号の中身そのものをチャットにアップロードしない。
- 共有可能なのは**機密情報を含まない**検証ステータスとSHA256だけ。非公開ディレクトリのフルパスやキー位置を含むログは共有前に伏せる。
- 集計結果・価格・列ラベルのマッピングは、実ファイル検査後に本人だけが確認する。公表データ・第三者のデータ利用条件は別の許可ゲート。
- 2025基準の参照CSVは2026年11月13日時点の取得スナップショット。**過去の公表ビンテージとして扱わない**。Fed DDP研究候補を公式Fed採用済み系列として使わない。

## 完了条件（B02〜B08）

| ゲート | v0.35時点 |
|---|---|
| B02 暗号化6件の本人保全 | **一部確認**（Google Driveの6件＋SHAは確認。独立第2媒体は未確認） |
| B03 秘密鍵復号＋RSA/GCM＋原本SHA | **BLOCKED: owner local execution required** |
| B04 2025CPI正本CSVの列マッピング＋独立照合 | **NOT_COMPLETE**（ツール準備のみ） |
| B05 Shiller/Fed/eStat正本6ファイルの検証 | **BLOCKED** |
| B06 円建て実データ計算QA | **BLOCKED** |
| B07 画面 | **v0.34の自動19/19 PASS、所有者手動受入未完了** |
| B08 本番公開 | **NOT_APPROVED** |

**次に必要な人間作業：**本人PCで上記Aを実行し、可能ならB/Cで受入ステータスを得ること。実行が終わるまではB03/B04の合格を宣言しない。
