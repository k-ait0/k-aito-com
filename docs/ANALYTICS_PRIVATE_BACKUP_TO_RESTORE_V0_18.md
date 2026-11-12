# K. Aito Analytics — v0.18 暗号化保全ZIP → ローカル復号受入の接続

2026-11-12 JST | **PRIVATE RESEARCH ONLY / 公開・商用配信未承認**

## 実際に改善した点

v0.10で取得した5件の暗号化GitHub Actions Artifactを、以前作成した単一保全ZIPから**Node.jsだけで安全に展開**してv0.11復元処理に渡せるようにした。従来の手動ZIP展開を不要にし、取り違えと不明なファイルの持ち込みを防止する。通信・秘密鍵・平文の読み取りはしない。

- `lib/analytics/private-backup-bridge.cjs`: ZIP中央ディレクトリ、CRC、deflate/store、正確に7ファイルのホワイトリスト、危険なパスや重複、改変を検査する。5件の暗号化ZIPについて、取得済み受領票の固定SHA-256、内部暗号文SHA-256およびRSA公開鍵のフィンガープリントを検査する。
- `scripts/stage-analytics-private-backup-v18.cjs`: `--inspect-only` で無書込検査、`--out-dir` で5つの暗号化ZIPを個別ファイルとして安全に配置（0700フォルダー、0600ファイル、上書き拒否）。
- `scripts/test-analytics-private-backup-bridge-v18.cjs`: 新規16件の契約テスト。実際の保全ZIPは公開GitHubへ登録せず、**ローカル実ファイルで5/5件PASS**を追加確認した。

### Windowsローカル環境での実行例

以下はNode.js 22をインストールしたWindows PowerShell環境における例。まず、v0.18研究ブランチをローカルにチェックアウトし、**暗号化保全ZIPをPC自身の安全な場所へ保存**する。コマンドのドライブやパスは各PCに合わせる。

```powershell
# 1. 秘密鍵なしの事前検査：復号せず、書込もしない
node scripts/stage-analytics-private-backup-v18.cjs `
  --backup-zip "C:\AnalyticsPrivate\K_Aito_Analytics_Encrypted_Evidence_Backup_20261112.zip" `
  --inspect-only

# 2. 暗号化ZIPを復元ツールが認識できる5ファイルに展開
node scripts/stage-analytics-private-backup-v18.cjs `
  --backup-zip "C:\AnalyticsPrivate\K_Aito_Analytics_Encrypted_Evidence_Backup_20261112.zip" `
  --out-dir "C:\AnalyticsPrivate\stage"

# 3. 以下の復号処理は実際の所有者の秘密鍵ファイルがある場合のみ行う
#    秘密鍵の中身をチャット、GitHub、コマンド引数に直接入力しない。パスだけ指定。
node scripts/restore-analytics-private-evidence.cjs `
  --artifact-dir "C:\AnalyticsPrivate\stage\analytics_encrypted_artifacts_v18" `
  --private-key "C:\AnalyticsPrivate\keys\original_analytics_rsa_private.pem" `
  --out-dir "C:\AnalyticsPrivate\restored"

# 4. 復号後、必要な元原本が揃っているか確認するだけ（不足時は終了コード2）
node scripts/prepare-analytics-private-handoff-v12.cjs `
  --restore-dir "C:\AnalyticsPrivate\restored\analytics_private_evidence_v11" `
  --inspect-only
```

**注：** 作業・出力パスは必ずGitチェックアウト外にする。RSA秘密鍵が見つからなければ復号はできない。暗号化ZIPのみで代替鍵を生成することは不可能。実データの復号・市場計算はこのチャットでは行っていない。

### 受入に残る実際の制約

- 暗号化Artifact 5件には**旧Shiller原本がない**。別途、取得担当の原本（正本SHA `0cdb8a04bd14d104e53acbb982cf205eb4733371bb9140191b8c4b6e433bc55d`）が必要。
- 元のFed月次データは、固定SHAに一致する共通CSVの再構成／正本照合が必要。適当に再計算したCSVで代替して合格させない。
- v0.12の検証済み正本台帳と、実際の来歴に基づくmanifestが必要。`retrieved_at`などを推測で記入しない。
- Fedの1971年～長期DDP系列は、既存のソース変更ADRが未承認であるため、固定H.10チャネルの計算に自動採用しない。
- Shillerは価格＋年率化配当の**概算**リターンであり、公式S&P 500配当込み指数TRではない。
- 30年間の円建て投資リターン窓は、現行固定ソースでは0件。原本が揃っても歴史不足で30年は生成できない。
- 公開サイト/FINOWAでの配信・二次配布権は未承認。研究ブランチ以外は変更しない。

### QA証跡

- 前版v0.17 Node自動テスト: 537/537 PASS。
- v0.18新規テスト: 16/16 PASS。
- **合計553/553 PASS** (Node 22.16.0、2026-11-12)。
- 前回取得した暗号化保全ZIPの実ファイルをNode.js v0.18で展開し、v0.11 `checkAllEncrypted`に渡した結果: **5/5件PASS**。
- 秘密鍵での復号、実原本との正規化照合、実市場ローリングバックテスト: **未実施**。

元の`main`・Xserver本番・DWZ Draft PR #70、市場データ正本は変更しない。
