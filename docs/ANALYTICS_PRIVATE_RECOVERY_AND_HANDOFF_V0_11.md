# K. Aito Analytics — 非公開原本復元・受入インベントリ v0.11

**2026-11-12 JST | RESEARCH_ONLY_HOLD | 本番・商用配信未承認**

## 実装したファイル

- lib/analytics/private-evidence-restore.cjs：v0.10の5件の暗号化Artifactを固定ZIP SHA-256とRSA公開鍵指紋で照合。RSA-OAEP-3072 / AES-256-GCMの復号は所有者PCの秘密鍵でのみ実行。
- scripts/restore-analytics-private-evidence.cjs：秘密鍵不要のverify-only検証、または鍵付きの非公開ローカル復元。
- lib/analytics/restored-evidence-inventory.cjs：復号後の原本とv0.10受入6ファイルの不足・ハッシュ不一致を判定。
- scripts/check-analytics-restored-evidence.cjs：受入準備状況を表示。不足時は終了コード2。
- scripts/test-analytics-private-evidence-restore.cjs：RSA/AES-GCM、改ざん、TARパストラバーサル、権限、上書き禁止等33件。
- scripts/test-analytics-restored-evidence-inventory.cjs：欠損・不正原本・重複・シンボリックリンクなど10件。

## 検証結果

Node.js 22 による全回帰テスト **350/350 PASS**（従来307件＋新規43件）。実際に保存した暗号化Artifact ZIP **5/5件は固定ZIP SHA-256と暗号文整合性を再検証済み**。RSA秘密鍵を用いた復号は**模擬鍵・模擬データのみ**で検証。本当の実原本の復号・統合市場数値バックテストはまだ実行していない。

## ローカルPCでの実行

最初に暗号化保全パッケージを所有者の安全な非公開ストレージへ保存・展開する。その中の5つの encrypted-artifact-<id>.zip 自体は再展開せず、同一の非公開ディレクトリに残す。

1. 鍵不要の検査： node scripts/restore-analytics-private-evidence.cjs --artifact-dir /ABS/PRIVATE/ENCRYPTED --verify-only
2. 秘密鍵は所有者PC内だけで利用： node scripts/restore-analytics-private-evidence.cjs --artifact-dir /ABS/PRIVATE/ENCRYPTED --private-key /ABS/PRIVATE/private_key.pem --out-dir /ABS/PRIVATE/RESTORE
3. 復元後： node scripts/check-analytics-restored-evidence.cjs --restore-dir /ABS/PRIVATE/RESTORE/analytics_private_evidence_v11

秘密鍵をチャット・GitHub・本番サイトへ送信してはいけない。Unix系では秘密鍵0600を要求する。出力は既存ファイル上書きを拒否し、非公開ディレクトリを0700、復号ファイルを0600で管理。TARは全件事前検証し、リンク・特殊ファイル・危険なパス・過大なファイルを拒否する。WindowsではNTFS ACLや暗号化ドライブによる保護も必要。

## 復号後も不足する可能性が高い正本

- v0.10が要求する raw-shiller.csv（旧Shillerの研究用522水準）は今回の5件のArtifactに**入っていない**。別保管の旧原本が必要。
- v0.10が要求する normalized-fed-h10.csv は、Fedの原取得ワークフローに生成・同梱処理がない。別途、正本SHAを満たす正規化CSVの作成・検査が必要。
- e-Stat原本2件、正規化日本CPI、Fed H10固定HTMLは取得ワークフローの保全対象。復号前には個別実値・全数比較を確認できない。
- World Bank現物系列とFed DDP 1971年候補は研究隔離。投資可能トータルリターンとみなさず、ADR-0001未承認のDDPを元のFed H10に勝手に切り替えない。

## 保管・公開の境界

GitHub Actionsの元Artifact5件は2026年11月18日（JST）頃に失効する。会話内の暗号化ZIPコピーの存在は、ユーザー管理下の永続バックアップを意味しない。復号用秘密鍵も別途保存が必要。秘密鍵を失うと既存暗号文を復号できない。

固定Fed 2000年以降の円建てShiller研究で30年の完走ウィンドウは理論上0。欠損値を補完せず、Shiller概算TRを公式S&P500 TRと表示せず、分析結果の割合を将来成功確率と呼ばない。

**main・本番Xserver・DWZ PR #70・データ取得正本は変更しない。確認用ページ追加は保留。**
