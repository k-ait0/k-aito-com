# K. Aito Analytics｜v0.20 研究版

2026-11-13 JST。非公開・自己研究専用、公開／商用／実投資判断は未承認。

## 前版からの実作業

- 固定GitHubスナップショット（`datasets/s-and-p-500`、2026-11-01コミット `87a2284276f79d75041c71c8f6d9f2aa1c965e84`、blob `1c5f64a1cb8377fde80d339fbf0051e5e0e94566`）の**実測公開候補データ**を読み込み、1980-01〜2023-06、522か月の米株価格＋配当近似から、402/282/162の10年/20年/30年ローリング結果を算出。米国CPI調整も参照値として併記。
- 旧Shiller正本SHA `0cdb8a04...bc55d` と一致しないため、**この候補を旧正本または承認済みCore入力として認めない**。
- ローカル保全済み暗号化ZIPを実検査、**5/5アーカイブ合格**。必要に応じ、本人PCの秘密鍵が対応するRSA-3072であるか検査する（鍵・平文を出力しない）。現環境では本人秘密鍵も旧正本も未取得。
- 新規28テストを実装、Node.js 22：**603/603 PASS**（旧575件＋28件）。

## コマンド

```powershell
# 5暗号化ZIPの実物検査、秘密鍵不要
node scripts/check-analytics-private-readiness-v20.cjs --backup-zip 'C:\AnalyticsPrivate\K_Aito_Analytics_Encrypted_Evidence_Backup_20261112.zip'
# 秘密鍵も旧Shiller正本も所持するPCでは追加検査
node scripts/check-analytics-private-readiness-v20.cjs --backup-zip 'C:\AnalyticsPrivate\K_Aito_Analytics_Encrypted_Evidence_Backup_20261112.zip' --private-key 'C:\AnalyticsPrivate\keys\original_analytics_rsa_private.pem' --search-dir 'C:\AnalyticsPrivate'
# 公開元の固定スナップショットを一度だけ取得して集計、旧正本は変更しない
node scripts/analyze-analytics-shiller-candidate-v20.cjs --fetch-pinned-once
```

`--fetch-pinned-once` は明示した場合のみネットワーク接続、ハッシュ不一致なら停止。秘密鍵をChatGPTに提供する必要はありません。

## 残るゲート

1. 暗号化データ5件および本人のRSA秘密鍵の所有者管理下での永続保管（GitHub Actions 2026-11-18失効予定）。
2. 旧Shiller正本の一致取得（なければ独立ADRでソース見直し）・秘密鍵を所有するPC内で復号。
3. v0.18 → v0.11 → v0.12 → v0.10 の実原本QA（日本円・日本CPI、10年/20年）を別途完了する。
4. 公開権利と本番ゲート。`main`、DWZ PR #70、Fed DDP未承認ADRは変更なし。

詳細は `docs/ANALYTICS_PUBLIC_SHILLER_CANDIDATE_AND_READINESS_V0_20.md`。
